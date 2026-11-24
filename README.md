# Modiwall website

Static site in plain HTML, CSS and JavaScript. No frameworks, no cookies. Typefaces are Italiana and Montserrat from Google Fonts, served from this site.

| Folder | What it holds |
| --- | --- |
| `src/pages` | One file per page. The JSON comment at the top sets title, description and structured data. |
| `src/partials` | Header, footer, logo, closing call to action, visualiser. |
| `src/css`, `src/js` | Styles and behaviour. `wall.js` is the living wall, `visualise.js` is "See it on your wall", `system.js` is the panel scene, `corridor.js` is the walk through the projects, `boot.js` runs before first paint. |
| `src/originals` | Master photos. |
| `src/foliage` | Plant cut-outs from photos of planted Modiwalls, used by the living wall. |
| `src/static` | Copied as is: fonts, icons, `.htaccess`, `robots.txt`, the form handler. |
| `public` | The built site. **Upload the contents of this folder.** |

## Work on it

    node build.mjs            # build src/ into public/ (Node 18+, no packages to install)
    node tools/serve.mjs      # preview at http://localhost:4173 (PORT=4180 for another port), with the live security headers

## Replace a photo with an HD version

1. Save the new photo in `src/originals/` under the **same file name**.
2. `python tools/images.py` (needs Pillow 11.3+; add a name to rebuild only that one).
3. `node build.mjs`

Gallery links point at the largest size of each photo automatically. The links in the "At home" section of
`src/pages/index.html` name a size (for example `bathroom-1920.avif`); check them after replacing those photos.

Plants on the living wall: replace a cut-out in `src/foliage/` (transparent PNG), then `python tools/foliage.py`.

## Preview on GitHub Pages

Pages publishes `main` from the repository root. `index.html` there sends visitors to `public/`, which is the built site.
The form cannot send on Pages (no PHP), and the preview asks search engines not to list it.

## Before going live

- `src/static/api/quote.php` sends the form to info@modiwall.com. Set `MAIL_FROM` to a real mailbox on the domain and send a test. Without PHP, point the form's `action` elsewhere.
- Confirm the facts marked in the hand-over: patent, guarantee wording, 20 vessels and 500 mm per panel.
- Old addresses (`products.html`, `blog.html`, `publications.html` and others) redirect in `.htaccess`.

## Security

Strict Content-Security-Policy (no inline scripts or styles) with Trusted Types: markup can only be written through
`src/js/html.js`, so any other `innerHTML` throws. HSTS, no framing, no third parties, and only GET, HEAD and the form's POST
are accepted. The form checks Origin and Sec-Fetch-Site, has a honeypot, a minimum fill time, a link-spam filter, limits per
visitor and for the whole site, and header-injection protection. Visualiser photos never leave the device.

HSTS is not on the browser preload list. Add `; preload` to the header and submit at hstspreload.org only once every
subdomain of modiwall.com (mail, webmail, anything else) serves HTTPS, because it is very slow to undo.

Every page shares its opening photo on social media (`img/share-*.jpg`, made by `python tools/images.py og`); the home page
uses `img/og.jpg`.
