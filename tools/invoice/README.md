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
data/products.json    the 80-product database
```

## Where the data came from

| Source file | Used for |
| --- | --- |
| `جدول آجرها` workbook (product reference) | the whole product database: code, description, bricks per m², bricks per carton, bricks per pallet, reference unit price |
| `1405 …` invoice workbook (`Sheet1`) | invoice fields, formulas, labels, the five fixed rows, totals model, static footer text |
| `Sheet2` (price list) | cross-check of carton counts, per-m² counts and prices |
| Sample PDF | the exact printed geometry (page size, bands, column anchors, baselines, font sizes) |

All 80 products cross-check cleanly between the two workbooks on price,
description, per-m² count and carton count.

### Business rules taken from the invoice workbook

```
مبلغ      J = N × L            quantity × unit price
مبلغ کل   G = J − (J × I)      row total after its own discount
جمع کل    = SUM(J13:K22)
تخفیف     = SUM(J) − SUM(G)
قابل پرداخت = جمع کل − تخفیف
واحد      = "قالب" for codes starting with A, "کیسه" for C/-, "لیتر" for N
```

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

Products with no carton count (9 of 80) and no pallet count (56 of 80) are left
empty; the assistant says so instead of guessing.

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
node tools/invoice/test/render.js    # regenerate the sample invoice, compare to the reference
node tools/invoice/test/stress.js    # extreme numbers, long Persian text, truncation
node tools/invoice/test/full.js      # end-to-end UI run in Chromium, downloads a PDF
node tools/invoice/test/misc.js      # persistence, offline check, discount modes, tablet/phone
```
