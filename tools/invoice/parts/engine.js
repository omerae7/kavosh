/* =====================================================================
   PDF ENGINE — deterministic invoice rendering
   ---------------------------------------------------------------------
   Pure logic, no DOM. Sections:
     1. TextEngine   : Unicode bidi (UBA subset) + Arabic/Persian shaping
     2. PdfFont      : glyph lookup / metrics for one embedded TrueType face
     3. PdfDoc       : minimal PDF 1.7 writer (Type0 / Identity-H / TrueType)
     4. Layout       : the fixed geometry measured from the reference invoice
     5. renderInvoice: draws a print model onto a page
   Geometry values are in PostScript points, measured from the reference
   PDF (Letter, 612x792). Y values are given top-down and flipped on draw.
   ===================================================================== */
var InvoiceEngine = (function () {
  'use strict';

  /* ---------------------------------------------------------------
     1. TEXT ENGINE — bidi + shaping
     --------------------------------------------------------------- */

  var UNI = null; // { bidi: {cp: class}, marks: [cp] }
  var MARKS = null;

  function bidiClass(cp) {
    var c = UNI.bidi[cp];
    return c || 'L';
  }

  // Unicode Bidirectional Algorithm, reduced to the rules that matter for
  // single-paragraph invoice fields (no explicit embedding controls).
  function bidiLevels(cps, paraLevel) {
    var n = cps.length;
    var types = new Array(n), levels = new Array(n), i;
    for (i = 0; i < n; i++) { types[i] = bidiClass(cps[i]); levels[i] = paraLevel; }
    var sor = paraLevel % 2 ? 'R' : 'L';

    // W1: NSM takes the type of the previous character
    var prev = sor;
    for (i = 0; i < n; i++) {
      if (types[i] === 'NSM') types[i] = prev;
      else prev = types[i];
    }
    // W2: EN -> AN when the last strong type is AL
    var strong = sor;
    for (i = 0; i < n; i++) {
      if (types[i] === 'L' || types[i] === 'R' || types[i] === 'AL') strong = types[i];
      else if (types[i] === 'EN' && strong === 'AL') types[i] = 'AN';
    }
    // W3: AL -> R
    for (i = 0; i < n; i++) if (types[i] === 'AL') types[i] = 'R';
    // W4: single ES between EN, single CS between two numbers of one kind
    for (i = 1; i < n - 1; i++) {
      if (types[i] === 'ES' && types[i - 1] === 'EN' && types[i + 1] === 'EN') types[i] = 'EN';
      else if (types[i] === 'CS' && types[i - 1] === types[i + 1] &&
               (types[i - 1] === 'EN' || types[i - 1] === 'AN')) types[i] = types[i - 1];
    }
    // W5: a sequence of ET adjacent to EN becomes EN
    for (i = 0; i < n; i++) {
      if (types[i] !== 'ET') continue;
      var j = i; while (j < n && types[j] === 'ET') j++;
      var before = i > 0 ? types[i - 1] : sor;
      var after = j < n ? types[j] : sor;
      if (before === 'EN' || after === 'EN') for (var k = i; k < j; k++) types[k] = 'EN';
      i = j - 1;
    }
    // W6: remaining separators/terminators -> ON
    for (i = 0; i < n; i++) if (types[i] === 'ET' || types[i] === 'ES' || types[i] === 'CS' ||
                                types[i] === 'BN') types[i] = 'ON';
    // W7: EN -> L when the last strong type is L
    strong = sor;
    for (i = 0; i < n; i++) {
      if (types[i] === 'L' || types[i] === 'R') strong = types[i];
      else if (types[i] === 'EN' && strong === 'L') types[i] = 'L';
    }
    // N1/N2: neutrals
    function strongOf(t) {
      if (t === 'L') return 'L';
      if (t === 'R' || t === 'EN' || t === 'AN') return 'R';
      return null;
    }
    var neutral = { 'B': 1, 'S': 1, 'WS': 1, 'ON': 1, 'LRE': 1, 'RLE': 1, 'LRO': 1, 'RLO': 1, 'PDF': 1, 'LRI': 1, 'RLI': 1, 'FSI': 1, 'PDI': 1 };
    for (i = 0; i < n; i++) {
      if (!neutral[types[i]]) continue;
      var s = i; while (i < n && neutral[types[i]]) i++;
      var e = i; // [s,e)
      var b = s > 0 ? strongOf(types[s - 1]) : sor;
      var a = e < n ? strongOf(types[e]) : sor;
      var res = (b && b === a) ? b : (paraLevel % 2 ? 'R' : 'L');
      for (var t = s; t < e; t++) types[t] = res;
      i = e - 1;
    }
    // I1/I2: resolve implicit levels
    for (i = 0; i < n; i++) {
      var lv = paraLevel;
      if (paraLevel % 2 === 0) {
        if (types[i] === 'R') lv = paraLevel + 1;
        else if (types[i] === 'EN' || types[i] === 'AN') lv = paraLevel + 2;
      } else {
        if (types[i] === 'L' || types[i] === 'EN' || types[i] === 'AN') lv = paraLevel + 1;
      }
      levels[i] = lv;
    }
    // L1: trailing whitespace returns to the paragraph level
    for (i = n - 1; i >= 0; i--) {
      var cls = bidiClass(cps[i]);
      if (cls === 'WS' || cls === 'B' || cls === 'S') levels[i] = paraLevel; else break;
    }
    return levels;
  }

  // L2 — reorder runs from the highest level down to the lowest odd level
  function reorderVisual(items) {
    var n = items.length, i;
    if (!n) return items;
    var max = 0, minOdd = 99;
    for (i = 0; i < n; i++) {
      if (items[i].lv > max) max = items[i].lv;
      if (items[i].lv % 2 && items[i].lv < minOdd) minOdd = items[i].lv;
    }
    var out = items.slice();
    for (var lv = max; lv >= minOdd; lv--) {
      for (i = 0; i < n; i++) {
        if (out[i].lv < lv) continue;
        var s = i; while (i < n && out[i].lv >= lv) i++;
        var seg = out.slice(s, i); seg.reverse();
        for (var k = 0; k < seg.length; k++) out[s + k] = seg[k];
        i--;
      }
    }
    return out;
  }

  var JOIN_D = 'D', JOIN_R = 'R', JOIN_U = 'U';

  /* ---------------------------------------------------------------
     2. PDF FONT
     --------------------------------------------------------------- */
  function PdfFont(data, key) {
    this.key = key;
    this.d = data;
    this.upem = data.upem;
    // widths expressed in 1000ths of an em, matching what the PDF declares,
    // so measurement here and rendering in the viewer agree exactly.
    this.w1000 = data.widths.map(function (w) { return Math.round(w * 1000 / data.upem); });
  }
  PdfFont.prototype.gid = function (cp) {
    var g = this.d.cmap[cp];
    return g === undefined ? 0 : g;
  };
  PdfFont.prototype.joining = function (gid) {
    var f = this.d.forms[gid];
    if (!f) return JOIN_U;
    if (f[0] && f[1]) return JOIN_D;
    if (f[2] && !f[0]) return JOIN_R;
    return JOIN_U;
  };
  PdfFont.prototype.formGid = function (gid, form) {
    if (!form) return gid;                      // 0 = isolated
    var f = this.d.forms[gid];
    if (!f) return gid;
    return f[form - 1] || gid;
  };
  PdfFont.prototype.width = function (gid) {
    var w = this.w1000[gid];
    return w === undefined ? 0 : w;
  };

  /* Shape a logical string into visual-order glyph runs.
     Returns { glyphs: [{g, cp}], width1000 } */
  PdfFont.prototype.shape = function (str, rtl) {
    var cps = [], i;
    for (var it = 0; it < str.length; it++) {
      var cp = str.codePointAt(it);
      cps.push(cp);
      if (cp > 0xFFFF) it++;
    }
    if (!cps.length) return { glyphs: [], w: 0 };
    var levels = bidiLevels(cps, rtl ? 1 : 0);

    // --- Arabic joining (operates in logical order) ---
    var base = cps.map(function (cp) { return this.gid(cp); }, this);
    var jt = base.map(function (g, k) {
      if (cps[k] === 0x200D) return 'C';
      if (cps[k] === 0x200C) return JOIN_U;
      if (MARKS[cps[k]]) return 'T';
      return this.joining(g);
    }, this);
    var forms = new Array(cps.length);
    for (i = 0; i < cps.length; i++) {
      if (jt[i] === 'T') { forms[i] = 0; continue; }
      var p = i - 1; while (p >= 0 && jt[p] === 'T') p--;
      var nx = i + 1; while (nx < cps.length && jt[nx] === 'T') nx++;
      var canBack = p >= 0 && (jt[p] === JOIN_D || jt[p] === 'C');
      var canFwd = nx < cps.length && (jt[nx] === JOIN_D || jt[nx] === 'C' || jt[nx] === JOIN_R);
      if (jt[i] === JOIN_D) forms[i] = canBack ? (canFwd ? 2 : 3) : (canFwd ? 1 : 0);
      else if (jt[i] === JOIN_R) forms[i] = canBack ? 3 : 0;
      else forms[i] = 0;
    }
    var items = [];
    for (i = 0; i < cps.length; i++) {
      if (cps[i] === 0x200C || cps[i] === 0x200D) continue;   // zero-width joiners
      items.push({ g: this.formGid(base[i], forms[i]), lv: levels[i], cp: cps[i] });
    }
    // --- mandatory ligatures (lam-alef and friends) ---
    var lig = this.d.ligs, out = [];
    for (i = 0; i < items.length; i++) {
      var set = lig[items[i].g], done = false;
      if (set) {
        for (var s = 0; s < set.length; s++) {
          var comp = set[s][0], ok = comp.length > 0;
          for (var c = 0; c < comp.length; c++) {
            if (!items[i + 1 + c] || items[i + 1 + c].g !== comp[c]) { ok = false; break; }
          }
          if (ok) {
            var cps2 = [items[i].cp];
            for (var q = 0; q < comp.length; q++) cps2.push(items[i + 1 + q].cp);
            out.push({ g: set[s][1], lv: items[i].lv, cp: items[i].cp, cps: cps2 });
            i += comp.length; done = true; break;
          }
        }
      }
      if (!done) out.push(items[i]);
    }
    var visual = reorderVisual(out);
    var w = 0;
    for (i = 0; i < visual.length; i++) w += this.width(visual[i].g);
    return { glyphs: visual, w: w };
  };

  PdfFont.prototype.measure = function (str, size, rtl) {
    return this.shape(str, rtl).w * size / 1000;
  };

  /* ---------------------------------------------------------------
     3. PDF WRITER
     --------------------------------------------------------------- */
  function bytesOf(str) {
    var a = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) & 0xff;
    return a;
  }
  function b64ToBytes(b64) {
    var bin = atob(b64), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function hex4(n) { return ('000' + n.toString(16).toUpperCase()).slice(-4); }

  function PdfDoc(width, height) {
    this.w = width; this.h = height;
    this.ops = [];
    this.used = {};           // fontKey -> {gid: cp}
    this.fonts = {};
  }
  PdfDoc.prototype.rect = function (x, y, w, h, gray) {
    this.ops.push(fmt(gray) + ' g ' + fmt(x) + ' ' + fmt(this.h - y - h) + ' ' +
                  fmt(w) + ' ' + fmt(h) + ' re f');
  };
  function fmt(v) {
    var s = (Math.round(v * 1000) / 1000).toString();
    return s === '-0' ? '0' : s;
  }
  /* align: 'r' | 'c' | 'l' — x is the anchor for that alignment. */
  PdfDoc.prototype.text = function (str, x, baseline, font, size, align, opt) {
    if (str === null || str === undefined) return 0;
    str = String(str);
    if (!str.length) return 0;
    opt = opt || {};
    var rtl = opt.rtl !== undefined ? opt.rtl : true;
    var sh = font.shape(str, rtl);
    var w = sh.w * size / 1000;
    if (opt.maxWidth && w > opt.maxWidth) {          // deterministic shrink-to-fit
      var min = opt.minSize || size * 0.62;
      size = Math.max(min, size * opt.maxWidth / w);
      size = Math.floor(size * 100) / 100;
      w = sh.w * size / 1000;
      // free text may still be too long at the smallest allowed size: clip it
      // rather than let it run into the neighbouring cell. Numbers are never
      // clipped — they shrink only, so a printed figure is always complete.
      if (opt.fit === 'truncate' && w > opt.maxWidth) {
        var cut = str;
        while (cut.length > 1 && w > opt.maxWidth) {
          cut = cut.slice(0, -1);
          sh = font.shape(cut.replace(/\s+$/, '') + '…', rtl);
          w = sh.w * size / 1000;
        }
      }
    }
    var sx = align === 'r' ? x - w : align === 'c' ? x - w / 2 : x;
    var reg = this.used[font.key] || (this.used[font.key] = {});
    var hexs = '', i;
    for (i = 0; i < sh.glyphs.length; i++) {
      var gl = sh.glyphs[i];
      hexs += hex4(gl.g);
      if (reg[gl.g] === undefined) reg[gl.g] = gl.cps || gl.cp;
    }
    this.fonts[font.key] = font;
    this.ops.push('BT /' + font.key + ' ' + fmt(size) + ' Tf 0 g 1 0 0 1 ' +
                  fmt(sx) + ' ' + fmt(this.h - baseline) + ' Tm <' + hexs + '> Tj ET');
    return w;
  };

  PdfDoc.prototype.build = function () {
    var self = this;
    var objs = [];   // 1-based; each entry is a string or Uint8Array chunk list
    function add(content) { objs.push(content); return objs.length; }

    var content = this.ops.join('\n');
    var fontKeys = Object.keys(this.fonts);
    var fontRefs = {};
    var pageId = 3;

    add('<< /Type /Catalog /Pages 2 0 R >>');           // 1
    add('');                                            // 2 pages (filled later)
    add('');                                            // 3 page (filled later)
    var contentId = add({ dict: '<< /Length ' + content.length + ' >>', stream: bytesOf(content) });

    fontKeys.forEach(function (key) {
      var f = self.fonts[key], d = f.d;
      var raw = b64ToBytes(d.b64);
      var fileId = add({ dict: '<< /Length ' + raw.length + ' /Length1 ' + raw.length + ' >>', stream: raw });
      var name = '/VZ' + key;
      var sc = 1000 / d.upem;
      var descId = add('<< /Type /FontDescriptor /FontName ' + name + ' /Flags 4 /FontBBox [' +
        Math.round(d.bbox[0] * sc) + ' ' + Math.round(d.bbox[1] * sc) + ' ' +
        Math.round(d.bbox[2] * sc) + ' ' + Math.round(d.bbox[3] * sc) + '] /ItalicAngle ' +
        Math.round(d.italicAngle) + ' /Ascent ' + Math.round(d.asc * sc) + ' /Descent ' +
        Math.round(d.desc * sc) + ' /CapHeight ' + Math.round(d.capHeight * sc) +
        ' /StemV ' + d.stemV + ' /FontFile2 ' + fileId + ' 0 R >>');
      // /W for the glyphs actually used keeps the array small and exact
      var reg = self.used[key] || {};
      var gids = Object.keys(reg).map(Number).sort(function (a, b) { return a - b; });
      var w = '', run = null;
      gids.forEach(function (g) {
        if (run && g === run.start + run.list.length) run.list.push(f.width(g));
        else { if (run) w += run.start + ' [' + run.list.join(' ') + '] '; run = { start: g, list: [f.width(g)] }; }
      });
      if (run) w += run.start + ' [' + run.list.join(' ') + ']';
      var toUni = buildToUnicode(reg);
      var tuId = add({ dict: '<< /Length ' + toUni.length + ' >>', stream: bytesOf(toUni) });
      var cidId = add('<< /Type /Font /Subtype /CIDFontType2 /BaseFont ' + name +
        ' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >>' +
        ' /FontDescriptor ' + descId + ' 0 R /DW 0 /W [' + w + '] /CIDToGIDMap /Identity >>');
      fontRefs[key] = add('<< /Type /Font /Subtype /Type0 /BaseFont ' + name +
        ' /Encoding /Identity-H /DescendantFonts [' + cidId + ' 0 R] /ToUnicode ' + tuId + ' 0 R >>');
    });

    var infoId = add('<< /Title ' + pdfText(this.title || 'پیش فاکتور فروش') +
      ' /Producer (Brickala standalone invoice generator) >>');

    objs[1] = '<< /Type /Pages /Kids [' + pageId + ' 0 R] /Count 1 >>';
    var fdict = fontKeys.map(function (k) { return '/' + k + ' ' + fontRefs[k] + ' 0 R'; }).join(' ');
    objs[2] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + this.w + ' ' + this.h +
      '] /Resources << /Font << ' + fdict + ' >> /ProcSet [/PDF /Text] >> /Contents ' +
      contentId + ' 0 R >>';

    // ---- serialise ----
    var parts = [], size = 0, offsets = [0];
    function push(chunk) {
      var b = typeof chunk === 'string' ? bytesOf(chunk) : chunk;
      parts.push(b); size += b.length;
    }
    push('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');
    objs.forEach(function (o, idx) {
      offsets[idx + 1] = size;
      push((idx + 1) + ' 0 obj\n');
      if (typeof o === 'string') push(o + '\nendobj\n');
      else {
        push(o.dict + '\nstream\n');
        push(o.stream);
        push('\nendstream\nendobj\n');
      }
    });
    var xref = size;
    var x = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    for (var i = 1; i <= objs.length; i++) {
      x += ('0000000000' + offsets[i]).slice(-10) + ' 00000 n \n';
    }
    x += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info ' + infoId +
      ' 0 R /ID [<' + docId() + '> <' + docId() + '>] >>\nstartxref\n' + xref + '\n%%EOF\n';
    push(x);

    var out = new Uint8Array(size), pos = 0;
    parts.forEach(function (p) { out.set(p, pos); pos += p.length; });
    return out;
  };

  /* PDF text string: UTF-16BE with a byte-order mark, written as hex */
  function pdfText(str) {
    var out = 'FEFF';
    for (var i = 0; i < str.length; i++) out += hex4(str.charCodeAt(i));
    return '<' + out + '>';
  }

  function docId() {
    // Deterministic per content is not required; a stable constant keeps
    // output byte-identical for identical input, which aids verification.
    return '0123456789ABCDEF0123456789ABCDEF';
  }

  function buildToUnicode(reg) {
    var lines = [], gids = Object.keys(reg).map(Number).sort(function (a, b) { return a - b; });
    gids.forEach(function (g) {
      var cp = reg[g];
      if (cp === undefined) return;
      var list = Array.isArray(cp) ? cp : [cp], hexv = '';
      for (var q = 0; q < list.length; q++) {
        var v = list[q];
        if (v > 0xFFFF) { v -= 0x10000; hexv += hex4(0xD800 + (v >> 10)) + hex4(0xDC00 + (v & 0x3FF)); }
        else hexv += hex4(v);
      }
      lines.push('<' + hex4(g) + '> <' + hexv + '>');
    });
    var body = '';
    for (var i = 0; i < lines.length; i += 100) {
      var chunk = lines.slice(i, i + 100);
      body += chunk.length + ' beginbfchar\n' + chunk.join('\n') + '\nendbfchar\n';
    }
    return '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n' +
      '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n' +
      '/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' +
      body + 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n';
  }

  /* ---------------------------------------------------------------
     4. LAYOUT — measured from the reference invoice PDF
     --------------------------------------------------------------- */
  var L = {
    page: { w: 612, h: 792 },
    grey: 0.92941, rule: 0.50196,
    bands: {
      topRule: [50.88, 137.28, 504.96, 0.84],
      customer: [51.36, 137.64, 504.48, 46.44],
      header: [51.36, 197.40, 504.48, 18.48],
      row2: [51.36, 239.52, 504.48, 23.88],
      row4: [51.36, 287.04, 504.48, 23.88],
      bottomRule: [50.88, 334.20, 504.96, 0.84],
      vRule1: [434.04, 370.20, 0.84, 71.40],
      vRule2: [434.04, 455.88, 0.84, 51.36],
      payable: [51.36, 417.72, 120.60, 23.88]
    },
    /* s11n: the تخفیف نقدی and مبلغ کل cells run a touch smaller than the
       rest of the row so large rial figures keep room to breathe */
    size: { s10: 8.14, s11: 8.98, s11n: 8.0, s12: 9.82, mark: 6.59 },
    head: {
      title: { x: 554.44, y: 87.36, a: 'r' },
      statusLabel: { x: 133.08, y: 110.28, a: 'l' },
      statusValue: { x: 130.28, y: 111.00, a: 'r' },
      dateLabel: { x: 133.08, y: 122.64, a: 'l' },
      dateValue: { x: 129.90, y: 122.64, a: 'r' },
      company: { x: 554.44, y: 122.64, a: 'r' }
    },
    cust: {
      rows: [150.96, 167.40, 180.84],
      labelRight: 554.44, labelMid: 352.60,
      valueWide: 514.00, valueMid: 311.60, valueProv: 472.20,
      widthWide: 152, widthMid: 145, widthProv: 114, gap: 4.5
    },
    tbl: {
      headY: 209.60,
      rowY0: 230.16, rowStep: 23.76,
      col: {
        total:   { irr: 56.10, num: 127.30, dash: 118.20 },
        disc:    { c: 152.10, w: 45.0 },
        amount:  { irr: 176.90, num: 248.00, dash: 248.00 },
        price:   { num: 308.91, dash: 299.80 },
        unit:    { c: 334.00, w: 37.0 },
        qty:     { num: 389.56, dash: 380.50 },
        desc:    { c: 434.80, w: 76.0 },
        code:    { c: 495.50, w: 38.0 },
        no:      { c: 536.03 }
      },
      headCells: [
        ['مبلغ کل', 91.60, 'c', 's12'],
        ['تخفیف نقدی', 152.10, 'c', 's10'],
        ['مبلغ', 212.60, 'c', 's12'],
        ['بهای واحد', 311.58, 'r', 's12'],
        ['واحد', 334.00, 'c', 's12'],
        ['مقدار', 374.30, 'c', 's12'],
        ['شرح کالا', 434.80, 'c', 's12'],
        ['کد کالا', 495.40, 'c', 's12'],
        ['ردیف', 536.05, 'c', 's11']
      ]
    },
    totals: {
      label: 212.55,
      gross: { y: 384.60, irr: 56.04, num: 167.33, label: 'جمع کل' },
      disc: { y: 408.36, irr: 56.04, num: 167.33, label: 'تخفیف' },
      pay: { y: 432.48, irr: 56.64, num: 165.72, label: 'قابل پرداخت' }
    },
    notes: {
      thanksX: 374.00, thanksY: [390.72, 402.60, 414.48, 426.36], thanksW: 108,
      preparer: { x: 495.30, y: 408.48, w: 118 },
      leftX: 242.80, leftY: [473.16, 483.84, 494.52], leftW: 336,
      rightX: 495.30, rightY: [472.32, 484.20, 496.08], rightW: 112,
      footPhoneX: 111.70, footAddrX: 323.70, footY: 522.60,
      markX: 476.04, markY: 521.88
    },
    text: {
      title: 'پیش فاکتور فروش',
      statusLabel: 'وضعیت:',
      dateLabel: 'تاریخ صدور:',
      company: 'توزیع کنندگی رسمی آجر نسوز آذرخش | پودر بند کشی فلکس',
      labels: [
        ['نام خریدار:', 'نام استان.شهر:', 'نشانی:'],
        ['شماره تلفن:', 'کد پستی:', 'کد ملی:']
      ],
      preparer: 'تنظیم کننده:',
      thanks: ['از انتخاب شما سپاسگذاریم.', 'در صورت نیاز به هرگونه تغییر',
               'و اطلاعات پرداخت با کارشناسان', 'خود تماس بگیرید.'],
      left: ['زمان ارسال بار پس از وصول اسناد مالی خواهد بود.تحویل بار درب کارخانه می باشد. اعتبار این پیش فاکتور از زمان صدور تا',
             'پرداخت 3 روز می باشد. در صورتی که این پیش فاکتور جهت ادامه بار می باشد لطفا نمونه آجر را از هر رنگ یک قالب برای',
             'شرکت ارسال کنید.روند ارسال بار های کسری و ادامه بار به دلیل هماهنگی های لازم طولانی تر از روند ارسال عادی است .'],
      right: ['توجه: تاریخ تحویل 5 روز کاری', 'پس از دریافت اسناد مالی پیش فاکتور', 'می باشد.'],
      footPhone: 'شماره تماس: 09122278500',
      footAddr: 'قم ،بلوار امام رضا ،مجتمع فردوس ، شوروم vip آجر نسوز آذرخش',
      mark: 'BRICKALA.COM',
      irr: 'IRR',
      dash: '-'
    }
  };

  function group(n) {
    if (n === null || n === undefined || n === '') return '';
    var s = String(Math.abs(Math.round(n))), out = '', c = 0;
    for (var i = s.length - 1; i >= 0; i--) {
      out = s[i] + out; c++;
      if (c % 3 === 0 && i > 0) out = ',' + out;
    }
    return (n < 0 ? '-' : '') + out;
  }

  /* ---------------------------------------------------------------
     5. RENDER
     --------------------------------------------------------------- */
  var FONTS = null;

  function renderInvoice(model) {
    var R = FONTS.R, B = FONTS.B, W = FONTS.W;
    var doc = new PdfDoc(L.page.w, L.page.h);
    doc.title = 'پیش فاکتور فروش' + (model.customer.name ? ' — ' + model.customer.name : '');
    var S = L.size, T = L.text, bd = L.bands;

    // --- background bands & rules (drawn first) ---
    doc.rect(bd.customer[0], bd.customer[1], bd.customer[2], bd.customer[3], L.grey);
    doc.rect(bd.header[0], bd.header[1], bd.header[2], bd.header[3], L.grey);
    doc.rect(bd.row2[0], bd.row2[1], bd.row2[2], bd.row2[3], L.grey);
    doc.rect(bd.row4[0], bd.row4[1], bd.row4[2], bd.row4[3], L.grey);
    doc.rect(bd.payable[0], bd.payable[1], bd.payable[2], bd.payable[3], L.grey);
    doc.rect(bd.topRule[0], bd.topRule[1], bd.topRule[2], bd.topRule[3], L.rule);
    doc.rect(bd.vRule1[0], bd.vRule1[1], bd.vRule1[2], bd.vRule1[3], L.rule);
    doc.rect(bd.vRule2[0], bd.vRule2[1], bd.vRule2[2], bd.vRule2[3], L.rule);
    doc.rect(bd.bottomRule[0], bd.bottomRule[1], bd.bottomRule[2], bd.bottomRule[3], 0);

    // --- header ---
    var h = L.head;
    doc.text(T.title, h.title.x, h.title.y, B, S.s11, h.title.a);
    doc.text(T.statusLabel, h.statusLabel.x, h.statusLabel.y, B, S.s10, h.statusLabel.a);
    doc.text(model.meta.status, h.statusValue.x, h.statusValue.y, R, S.s11, h.statusValue.a, { maxWidth: 75, minSize: 6, fit: 'truncate' });
    doc.text(T.dateLabel, h.dateLabel.x, h.dateLabel.y, B, S.s10, h.dateLabel.a);
    doc.text(model.meta.date, h.dateValue.x, h.dateValue.y, R, S.s11, h.dateValue.a, { maxWidth: 75, minSize: 6, fit: 'truncate' });
    doc.text(T.company, h.company.x, h.company.y, R, S.s11, h.company.a, { maxWidth: 196 });

    // --- customer block ---
    var c = L.cust, cm = model.customer;
    var right = [cm.name, cm.province, cm.address];
    var mid = [cm.phone, cm.postal, cm.nationalId];
    var rightAnchor = [c.valueWide, c.valueProv, c.valueWide];
    var rightWidth = [c.widthWide, c.widthProv, c.widthWide];
    for (var i = 0; i < 3; i++) {
      var y = c.rows[i];
      var wR = doc.text(T.labels[0][i], c.labelRight, y, R, S.s11, 'r');
      var wM = doc.text(T.labels[1][i], c.labelMid, y, R, S.s11, 'r');
      // keep a constant gap even though the substituted face is wider than
      // the original, so a value can never collide with its label
      var xR = Math.min(rightAnchor[i], c.labelRight - wR - c.gap);
      var xM = Math.min(c.valueMid, c.labelMid - wM - c.gap);
      if (right[i]) doc.text(right[i], xR, y, B, S.s11, 'r', { maxWidth: rightWidth[i], minSize: 5.9, fit: 'truncate' });
      if (mid[i]) doc.text(mid[i], xM, y, B, S.s11, 'r', { maxWidth: c.widthMid, minSize: 5.9, fit: 'truncate' });
    }

    // --- table header ---
    L.tbl.headCells.forEach(function (hc) {
      doc.text(hc[0], hc[1], L.tbl.headY, B, S[hc[3]], hc[2]);
    });

    // --- five product rows (always five) ---
    var col = L.tbl.col;
    // money columns share their cell with a leading "IRR": keep the number
    // inside the space that is actually left, whatever its magnitude
    var irrW11 = R.measure(T.irr, S.s11, false);
    var fitTotal = col.total.num - col.total.irr - R.measure(T.irr, S.s11n, false) - 4;
    var fitAmount = col.amount.num - col.amount.irr - irrW11 - 4;
    for (i = 0; i < 5; i++) {
      var y = L.tbl.rowY0 + L.tbl.rowStep * i;
      var r = model.rows[i] || {};
      doc.text(String(i + 1), col.no.c, y, R, S.s11, 'c', { rtl: false });
      doc.text(T.irr, col.total.irr, y, R, S.s11n, 'l', { rtl: false });
      doc.text(T.irr, col.amount.irr, y, R, S.s11, 'l', { rtl: false });
      if (r.used) {
        doc.text(r.code, col.code.c, y, R, S.s11, 'c', { rtl: false, maxWidth: col.code.w, minSize: 5.5, fit: 'truncate' });
        doc.text(r.desc, col.desc.c, y, R, S.s11, 'c', { maxWidth: col.desc.w, minSize: 5.5, fit: 'truncate' });
        doc.text(group(r.qty), col.qty.num, y, R, S.s11, 'r', { rtl: false, maxWidth: 34, minSize: 5.2 });
        doc.text(r.unit, col.unit.c, y, R, S.s11, 'c', { maxWidth: col.unit.w, minSize: 6, fit: 'truncate' });
        doc.text(group(r.unitPrice), col.price.num, y, R, S.s11, 'r', { rtl: false, maxWidth: 54, minSize: 5.2 });
        doc.text(group(r.gross), col.amount.num, y, R, S.s11, 'r', { rtl: false, maxWidth: fitAmount, minSize: 5.2 });
        if (r.discountText) {
          doc.text(r.discountText, col.disc.c, y, R, S.s11n, 'c', { maxWidth: col.disc.w, minSize: 5.5, fit: 'truncate' });
        }
        doc.text(group(r.final), col.total.num, y, R, S.s11n, 'r', { rtl: false, maxWidth: fitTotal, minSize: 5.2 });
      } else {
        doc.text(T.dash, col.qty.dash, y, R, S.s11, 'r', { rtl: false });
        doc.text(T.dash, col.price.dash, y, R, S.s11, 'r', { rtl: false });
        doc.text(T.dash, col.amount.dash, y, R, S.s11, 'r', { rtl: false });
        doc.text(T.dash, col.total.dash, y, R, S.s11n, 'r', { rtl: false });
      }
    }

    // --- totals ---
    var t = L.totals, tot = model.totals;
    [[t.gross, tot.gross, R, S.s11, B, S.s11],
     [t.disc, tot.discount, R, S.s11, B, S.s11],
     [t.pay, tot.payable, B, S.s12, B, S.s12]].forEach(function (row) {
      var g = row[0], f = row[2], sz = row[3];
      doc.text(T.irr, g.irr, g.y, f, sz, 'l', { rtl: false });
      var fit = g.num - g.irr - f.measure(T.irr, sz, false) - 4;
      doc.text(group(row[1]), g.num, g.y, f, sz, 'r', { rtl: false, maxWidth: fit, minSize: 5.2 });
      doc.text(g.label, t.label, g.y, row[4], row[5], 'c', { maxWidth: 74, minSize: 7 });
    });

    // --- notes / footer ---
    var n = L.notes;
    T.thanks.forEach(function (line, k) {
      doc.text(line, n.thanksX, n.thanksY[k], R, S.s11, 'c', { maxWidth: n.thanksW, minSize: 6.4 });
    });
    var prep = model.meta.preparedBy ? T.preparer + ' ' + model.meta.preparedBy : T.preparer;
    doc.text(prep, n.preparer.x, n.preparer.y, R, S.s11, 'c', { maxWidth: n.preparer.w, minSize: 6, fit: 'truncate' });
    T.left.forEach(function (line, k) {
      doc.text(line, n.leftX, n.leftY[k], R, S.s10, 'c', { maxWidth: n.leftW, minSize: 6 });
    });
    T.right.forEach(function (line, k) {
      doc.text(line, n.rightX, n.rightY[k], R, S.s11, 'c', { maxWidth: n.rightW, minSize: 6 });
    });
    doc.text(T.footPhone, n.footPhoneX, n.footY, R, S.s10, 'c', { maxWidth: 118 });
    doc.text(T.footAddr, n.footAddrX, n.footY, R, S.s10, 'c', { maxWidth: 290 });
    doc.text(T.mark, n.markX, n.markY, W, S.mark, 'l', { rtl: false });

    return doc.build();
  }

  /* ---------------------------------------------------------------
     PUBLIC
     --------------------------------------------------------------- */
  return {
    init: function (fontData, uniMeta) {
      UNI = uniMeta;
      MARKS = {};
      uniMeta.marks.forEach(function (cp) { MARKS[cp] = 1; });
      FONTS = {
        R: new PdfFont(fontData.R, 'R'),
        B: new PdfFont(fontData.B, 'B'),
        W: new PdfFont(fontData.W, 'W')
      };
      return this;
    },
    fonts: function () { return FONTS; },
    layout: L,
    group: group,
    render: renderInvoice,
    _internal: { PdfDoc: PdfDoc, PdfFont: PdfFont, bidiLevels: bidiLevels }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = InvoiceEngine;
