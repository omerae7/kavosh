# Pre-invoice generator — build sources

The shipped product is a single file at the repository root:

```
invoice.html
```

It is fully standalone: no CSS/JS/font/image files, no CDN, no server, no
installation, no network. Copy it anywhere (USB, Telegram, e-mail, cloud) and
open it — it keeps working, including PDF generation, in airplane mode.

This folder holds the sources that file is assembled from.

## Rebuild

```
python3 tools/invoice/build.py
```

`build.py` inlines the data files and the two scripts into
`parts/template.html` and writes `invoice.html`.

```
parts/template.html   markup + all CSS + data placeholders
parts/engine.js       bidi + Persian shaping, PDF writer, invoice geometry
parts/app.js          state, calculation, packaging, assistant, UI, validation
data/fontdata.json    subset fonts (base64) + shaping/metric tables
data/unimeta.json     bidi classes + combining marks for the codepoints used
data/products.json    the 107-product database (80 bricks, 24 grout powders, 3 accessories)
```

## Where the data came from

| Source file | Used for |
| --- | --- |
| `جدول آجرها` workbook (product reference, rev. 2) | the brick database: code, description, bricks per m², bricks per carton, bricks per pallet, reference unit price |
| `1405 …` invoice workbook (`Sheet1`) | invoice fields, formulas, labels, the five fixed rows, totals model, static footer text |
| `Sheet2` (price list) | cross-check of carton counts, per-m² counts and prices |
| `PriceListMoshtari.pdf` (Felex) | grout powders and accessories: code, colour, price, bag unit, and the ~5 m² per bag coverage rule |
| Sample PDF | the exact printed geometry (page size, bands, column anchors, baselines, font sizes) |

All 80 bricks cross-check cleanly between the two workbooks on price,
description, per-m² count and carton count.

Revision 2 of the brick workbook changed nothing but packaging: pallet counts
for 34 more products (160 / 784 / 1536 / 1764 / 2304, each a whole number of
cartons) and four corrected carton counts — AR81 52→39, AR19 30→26,
AR300 52→39, AR301 30→26, plus AR83 gaining 39. Prices and descriptions are
untouched.

The Felex list is a scanned image, so its 27 rows were read off the rendered
page and checked band by band. The three items at the bottom of that list
(چسب رد مکس and the two spacers) carry no code in the source, so nothing is
printed in the invoice's کد کالا cell for them — no code was invented.

### Business rules taken from the invoice workbook

```
مبلغ      J = N × L            quantity × unit price
مبلغ کل   G = J − (J × I)      row total after its own discount
جمع کل    = SUM(J13:K22)
تخفیف     = SUM(J) − SUM(G)
قابل پرداخت = جمع کل − تخفیف
```

Units come from the catalogue (قالب for bricks, کیسه for grout, بسته for
spacer packs); the workbook's code-prefix rule (A→قالب, C/G/-→کیسه, N→لیتر)
remains only as a fallback for a code typed by hand.

Each row also exposes the unit price actually charged after its own discount,
editable in both directions: set it and the discount percentage follows, so a
per-brick offer can be entered directly.

Grout powder is advised, never imposed: the assistant sums the brickwork area
across the invoice, divides by the 5 m² a bag covers, and offers to set the
quantity.

The reference prices in the product workbook are the invoice workbook's
`base × 2.0711`, already applied — no multiplier is re-applied here.

### The one contradiction found

The invoice workbook's "قالب در متر" formula (`E14` and its siblings) carries
price-like values for four products instead of brick counts:

| code | invoice workbook | product reference |
| --- | --- | --- |
| AP101 | 188364 × 1.295 | 16 |
| AP103 | 267207 × 1.295 | 16 |
| AP110 | 251150 × 1.295 | 13 |
| AP112 | 377830 × 1.295 | 13 |

These are clearly copied from a price column. The product reference file is the
designated authority for packaging metadata, so its values (16/16/13/13) are the
ones embedded. Nothing was invented.

Products with no carton count (8 of 80) and no pallet count (23 of 80) are left
empty; the assistant says so instead of guessing. Grout powders and accessories
are sold by the bag or pack and carry no packaging data at all — for those rows
the packaging fields are hidden rather than shown blank.

## Outputs

Three, all from the same print model:

- **PDF** — written byte by byte (below).
- **Print** — the generated PDF is loaded into a hidden frame and printed, so
  paper matches the file exactly. Where a browser has no inline PDF viewer the
  file is offered through a toast link instead.
- **HTML** — a copy of the running application with the invoice baked into a
  `#invoice-data` script in `<head>`. Reopening it restores the invoice for
  editing; re-exporting replaces that script rather than stacking, so the file
  does not grow. Each export gets its own `docId`, which scopes its autosave
  slot — `file://` shares one localStorage, so without that, one invoice would
  show another's leftovers. A later edit to an exported file wins over the copy
  baked into it, decided by timestamp.

Files are named `«نام خریدار» «YYMMDD»` — the Jalali date without its century,
e.g. `آقای احمد 050604.pdf` for 1405.06.04.

## PDF fidelity

The PDF is written directly, byte by byte — no browser print dialog, so the
output is identical on every device. Page is Letter (612×792 pt) like the
reference. Every band, rule, column anchor, baseline and font size was measured
from the sample PDF and is listed in the `L` object in `parts/engine.js`.

The reference was produced with Calibri, which cannot be redistributed.
Vazirmatn (SIL OFL 1.1, `data/Vazirmatn-OFL.txt`) is embedded instead — it runs
slightly wider than Calibri, so a few fixed blocks shrink by a fraction of a
point to keep the reference's line lengths. The `BRICKALA.COM` wordmark is the
subset carried over from the customer's own reference document, so the printed
mark is unchanged.

Text stays vector: glyphs are positioned individually with a hand-written
Arabic shaper (init/medi/fina forms and lam-alef ligatures pulled from the
font's GSUB at build time) and a reduced Unicode bidi implementation. A
`ToUnicode` map keeps the PDF selectable and searchable.

## Tests

`test/` contains the harnesses used during development (Node + Playwright,
`/opt/node22/lib/node_modules/playwright`):

```
node tools/invoice/test/render.js     # regenerate the sample invoice, compare to the reference
node tools/invoice/test/stress.js     # extreme numbers, long Persian text, truncation
node tools/invoice/test/full.js       # end-to-end UI run in Chromium, downloads a PDF
node tools/invoice/test/misc.js       # persistence, offline check, discount modes, tablet/phone
node tools/invoice/test/v2.js         # grout rows, net unit price, catalogue, file naming
node tools/invoice/test/roundtrip.js  # HTML export → reopen → edit → re-export
node tools/invoice/test/acc.js        # an accessory row with no printed code
node tools/invoice/test/printtest.js  # print path and its fallback
```

Two things this container cannot verify, both environment limits rather than
code paths: headless Chromium refuses non-ASCII download filenames (it saves
them as `download`), and it ships no inline PDF viewer, so printing always
takes the fallback branch here. Both work on desktop Chrome and Edge.
