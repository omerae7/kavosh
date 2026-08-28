# Brickala — the online edition

Three pages on one shared host, no database:

| Route | What it is | Login |
| --- | --- | --- |
| `/` | the photograph and one line of type | no |
| `/faktor` | the invoice composer, exactly as the standalone file | no |
| `/panel` | dashboard, history, customers, reminders, messages, settings | yes |

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

## The panel's frame

`panel/_shell.php` and `_foot.php` wrap every panel page in the same chrome: a
compact sticky navigation rail and, beside it, a floating glass window that
holds the top bar and the page, with the front page's copyright line under it.
The stage caps at 1180px, so on a desktop the room photograph frames the work
rather than hiding behind it, and neither panel is stretched to a height its
content does not need. `.prow` rows give each dashboard row its own column
template, so every card in a row is exactly as tall as its neighbours: the
figures and the clock across the top, the assistant, the reminders and the
month chart in the middle, and the latest few invoices beside the notepads
below. The dashboard's invoice list is a glance, not a ledger — date, customer
and amount for four rows, with the full history one link away.

Below 1000px the rail becomes an off-canvas drawer behind the hamburger. The
rail and the messages drawer are both anchored with **physical** `right` and
`translateX(100%)`: a logical `inset-inline-end` slides a closed panel *into* an
RTL page instead of out of it, where it silently swallows every click.

## Messages

An invoice filed from `/faktor` — or by another administrator — is a message.
`messages.php` compares each invoice's `createdAt` against the reading
administrator's own entry in `seen.json`, so the bell count is per-person.
Opening the drawer marks them read; the assistant mentions the count until it
does.

## Notes

Two notepads per administrator, in `notes.json` keyed by username, never shared.
A written note loads locked so a stray keystroke cannot change it; the pencil
unlocks it. `notes.php` treats a POST with no `?a=` as a save — it used to fall
through to the read branch and drop the text.

## Asset versions are fingerprints, not a counter

`_cfg.php` builds `$ASSET_V` from the names, sizes and mtimes of every file
under `assets/css` and `assets/js`. It used to be a hand-bumped `'1'`, and an
upload went out without the bump: browsers kept the previous `panel.js` under
the same `?v=1` URL and ran it against newer markup, where it looked for
elements that release had and this one does not. The panel died on the first
of them and rendered nothing. A fingerprint cannot be forgotten.

`panel.js` also writes through a `text(id, …)` helper and loads its sections
independently, so a widget the page does not have is simply a widget that is
not filled.

## Numbers move

`Odo` in `core.js` renders each digit as its own reel and rolls only the ones
that changed, with a small stagger across columns. Totals, the clock, dashboard
figures and row amounts all go through it.

## Local run

```
php -S 127.0.0.1:8899 -t site
```

Then `tools/invoice/test/site.js`, `pages.js`, `v3.js`, `edit.js`, `flows.js`
and `mob.js` drive it in Chromium.
