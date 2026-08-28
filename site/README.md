# Brickala — the online edition

Three pages on one shared host, no database:

| Route | What it is | Login |
| --- | --- | --- |
| `/` | the photograph and one line of type | no |
| `/faktor` | the invoice composer, exactly as the standalone file | no |
| `/panel` | dashboard, history, customers, reminders, settings | yes |

`/` and `/faktor` can reach no stored record: every endpoint that reads history,
customers, users or settings calls `require_login()` first. The only open calls
are the product list (the composer needs it) and filing an invoice.

## Architecture

PHP 8 with a flat JSON store — nothing to install, nothing to configure.

```
public_html/
  index.php  faktor/  panel/        pages
  api/                              endpoints, one file per subject
  assets/                           css, js, fonts, images, seed data
  _invoice_page.php                 the composer markup, shared by both routes
../brickala-data/                   the record, outside the web root
  data/*.json                       products, customers, invoices index, users…
  data/invoices/<id>.json           one document per invoice, with its full state
  pdf/<jy>/<jm>/<id>.pdf            the bytes the customer received
```

`_boot.php` puts the record in a sibling of `public_html` so no web-server
misconfiguration can serve it. If the host refuses to let PHP write there it
falls back to `data/` and `storage/` inside the site, which ship with their own
`.htaccess` denials.

## The PDF is written by the browser

The engine that draws the invoice is the same one the standalone file uses, so
the online output is byte-identical to the offline one. The browser renders it,
then posts the bytes to `invoices.php?a=save`, which files them. There is no
second implementation to drift.

Each invoice carries a `docId`. Producing a PDF, then printing, then saving HTML
updates one record rather than filing three.

## The HTML export is the standalone file

`assets/faktor-standalone.html` is the offline build, shipped as an asset. When
someone exports, the page fetches it, bakes the invoice into a `#invoice-data`
script, and hands it over. The download opens and edits with no server behind
it — the same file the business already uses.

Rebuild it with `python3 tools/invoice/build.py && cp "فاکتور شهریور 1405.html"
site/assets/faktor-standalone.html`.

## Numbers move

`Odo` in `core.js` renders each digit as its own reel and rolls only the ones
that changed, with a small stagger across columns. Totals, the clock, dashboard
figures and row amounts all go through it.

## Local run

```
php -S 127.0.0.1:8899 -t site
```

Then `tools/invoice/test/site.js`, `panel.js`, `flows.js` and `mob.js` drive it
in Chromium.
