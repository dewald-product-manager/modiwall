# Modiwall website

Static site in plain HTML, CSS and JavaScript. No frameworks, no third-party requests, no cookies.

| Folder | What it holds |
| --- | --- |
| `src/pages` | One file per page. The JSON comment at the top sets title, description and structured data. |
| `src/partials` | Header, footer, logo, closing call to action, visualiser. |
| `src/css`, `src/js` | Styles and behaviour. `wall.js` is the living wall, `visualise.js` is "See it on your wall", `system.js` is the panel scene. |
| `src/originals` | Master photos. |
| `src/foliage` | Plant cut-outs used by the living wall. |
| `src/static` | Copied as is: fonts, icons, `.htaccess`, `robots.txt`, the form handler. |
| `public` | The built site. **Upload the contents of this folder.** |

## Work on it

    node build.mjs            # build src/ into public/ (Node 18+, no packages to install)
    node tools/serve.mjs      # preview at http://localhost:4173

## Replace a photo with an HD version

1. Save the new photo in `src/originals/` under the **same file name**.
2. `python tools/images.py` (needs Pillow 11.3+; add a name to rebuild only that one).
3. `node build.mjs`

Gallery links point at the largest size of each photo automatically. The links in the "At home" section of
`src/pages/index.html` name a size (for example `bathroom-1920.avif`); check them after replacing those photos.

Plants on the living wall: replace a cut-out in `src/foliage/` (transparent PNG), then `python tools/foliage.py`.

## Before going live

- `src/static/api/quote.php` sends the form to info@modiwall.com. Set `MAIL_FROM` to a real mailbox on the domain and send a test. Without PHP, point the form's `action` elsewhere.
- Confirm the facts marked in the hand-over: patent, guarantee wording, 20 vessels and 500 mm per panel.
- Old addresses (`products.html`, `blog.html`, `publications.html` and others) redirect in `.htaccess`.

## Security

Strict Content-Security-Policy (no inline scripts or styles), HSTS, no framing, no third parties. The form checks origin,
has a honeypot, a minimum fill time, a per-visitor limit and header-injection protection. Visualiser photos never leave the device.
