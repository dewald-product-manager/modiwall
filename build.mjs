/* Zero-dependency static build: src/ -> public/.   Run: node build.mjs
   Pages are plain HTML with a JSON header comment and a few {{tags}}:
     {{> partial}}                 include src/partials/partial.html
     {{img name | sizes | class}}  responsive <picture> from images.manifest.json
     {{eager name | sizes | class}} same, but high priority (above the fold)
     {{js:expression}}             helper output, see `helpers` below            */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const SITE = 'https://www.modiwall.com';
const OUT = 'public';
const read = (p) => readFileSync(p, 'utf8');
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
const jsFiles = readdirSync('src/js').filter((f) => f.endsWith('.js'));
for (const f of jsFiles) ver[`js/${f}`] = hash(read(`src/js/${f}`));
for (const f of jsFiles) {
  const body = minJs(read(`src/js/${f}`)).replace(/(['"])\.\/([a-z-]+\.js)\1/g, (_, q, n) => `${q}./${n}?v=${ver[`js/${n}`]}${q}`);
  writeFileSync(`${OUT}/js/${f}`, body);
}

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

const gallery = (items) => items.map(([name, place, title, span = '']) => `<li class="tile ${span}" data-place="${place}"><a href="${full(name)}" data-lightbox data-w="${images[name].w}" data-h="${images[name].h}">${picture(name, '(min-width:1100px) 33vw, (min-width:640px) 50vw, 100vw')}<span class="tile__cap">${title}</span></a></li>`).join('\n');

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
const pages = readdirSync('src/pages').filter((f) => f.endsWith('.html'));
const sitemap = [];
for (const file of pages) {
  const raw = read(`src/pages/${file}`);
  const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
  const meta = JSON.parse(m[1]);
  const path = file === 'index.html' ? '/' : `/${file}`;
  const url = SITE + path;
  const graph = [ORG, { '@type': 'WebSite', '@id': `${SITE}/#site`, url: `${SITE}/`, name: 'Modiwall', inLanguage: 'en-ZA', publisher: { '@id': `${SITE}/#business` } },
    { '@type': meta.pageType || 'WebPage', '@id': `${url}#page`, url, name: meta.title, description: meta.description, inLanguage: 'en-ZA', isPartOf: { '@id': `${SITE}/#site` }, about: { '@id': `${SITE}/#business` } }];
  if (path !== '/') graph.push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: meta.crumb || meta.title, item: url }] });
  if (meta.service) graph.push({ '@type': 'Service', serviceType: meta.service, name: meta.service, provider: { '@id': `${SITE}/#business` }, areaServed: 'South Africa', url });
  if (meta.faq) graph.push({ '@type': 'FAQPage', mainEntity: meta.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
  const ctx = {
    data: meta, title: esc(meta.title), description: esc(meta.description), url, crumb: meta.crumb || '', bodyClass: meta.bodyClass || '',
    robots: meta.noindex ? 'noindex' : 'index, follow, max-image-preview:large',
    cssv: ver['css/site.css'], jsv: ver['js/main.js'],
    jsonld: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c'),
    year: '2026',
  };
  let body = expand(raw.slice(m[0].length), ctx);
  let html = expand(read('src/partials/shell.html'), ctx).replace('<!--BODY-->', () => body);
  html = html.replace(new RegExp(`(<a[^>]*href="${path}")(?=[^>]*data-nav)`, 'g'), '$1 aria-current="page"').replace(/\n\s*\n+/g, '\n');
  writeFileSync(`${OUT}/${file}`, html);
  if (!meta.noindex) {
    const imgs = [...new Set([...body.matchAll(/<img src="(\/img\/(?!plant|client|part)[^"]+)"[^>]*alt="([^"]*)"/g)].map((x) => `<image:image><image:loc>${SITE}${x[1]}</image:loc></image:image>`))];
    sitemap.push(`<url><loc>${url}</loc>${imgs.join('')}</url>`);
  }
}
writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${sitemap.join('\n')}\n</urlset>\n`);
console.log(`${pages.length} pages, css ${(css.length / 1024).toFixed(1)} KB`);
