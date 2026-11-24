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
const css = minCss(['base', 'layout', 'home', 'pages'].map((f) => `src/css/${f}.css`).filter(existsSync).map(read).join('\n'));
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

const helpers = {
  gallery,
  clients: () => Object.entries(images).filter(([, v]) => v.kind === 'logo').map(([k]) => `<li>${picture(k, '140px')}</li>`).join(''),
  faq: (list) => list.map(([q, a]) => `<details class="faq"><summary>${q}</summary><div class="faq__a"><div><p>${a}</p></div></div></details>`).join('\n'),
};

const ORG = {
  '@type': 'HomeAndConstructionBusiness', '@id': `${SITE}/#business`, name: 'Modiwall Vertical Gardens', url: `${SITE}/`,
  logo: `${SITE}/img/icon-512.png`, image: `${SITE}/img/og.jpg`, telephone: '+27768740299', email: 'info@modiwall.com', foundingDate: '2012',
  description: 'Modiwall designs, makes, installs and maintains living vertical gardens and artificial green walls across South Africa.',
  address: { '@type': 'PostalAddress', streetAddress: 'Pebble Springs, Highveld', addressLocality: 'Centurion', postalCode: '0157', addressRegion: 'Gauteng', addressCountry: 'ZA' },
  geo: { '@type': 'GeoCoordinates', latitude: -25.8802, longitude: 28.1945 },
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
  const lead = raw.match(/\{\{eager\s+([\w-]+)/)?.[1];
  const share = lead && existsSync(`${OUT}/img/share-${lead}.jpg`)
    ? { src: `${SITE}/img/share-${lead}.jpg`, alt: images[lead].alt }
    : { src: `${SITE}/img/og.jpg`, alt: 'Courtyard living wall planted in bands of fern, lime and burgundy foliage' };
  const graph = [ORG, { '@type': 'WebSite', '@id': `${SITE}/#site`, url: `${SITE}/`, name: 'Modiwall', inLanguage: 'en-ZA', publisher: { '@id': `${SITE}/#business` } },
    { '@type': meta.pageType || 'WebPage', '@id': `${url}#page`, url, name: meta.title, description: meta.description, inLanguage: 'en-ZA', isPartOf: { '@id': `${SITE}/#site` }, about: { '@id': `${SITE}/#business` },
      primaryImageOfPage: { '@type': 'ImageObject', url: share.src, width: 1200, height: 630, caption: share.alt } }];
  if (path !== '/') graph.push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: meta.crumb || meta.title, item: url }] });
  if (meta.service) graph.push({ '@type': 'Service', serviceType: meta.service, name: meta.service, provider: { '@id': `${SITE}/#business` }, areaServed: 'South Africa', url });
  if (meta.faq) graph.push({ '@type': 'FAQPage', mainEntity: meta.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
  const ctx = {
    data: meta, title: esc(meta.title), description: esc(meta.description), url, crumb: meta.crumb || '', bodyClass: meta.bodyClass || '',
    robots: meta.noindex ? 'noindex' : 'index, follow, max-image-preview:large',
    shareImg: share.src, shareAlt: esc(share.alt),
    cssv: ver['css/site.css'], jsv: ver['js/main.js'], htmlv: ver['js/html.js'],
    jsonld: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c'),
    year: '2026',
  };
  let body = expand(raw.slice(m[0].length), ctx);
  let html = expand(read('src/partials/shell.html'), ctx).replace('<!--BODY-->', () => body);
  html = html.replace(new RegExp(`(<a[^>]*href="${path}")(?=[^>]*data-nav)`, 'g'), '$1 aria-current="page"').replace(/\n\s*\n+/g, '\n');
  // Every page sits in one folder, so relative links work on modiwall.com, GitHub Pages or any subfolder.
  // 404.html can be served from any depth and stays absolute.
  if (file !== '404.html') {
    html = html.replace(/\b(href|src|action|data-peek)="\/(?!\/)([^"]*)"/g, (_, k, v) => `${k}="${v || './'}"`)
      .replace(/\bsrcset="([^"]+)"/g, (_, v) => `srcset="${v.replace(/(^|, )\//g, '$1')}"`);
  }
  writeFileSync(`${OUT}/${file}`, html);
  if (!meta.noindex) {
    const imgs = [...new Set([...body.matchAll(/<img src="(\/img\/(?!plant|client|part)[^"]+)"[^>]*alt="([^"]*)"/g)].map((x) => `<image:image><image:loc>${SITE}${x[1]}</image:loc></image:image>`))];
    sitemap.push(`<url><loc>${url}</loc>${lastmod(file)}${imgs.join('')}</url>`);
  }
}
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
