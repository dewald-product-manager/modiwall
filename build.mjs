/* Zero-dependency static build: src/ -> public/.   Run: node build.mjs
   Pages are plain HTML with a JSON header comment and a few {{tags}}:
     {{> partial}}                 include src/partials/partial.html
     {{img name | sizes | class}}  responsive <picture> from images.manifest.json
     {{eager name | sizes | class}} same, but high priority (above the fold)
     {{js:expression}}             helper output, see `helpers` below            */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const SITE = 'https://www.modiwall.com';
const OUT = 'public';
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); // same hashes on Windows and elsewhere
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const images = JSON.parse(read('src/images.manifest.json'));

mkdirSync(OUT, { recursive: true });
cpSync('src/static', OUT, { recursive: true });

/* ---- css + js ---- */
const minCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/:\s+/g, ':').replace(/;}/g, '}').trim();
const css = minCss(['base', 'layout', 'home', 'pages', 'lux', 'lux2', 'lux3', 'lux4'].map((f) => `src/css/${f}.css`).filter(existsSync).map(read).join('\n'));
mkdirSync(`${OUT}/css`, { recursive: true });
mkdirSync(`${OUT}/js`, { recursive: true });
writeFileSync(`${OUT}/css/site.css`, css);
const minJs = (s) => s.replace(/^\s*\/\*[\s\S]*?\*\/\s*$/gm, '').replace(/^\s*\/\/.*$/gm, '').replace(/^[ \t]+/gm, '').replace(/\n{2,}/g, '\n');
const ver = { 'css/site.css': hash(css) };
// A script's version is the hash of its output, which names the versions of what it imports,
// so a change to wall.js also renews main.js and no cached copy keeps loading the old one.
const built = new Set();
function buildJs(f, chain = []) {
  if (built.has(f)) return;
  if (chain.includes(f)) throw new Error(`Import cycle: ${[...chain, f].join(' > ')}`);
  const body = minJs(read(`src/js/${f}`)).replace(/(['"])\.\/([a-z-]+\.js)\1/g, (_, q, n) => {
    buildJs(n, [...chain, f]);
    return `${q}./${n}?v=${ver[`js/${n}`]}${q}`;
  });
  ver[`js/${f}`] = hash(body);
  writeFileSync(`${OUT}/js/${f}`, body);
  built.add(f);
}
readdirSync('src/js').filter((f) => f.endsWith('.js')).forEach((f) => buildJs(f));

/* ---- helpers ---- */
function picture(name, sizes = '100vw', cls = '', eager = false) {
  const im = images[name];
  if (!im) throw new Error(`Unknown image: ${name}`);
  const fb = im.widths.includes(im.fallback) ? im.fallback : im.widths[0];
  const h = Math.round((im.h * fb) / im.w);
  const set = im.widths.map((w) => `/img/${name}-${w}.avif ${w}w`).join(', ');
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<picture${cls ? ` class="${cls}"` : ''}><source type="image/avif" srcset="${set}" sizes="${sizes}"><img src="/img/${name}-${fb}.jpg" width="${fb}" height="${h}" alt="${esc(im.alt)}" ${load} decoding="async"></picture>`;
}
const full = (name) => { const im = images[name]; return `/img/${name}-${im.widths.at(-1)}.avif`; };

// a tile's real width (see .tiles in layout.css), so small tiles fetch small files and wide ones stay sharp
const tileSizes = (span) => {
  const cols = Number(span.match(/\bw(\d+)\b/)?.[1] ?? 4) / 12;
  return `(min-width:1100px) min(${(cols * 100).toFixed(1)}vw, ${(cols * 90).toFixed(1)}rem), (min-width:561px) ${/\bwide\b/.test(span) ? 100 : 50}vw, 100vw`;
};
const gallery = (items) => items.map(([name, place, title, span = '']) => `<li class="tile ${span}" data-place="${place}"><a href="${full(name)}" data-lightbox data-w="${images[name].w}" data-h="${images[name].h}">${picture(name, tileSizes(span))}<span class="tile__cap">${title}</span></a></li>`).join('\n');

/* ---- journal: pages named journal-*.html carry a "post" in their header ---- */
const metaOf = (raw) => JSON.parse(raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/)[1]);
const words = (raw) => raw.replace(/^<!--[\s\S]*?-->/, '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const posts = readdirSync('src/pages').filter((f) => /^journal-.+\.html$/.test(f)).map((f) => {
  const raw = read(`src/pages/${f}`);
  const m = metaOf(raw);
  return { slug: f.slice(8, -5), url: `/${f}`, words: words(raw), minutes: Math.max(1, Math.ceil(words(raw) / 220)), description: m.description, ...m.post };
});
const postOf = Object.fromEntries(posts.map((p) => [p.slug, p]));
const longDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const storyCard = (p, sizes, big = false) => `<a class="story${big ? ' story--lead' : ''}" href="${p.url}" data-cursor="Read"><span class="story__p">${picture(p.image, sizes)}</span><span class="story__t"><small>${p.topic}, ${p.minutes} min read</small><b>${p.head}</b><span>${p.stand}</span></span></a>`;

// the journal in chapters: what each is called, what it is for, and its stories in order
const CHAPTERS = [
  ['rooms', 'The rooms', 'Where a wall belongs, and what it does there.', ['feature-wall-ideas', 'living-wall-bathroom', 'patio-vertical-garden', 'pool-and-boundary-wall-garden']],
  ['plants', 'Plants', 'What grows, where, and in which light.', ['best-indoor-living-wall-plants', 'best-outdoor-living-wall-plants', 'indoor-living-wall-light']],
  ['keeping', 'Living with one', 'Water, power, insects and the years.', ['how-to-water-a-living-wall', 'living-wall-lifespan', 'why-living-walls-fail', 'living-wall-load-shedding', 'living-wall-mosquitoes']],
  ['before', 'Before you build', 'What to ask, and what to draw first.', ['living-wall-cost-south-africa', 'living-wall-damp', 'living-wall-weight', 'living-or-artificial-wall', 'living-wall-architects-brief']],
  ['evidence', 'The evidence', 'What has been measured, and what has been won.', ['vertical-garden-health-benefits', 'do-plants-clean-the-air', 'two-gold-walls']],
];
const ORDER = CHAPTERS.flatMap((c) => c[3]);
posts.sort((a, c) => ORDER.indexOf(a.slug) - ORDER.indexOf(c.slug));
posts.forEach((p) => { if (!ORDER.includes(p.slug)) throw new Error(`Story in no chapter: ${p.slug}`); });
// the first words of an article, as plain text
const opening = (slug) => {
  const raw = read(`src/pages/journal-${slug}.html`).replace(/^<!--[\s\S]*?-->/, '');
  const paras = [...raw.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 60);
  return paras.slice(0, 6).join(' ').split(' ').slice(0, 210).join(' ');
};
const helpers = {
  // the stories in their chapters, each carrying what the book sets on its pages
  index: () => CHAPTERS.map(([id, name, sub, slugs]) => `<section class="jg" id="${id}" aria-labelledby="${id}-h"><div class="jg__h"><h3 id="${id}-h">${name}</h3><p>${sub}</p>${id === 'plants' ? `<a class="link" href="/plants.html">Our plants</a><div class="jg__sp" aria-hidden="true">${['marble', 'bulb', 'fern', 'setc'].map((k) => `<img src="/img/plants/${k}.avif" width="720" height="720" alt="" loading="lazy" decoding="async">`).join('')}</div>` : ''}</div><ul class="jg__l">${slugs.map((slug, n) => {
    const p = postOf[slug];
    const im = images[p.image];
    const at = (w) => `/img/${p.image}-${im.widths.includes(w) ? w : im.widths.at(-1)}.avif`;
    return `<li${n ? '' : ' class="jg__one"'}><a class="jc" href="${p.url}" data-story data-cursor="Read" data-group="${id}" data-group-name="${name}" data-group-say="${sub}" data-head="${esc(p.head)}" data-stand="${esc(p.stand)}" data-alt="${esc(im.alt)}" data-minutes="${p.minutes}" data-img="${at(1280)}" data-open="${esc(opening(slug))}"><span class="jc__p">${picture(p.image, n ? '(min-width:900px) 32vw, 100vw' : '(min-width:900px) 66vw, 100vw')}</span><span class="jc__t"><b>${p.head}</b><span>${p.stand}</span><small>${p.minutes} minute read</small></span></a></li>`;
  }).join('')}</ul></section>`).join('\n'),
  chapters: () => CHAPTERS.map(([id, name]) => `<li><a href="#${id}">${name}</a></li>`).join(''),
  // who lives with a wall, one name to each clearing in the leaves
  names: () => helpers.clientList.map(([f, name, h, w, hh, note]) => `<li class="nm" data-name><img src="/img/clients/${f}.svg" width="${w}" height="${hh}" alt="${name}" style-h="${h}" class="nm--${f}" decoding="async">${note ? `<p>${note}</p>` : ''}</li>`).join('\n').replace(/ style-h="[^"]*"/g, ''),
  nameMarks: () => helpers.clientList.map(([, name]) => `<li><button type="button" data-mark-at>${name}</button></li>`).join(''),
  clientList: [['netcare', 'Netcare', 4.9, 600, 479, 'An atrium at Pinehaven Hospital that lives on daylight alone. SALI gold, 2016.'], ['sun-city', 'Sun City', 3.9, 600, 237, 'A steel tree under a skylight, clad in planted panels. SALI gold, 2017.'], ['hollard', 'Hollard', 2.9, 600, 159], ['virgin-active', 'Virgin Active', 4.2, 600, 286], ['old-mutual', 'Old Mutual', 2.35, 600, 132], ['bidvest', 'Bidvest TopTurf', 4.1, 600, 313, 'Built both of our gold award walls with us.'], ['nedbank-golf', 'Nedbank Golf Challenge', 5.6, 600, 600], ['torrecid', 'Torrecid', 2.9, 600, 176]],
  stories: (slugs) => `<ul class="stories stories--3">${slugs.map((x) => `<li>${storyCard(postOf[x], '(min-width:900px) 30vw, 100vw')}</li>`).join('')}</ul>`,
  gallery,
  // optical heights, so every client carries the same weight on the page
  clients: () => [['netcare', 'Netcare', 4.9, 600, 479], ['hollard', 'Hollard', 2.9, 600, 159], ['sun-city', 'Sun City', 3.9, 600, 237], ['virgin-active', 'Virgin Active', 4.2, 600, 286], ['old-mutual', 'Old Mutual', 2.35, 600, 132], ['bidvest', 'Bidvest TopTurf', 4.1, 600, 313], ['nedbank-golf', 'Nedbank Golf Challenge', 5.6, 600, 600], ['torrecid', 'Torrecid', 2.9, 600, 176]]
    .map(([f, name, h, w, hh]) => `<li class="cl cl--${f}"><img src="/img/clients/${f}.svg" width="${w}" height="${hh}" alt="${name}" loading="lazy" decoding="async"></li>`).join(''),
  // every wall: hung in the corridor by corridor.js, and laid out on the page below it
  // every wall on the page; those marked 'page' are not also hung in the corridor
  cards: (items) => items.map(([name, place, title, only]) => {
    const im = images[name];
    const at = (w) => `/img/${name}-${im.widths.includes(w) ? w : im.widths.at(-1)}.avif`;
    const where = { home: 'Private home', health: 'Healthcare', work: 'Office', hospitality: 'Hospitality and retail' }[place];
    return `<li data-place="${place}"><a href="${full(name)}" data-lightbox${only ? '' : ' data-frame'} data-cursor="View" data-title="${esc(title)}" data-where="${where}" data-ratio="${(im.w / im.h).toFixed(3)}" data-hang="${at(800)}" data-hang-l="${at(1280)}"><span class="cards__p">${picture(name, '(min-width:1000px) 30vw, (min-width:560px) 46vw, 92vw')}</span><span class="tile__cap2"><b>${title}</b><span>${where}</span></span></a></li>`;
  }).join('\n'),
  faq: (list) => list.map(([q, a]) => `<details class="faq"><summary>${q}</summary><div class="faq__a"><div><p>${a}</p></div></div></details>`).join('\n'),
};

const ORG = {
  '@type': 'HomeAndConstructionBusiness', '@id': `${SITE}/#business`, name: 'Modiwall Vertical Gardens', url: `${SITE}/`,
  logo: `${SITE}/img/icon-512.png`, image: `${SITE}/img/og.jpg`, telephone: '+27768740299', email: 'info@modiwall.com', foundingDate: '2012',
  description: 'Modiwall designs, makes, installs and maintains living vertical gardens and artificial green walls across South Africa.',
  address: { '@type': 'PostalAddress', addressLocality: 'Centurion', addressRegion: 'Pretoria, Gauteng', addressCountry: 'ZA' },
  areaServed: [{ '@type': 'Country', name: 'South Africa' }, { '@type': 'Continent', name: 'Africa' }],
  knowsAbout: ['vertical gardens', 'living walls', 'green walls', 'artificial green walls', 'biophilic design'],
  sameAs: ['https://www.facebook.com/modiwall', 'https://www.instagram.com/modiwall_gardens/', 'https://www.linkedin.com/company/modiwall-vertical-gardens/', 'https://www.youtube.com/@modiwallverticalgardens3531'],
};

const expand = (html, ctx) => html
  .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => expand(read(`src/partials/${n}.html`), ctx))
  .replace(/\{\{(img|eager)\s+([\w-]+)(?:\s*\|\s*([^|}]*))?(?:\s*\|\s*([^}]*))?\}\}/g, (_, t, n, s, c) => picture(n, (s || '100vw').trim(), (c || '').trim(), t === 'eager'))
  .replace(/\{\{js:([\s\S]*?)\}\}/g, (_, code) => new Function(...Object.keys(helpers), 'data', `return ${code}`)(...Object.values(helpers), ctx.data || {}))
  .replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? '');

/* ---- pages ---- */
// the date a page's source last changed in git; search engines only trust lastmod when it is honest
const lastmod = (file) => {
  try {
    const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', `src/pages/${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `<lastmod>${d}</lastmod>` : '';
  } catch {
    return '';
  }
};
const pages = readdirSync('src/pages').filter((f) => f.endsWith('.html'));
const sitemap = [];
for (const file of pages) {
  const raw = read(`src/pages/${file}`);
  const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
  const meta = JSON.parse(m[1]);
  const path = file === 'index.html' ? '/' : `/${file}`;
  const url = SITE + path;
  // share card: the page's opening photo when tools/images.py has cut one, else the courtyard
  const lead = meta.post?.image ?? raw.match(/\{\{eager\s+([\w-]+)/)?.[1];
  const share = lead && existsSync(`${OUT}/img/share-${lead}.jpg`)
    ? { src: `${SITE}/img/share-${lead}.jpg`, alt: images[lead].alt }
    : { src: `${SITE}/img/og.jpg`, alt: 'Courtyard living wall planted in bands of fern, lime and burgundy foliage' };
  const graph = [ORG, { '@type': 'WebSite', '@id': `${SITE}/#site`, url: `${SITE}/`, name: 'Modiwall', inLanguage: 'en-ZA', publisher: { '@id': `${SITE}/#business` } },
    { '@type': meta.pageType || 'WebPage', '@id': `${url}#page`, url, name: meta.title, description: meta.description, inLanguage: 'en-ZA', isPartOf: { '@id': `${SITE}/#site` }, about: { '@id': `${SITE}/#business` },
      primaryImageOfPage: { '@type': 'ImageObject', url: share.src, width: 1200, height: 630, caption: share.alt } }];
  if (path !== '/') {
    const trail = [['Home', `${SITE}/`], ...(meta.post ? [['Journal', `${SITE}/journal.html`]] : []), [meta.crumb || meta.title, url]];
    graph.push({ '@type': 'BreadcrumbList', itemListElement: trail.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });
  }
  if (meta.post) {
    const p = postOf[file.slice(8, -5)];
    graph.push({ '@type': 'BlogPosting', '@id': `${url}#post`, headline: p.head, description: meta.description, articleSection: p.topic, inLanguage: 'en-ZA', wordCount: p.words, datePublished: p.date, dateModified: p.mod, mainEntityOfPage: { '@id': `${url}#page` },
      image: { '@type': 'ImageObject', url: share.src }, publisher: { '@id': `${SITE}/#business` }, isPartOf: { '@type': 'Blog', '@id': `${SITE}/journal.html#page`, name: 'Modiwall Journal' },
      author: p.author === 'Modiwall' ? { '@id': `${SITE}/#business` } : { '@type': 'Person', name: p.author, worksFor: { '@id': `${SITE}/#business` } },
      ...(p.sources.length ? { citation: p.sources.map(([name, u]) => ({ '@type': 'CreativeWork', name, url: u })) } : {}) });
  }
  if (path === '/journal.html') graph.push({ '@type': 'ItemList', itemListElement: posts.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + p.url, name: p.head })) });
  if (meta.service) graph.push({ '@type': 'Service', serviceType: meta.service, name: meta.service, provider: { '@id': `${SITE}/#business` }, areaServed: 'South Africa', url });
  if (meta.faq) graph.push({ '@type': 'FAQPage', mainEntity: meta.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
  const ctx = {
    data: meta, title: esc(meta.title), description: esc(meta.description), url, crumb: meta.crumb || '', bodyClass: meta.bodyClass || '',
    robots: meta.noindex ? 'noindex' : 'index, follow, max-image-preview:large',
    shareImg: share.src, shareAlt: esc(share.alt),
    cssv: ver['css/site.css'], jsv: ver['js/main.js'], htmlv: ver['js/html.js'], bootv: ver['js/boot.js'],
    jsonld: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c'),
    year: '2026',
  };
  let source = raw.slice(m[0].length);
  if (meta.post) {
    const p = postOf[file.slice(8, -5)];
    const by = `${p.author === 'Modiwall' ? 'By Modiwall' : `Words by ${p.author}, edited for this journal`}. <time datetime="${p.date}">${longDate(p.date)}</time>. ${p.minutes} minute read.`;
    const refs = p.sources.length ? `<aside class="art__src" aria-label="Sources"><h2>Sources</h2><ol>${p.sources.map(([n, u]) => `<li><a href="${u}" rel="noopener">${n}</a></li>`).join('')}</ol></aside>` : '';
    const parts = { topic: p.topic, head: p.head, stand: p.stand, by, lead: picture(p.image, '(min-width:900px) 50vw, 100vw', '', true), sources: refs, more: helpers.stories(p.related) };
    source = read('src/partials/article.html').replace(/\{\{(topic|head|stand|by|lead|sources|more)\}\}/g, (_, k) => parts[k]).replace('{{BODY}}', () => source.trim().replace('<p>', '<p class="art__first">'));
  }
  let body = expand(source, ctx);
  let html = expand(read('src/partials/shell.html'), ctx).replace('<!--BODY-->', () => body);
  // each drawing of the mark on a page gets masks of its own
  let marks = 0;
  html = html.replace(/<svg class="[^"]*\blg\b[^"]*"[\s\S]*?<\/svg>/g, (m) => { marks++; return m.replace(/\blgm-/g, `lgm${marks}-`); });
  html = html.replace(new RegExp(`(<a[^>]*href="${path}")(?=[^>]*data-nav)`, 'g'), '$1 aria-current="page"').replace(/\n\s*\n+/g, '\n');
  // Every page sits in one folder, so relative links work on modiwall.com, GitHub Pages or any subfolder.
  // 404.html can be served from any depth and stays absolute.
  if (file !== '404.html') {
    html = html.replace(/\b(href|src|action|poster|data-peek|data-img|data-hang|data-hang-l)="\/(?!\/)([^"]*)"/g, (_, k, v) => `${k}="${v || './'}"`)
      .replace(/\bsrcset="([^"]+)"/g, (_, v) => `srcset="${v.replace(/(^|, )\//g, '$1')}"`);
  }
  writeFileSync(`${OUT}/${file}`, html);
  if (!meta.noindex) {
    const imgs = [...new Set([...body.matchAll(/<img src="(\/img\/(?!plant|client|part)[^"]+)"[^>]*alt="([^"]*)"/g)].map((x) => `<image:image><image:loc>${SITE}${x[1]}</image:loc></image:image>`))];
    sitemap.push(`<url><loc>${url}</loc>${lastmod(file)}${imgs.join('')}</url>`);
  }
}
const feed = [...posts].sort((a, b) => b.mod.localeCompare(a.mod));
writeFileSync(`${OUT}/feed.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Modiwall Journal</title><link>${SITE}/journal.html</link><atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/><description>Short reads on living walls and vertical gardens in South Africa.</description><language>en-za</language>${feed.map((p) => `<item><title>${esc(p.head)}</title><link>${SITE}${p.url}</link><guid>${SITE}${p.url}</guid><pubDate>${new Date(`${p.date}T08:00:00Z`).toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('')}</channel></rss>\n`);
writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${sitemap.join('\n')}\n</urlset>\n`);

/* ---- GitHub Pages serves the repository root: send visitors to the built site ---- */
writeFileSync('index.html', `<!doctype html>
<html lang="en-ZA">
<head>
<meta charset="utf-8">
<title>Modiwall</title>
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=public/">
<link rel="canonical" href="${SITE}/">
</head>
<body><p><a href="public/">Open the Modiwall website</a></p></body>
</html>
`);
writeFileSync('.nojekyll', '');
console.log(`${pages.length} pages, css ${(css.length / 1024).toFixed(1)} KB`);
