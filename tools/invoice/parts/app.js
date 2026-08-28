/* =====================================================================
   APPLICATION
   ---------------------------------------------------------------------
     Num        - numeric parsing / formatting / input behaviour
     Money      - exact IRR arithmetic (BigInt where precision matters)
     Jalali     - Gregorian -> Jalali date
     Catalog    - embedded product database (read-only reference data)
     Store      - invoice state + local autosave
     Packaging  - carton / pallet / square-metre engine
     OfflineRulesEngine / Assistant - offline advisory layer
     Validate   - blocking + advisory checks
     UI         - rendering and interaction
     Output     - print model + PDF delivery
   ===================================================================== */
(function () {
  'use strict';

  /* ==================================================================
     Num
     ================================================================== */
  var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹', AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  var Num = {
    normalize: function (s) {
      if (s === null || s === undefined) return '';
      s = String(s);
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s[i], k = FA_DIGITS.indexOf(ch);
        if (k >= 0) { out += k; continue; }
        k = AR_DIGITS.indexOf(ch);
        if (k >= 0) { out += k; continue; }
        if (ch === '٫' || ch === '،') { out += ch === '٫' ? '.' : ','; continue; }
        out += ch;
      }
      return out;
    },
    parse: function (s) {
      s = Num.normalize(s).replace(/[,\s٬]/g, '');
      if (s === '' || s === '-' || s === '.') return null;
      var v = Number(s);
      return isFinite(v) ? v : null;
    },
    group: function (v, dec) {
      if (v === null || v === undefined || v === '') return '';
      var n = Number(v);
      if (!isFinite(n)) return '';
      var neg = n < 0; n = Math.abs(n);
      var s = dec ? n.toFixed(dec) : String(Math.round(n));
      var parts = s.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return (neg ? '-' : '') + parts.join('.');
    },
    /* trims trailing zeros: 21.50 -> 21.5 , 21.00 -> 21 */
    pct: function (v, dec) {
      if (v === null || v === undefined || !isFinite(v)) return '0';
      var s = Number(v).toFixed(dec === undefined ? 2 : dec);
      if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s;
    },
    clean: function (s, allowDecimal) {
      s = Num.normalize(s).replace(/[^\d.\-]/g, '');
      if (!allowDecimal) s = s.replace(/[.\-]/g, '');
      else {
        var first = s.indexOf('.');
        if (first >= 0) s = s.slice(0, first + 1) + s.slice(first + 1).replace(/\./g, '');
      }
      return s;
    }
  };

  /* Caret-preserving formatted numeric input */
  function attachNumber(el, opt) {
    opt = opt || {};
    el.setAttribute('inputmode', opt.decimal ? 'decimal' : 'numeric');
    el.setAttribute('autocomplete', 'off');
    el.classList.add('num');
    function reformat() {
      var pos = el.selectionStart === null ? el.value.length : el.selectionStart;
      var before = el.value.slice(0, pos).replace(/[^\d]/g, '').length;
      var clean = Num.clean(el.value, opt.decimal);
      var out;
      if (opt.group === false) out = clean;
      else {
        var p = clean.split('.');
        p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        out = p.join('.');
      }
      if (out !== el.value) {
        el.value = out;
        var i = 0, seen = 0;
        while (i < out.length && seen < before) { if (out.charCodeAt(i) >= 48 && out.charCodeAt(i) <= 57) seen++; i++; }
        try { el.setSelectionRange(i, i); } catch (e) { /* ignore */ }
      }
    }
    el.addEventListener('input', function () {
      reformat();
      if (opt.onInput) opt.onInput(Num.parse(el.value));
    });
    el.addEventListener('blur', function () {
      reformat();
      if (opt.onChange) opt.onChange(Num.parse(el.value));
    });
    el.addEventListener('focus', function () { if (opt.selectAll) el.select(); });
    return {
      set: function (v) {
        el.value = (v === null || v === undefined || v === '') ? ''
          : (opt.group === false ? String(v) : Num.group(v, opt.decimal ? undefined : 0));
      }
    };
  }

  /* ==================================================================
     Money — exact rial arithmetic
     ================================================================== */
  var Money = {
    /* discount amount for a gross and a percentage, rounded to the rial */
    discount: function (gross, pct) {
      if (!gross || !pct) return 0;
      var scaled = BigInt(Math.round(pct * 1e6));
      var g = BigInt(Math.round(gross));
      var num = g * scaled;
      var half = num < 0n ? -50000000n : 50000000n;
      return Number((num + half) / 100000000n);
    },
    pctOf: function (gross, discountAmount) {
      if (!gross) return 0;
      return (discountAmount / gross) * 100;
    }
  };

  /* ==================================================================
     Jalali date
     ================================================================== */
  var Jalali = {
    fromGregorian: function (gy, gm, gd) {
      var gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
      var jy = gy <= 1600 ? 0 : 979;
      gy -= gy <= 1600 ? 621 : 1600;
      var gy2 = gm > 2 ? gy + 1 : gy;
      var days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
        Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
      jy += 33 * Math.floor(days / 12053); days %= 12053;
      jy += 4 * Math.floor(days / 1461); days %= 1461;
      if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
      var jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
      var jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
      return [jy, jm, jd];
    },
    today: function () {
      var d = new Date();
      var j = Jalali.fromGregorian(d.getFullYear(), d.getMonth() + 1, d.getDate());
      return j[0] + '.' + ('0' + j[1]).slice(-2) + '.' + ('0' + j[2]).slice(-2);
    }
  };

  /* ==================================================================
     Catalog — reference data, never mutated by an invoice
     ================================================================== */
  var Catalog = (function () {
    var items = PRODUCTS.map(function (p) {
      return {
        code: p.c, desc: p.d, price: p.p,
        /* what goes in the invoice's کد کالا cell; the three accessories on
           the Felex list carry no code, so nothing is printed for them */
        printCode: p.pc === undefined ? p.c : p.pc,
        unit: p.u || 'قالب',
        grout: !!p.g,
        perM2: p.m === undefined ? null : p.m,
        perCarton: p.k === undefined ? null : p.k,
        perPallet: p.l === undefined ? null : p.l,
        key: (p.c + ' ' + p.d).toLowerCase()
      };
    });
    var byCode = {};
    items.forEach(function (p) { byCode[p.code.toUpperCase()] = p; });
    function normalizeSearch(s) {
      return Num.normalize(String(s || '')).toLowerCase()
        .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').trim();
    }
    return {
      all: items,
      get: function (code) { return byCode[String(code || '').toUpperCase()] || null; },
      search: function (q) {
        q = normalizeSearch(q);
        if (!q) return items.slice(0, 200);
        var terms = q.split(/\s+/).filter(Boolean);
        var scored = [];
        items.forEach(function (p) {
          var hay = normalizeSearch(p.key);
          var ok = true, score = 0;
          for (var i = 0; i < terms.length; i++) {
            var at = hay.indexOf(terms[i]);
            if (at < 0) { ok = false; break; }
            score += at === 0 ? 0 : 1 + at / 100;
          }
          if (ok) scored.push({ p: p, s: score });
        });
        scored.sort(function (a, b) { return a.s - b.s; });
        return scored.map(function (x) { return x.p; });
      },
      unitFor: function (code) {
        var c = String(code || '').trim().toUpperCase();
        if (!c) return '';
        var known = byCode[c];
        if (known) return known.unit;
        if (c[0] === 'A') return 'قالب';
        if (c[0] === 'C' || c[0] === 'G' || c[0] === '-') return 'کیسه';
        if (c[0] === 'N') return 'لیتر';
        return 'قالب';
      },
      /* one bag of Felex grout powder covers about 5 m² (from the price list) */
      groutCoverage: 5
    };
  })();

  /* ==================================================================
     Store — invoice state
     ================================================================== */
  /* an exported invoice keeps its own autosave slot, so opening one never
     shows another invoice's leftovers (file:// shares one localStorage) */
  var EMBEDDED = (typeof window !== 'undefined' && window.__INVOICE_DATA__) || null;
  var DOC_ID = (EMBEDDED && (EMBEDDED.docId || (EMBEDDED.state && EMBEDDED.state.docId))) || 'main';
  var KEY = 'brickala.invoice.v2:' + DOC_ID;
  function newRow() {
    return {
      mode: 'empty', code: '', desc: '', unit: 'قالب', grout: false,
      refPrice: null, price: null,
      perM2: null, perCarton: null, perPallet: null,
      qtyMode: 'brick', area: null, qty: null,
      discPct: 0, finalExact: null, finalBase: null,
      dtMode: 'special', dtText: '',
      ackCarton: false, ackNegative: false,
      open: false
    };
  }
  function newState() {
    var rows = [newRow(), newRow(), newRow(), newRow(), newRow()];
    rows[0].open = true;          // first slot ready to fill straight away
    return {
      /* identity of this invoice, so repeated outputs update one record
         rather than piling up copies */
      docId: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      kind: 'normal', parentId: null, customerId: null,
      meta: { status: 'پیش نویس', date: Jalali.today(), preparedBy: '' },
      customer: { name: '', phone: '', province: '', postal: '', address: '', nationalId: '' },
      rows: rows
    };
  }
  var S = newState();
  var Store = {
    apply: function (st) {
      if (!st || !st.rows || st.rows.length !== 5) return false;
      var base = newState();
      S.docId = st.docId || base.docId;
      S.kind = st.kind || 'normal';
      S.parentId = st.parentId || null;
      S.customerId = st.customerId || null;
      S.meta = Object.assign(base.meta, st.meta || {});
      S.customer = Object.assign(base.customer, st.customer || {});
      S.rows = st.rows.map(function (r) { return Object.assign(newRow(), r); });
      return true;
    },
    /* what this browser last autosaved for this document, with its time */
    localCopy: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return null;
        var d = JSON.parse(raw);
        if (!d) return null;
        return d.state ? d : { savedAt: 0, state: d };     // pre-timestamp saves
      } catch (e) { return null; }
    },
    load: function () {
      var local = Store.localCopy();
      if (EMBEDDED && EMBEDDED.state) {
        // an edit made to this very file outranks the copy baked into it
        if (local && local.savedAt > (EMBEDDED.savedAt || 0) && Store.apply(local.state)) return true;
        if (Store.apply(EMBEDDED.state)) return true;
      }
      return !!(local && Store.apply(local.state));
    },
    save: function () {
      try {
        localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), state: S }));
      } catch (e) { /* storage unavailable */ }
    },
    reset: function () {
      S = newState();
      try { localStorage.removeItem(KEY); } catch (e) { }
    }
  };

  /* ==================================================================
     Packaging engine
     ================================================================== */
  var Packaging = {
    /* quantity in قالب for a requested area, rounded up to whole cartons */
    fromArea: function (area, perM2, perCarton) {
      if (!area || !perM2) return null;
      var raw = area * perM2;
      if (!perCarton) return { qty: Math.ceil(raw - 1e-9), raw: raw, cartons: null, exact: false };
      var cartons = Math.ceil(raw / perCarton - 1e-9);
      return { qty: cartons * perCarton, raw: raw, cartons: cartons, exact: true };
    },
    cartons: function (qty, perCarton) {
      if (!qty || !perCarton) return null;
      var full = Math.floor(qty / perCarton + 1e-9);
      var rem = qty - full * perCarton;
      return {
        full: full, rem: rem, complete: rem === 0,
        nextQty: (full + 1) * perCarton, addToNext: (full + 1) * perCarton - qty,
        prevQty: full * perCarton, removeToPrev: rem
      };
    },
    pallets: function (qty, perCarton, perPallet) {
      if (!qty || !perPallet) return null;
      var cpp = perCarton ? perPallet / perCarton : null;
      var full = Math.floor(qty / perPallet + 1e-9);
      var rem = qty - full * perPallet;
      var nextQty = (full + 1) * perPallet;
      // carton deltas are only meaningful while the quantity itself sits on a
      // whole number of cartons — otherwise the figures would not add up
      var aligned = !!perCarton && qty % perCarton === 0;
      return {
        cartonsPerPallet: cpp, full: full, rem: rem, complete: rem === 0,
        aligned: aligned,
        nextQty: nextQty, addToNext: nextQty - qty,
        addCartons: aligned ? (nextQty - qty) / perCarton : null,
        prevQty: full * perPallet, removeToPrev: rem,
        removeCartons: aligned ? rem / perCarton : null
      };
    },
    area: function (qty, perM2) {
      if (!qty || !perM2) return null;
      return qty / perM2;
    }
  };

  /* ==================================================================
     Calculation
     ================================================================== */
  var Calc = {
    isActive: function (r) {
      return r.mode !== 'empty' && !!(r.code || r.desc || r.qty || r.price);
    },
    /* a grout row: flagged by the catalog, or a manual row that says so */
    isGrout: function (r) {
      if (r.grout) return true;
      return !r.perM2 && /بندکشی/.test(r.desc || '');
    },
    /* total brickwork area on the invoice — drives the grout suggestion */
    brickArea: function () {
      var a = 0;
      S.rows.forEach(function (r) {
        if (!Calc.isActive(r) || Calc.isGrout(r)) return;
        if (r.perM2 && r.qty) a += r.qty / r.perM2;
      });
      return a;
    },
    isComplete: function (r) {
      return Calc.isActive(r) && !!(r.code || r.desc) && r.qty > 0 && r.price !== null && r.price >= 0;
    },
    row: function (r) {
      var qty = r.qty || 0, price = r.price || 0;
      var gross = Math.round(qty * price);
      var final, pct, disc;
      if (r.finalExact !== null && r.finalBase === gross) {
        final = r.finalExact;
        disc = gross - final;
        pct = Money.pctOf(gross, disc);
      } else {
        pct = r.discPct || 0;
        disc = Money.discount(gross, pct);
        final = gross - disc;
      }
      return {
        gross: gross, discount: disc, final: final, pct: pct,
        /* unit price actually charged once the row discount is applied */
        netUnit: qty ? final / qty : null
      };
    },
    totals: function () {
      var g = 0, d = 0, f = 0;
      S.rows.forEach(function (r) {
        if (!Calc.isActive(r)) return;
        var c = Calc.row(r);
        g += c.gross; d += c.discount; f += c.final;
      });
      return { gross: g, discount: d, payable: f };
    }
  };

  /* ==================================================================
     Offline rules engine (the "smart assistant")
     ------------------------------------------------------------------
     Deterministic, fully offline. It only ever *suggests*: every action
     is applied by the user, never automatically.
     A future ExternalAIProvider can be registered alongside it; the
     offline engine remains the baseline and works with no network.
     ================================================================== */
  var OfflineRulesEngine = {
    id: 'offline-rules',
    analyze: function (r, ctx) {
      var out = [], hasWarn = false;
      var pc = r.perCarton, pm = r.perM2, pp = r.perPallet, qty = r.qty;
      ctx = ctx || { brickArea: 0 };

      if (!Calc.isActive(r)) {
        return { messages: [{ level: 'info', text: 'کالایی برای این ردیف انتخاب نشده است.' }], warn: false };
      }

      /* ---- grout powder: sold by the bag, ~5 m² of brickwork per bag ---- */
      if (Calc.isGrout(r)) {
        var cover = Catalog.groutCoverage;
        out.push({
          level: 'info',
          text: 'طبق لیست قیمت فلکس، هر کیسه پودر بندکشی برای حدود <n>' + cover + '</n> متر مربع کافی است.'
        });
        if (ctx.brickArea > 0) {
          var need = Math.ceil(ctx.brickArea / cover - 1e-9);
          out.push({
            level: 'tip',
            text: 'متراژ کل آجرهای این فاکتور <n>' + Num.pct(ctx.brickArea, 2) + '</n> متر مربع است؛ ' +
              'بنابراین حدود <n>' + Num.group(need) + '</n> کیسه پودر بندکشی لازم می‌شود.',
            actions: (qty !== need) ? [{ label: 'تنظیم مقدار روی ' + Num.group(need) + ' کیسه', act: 'setQty', qty: need }] : null
          });
          if (qty && qty !== need) {
            var diff = qty - need;
            out.push({
              level: diff < 0 ? 'warn' : 'info',
              text: diff < 0
                ? 'مقدار فعلی <n>' + Num.group(-diff) + '</n> کیسه کمتر از نیاز تقریبی است.'
                : 'مقدار فعلی <n>' + Num.group(diff) + '</n> کیسه بیشتر از نیاز تقریبی است.'
            });
            if (diff < 0) hasWarn = false;   // advisory only, never blocks issuing
          }
        } else {
          out.push({
            level: 'info',
            text: 'هنوز آجری در فاکتور ثبت نشده است؛ با ثبت آجرها، تعداد کیسهٔ لازم به‌صورت خودکار پیشنهاد می‌شود.'
          });
        }
        if (r.refPrice && r.price !== null && r.price !== r.refPrice) {
          out.push(OfflineRulesEngine.priceNote(r));
        }
        var gc = Calc.row(r);
        if (gc.gross > 0 && gc.final > gc.gross) {
          hasWarn = true;
          out.push(OfflineRulesEngine.negativeNote());
        }
        return { messages: out, warn: hasWarn };
      }

      /* --- area-based order explanation --- */
      if (r.qtyMode === 'area' && r.area) {
        if (!pm) {
          out.push({ level: 'warn', text: 'برای محاسبه بر اساس متر مربع، «تعداد در متر مربع» لازم است و برای این کالا مشخص نشده است.' });
          hasWarn = true;
        } else {
          var raw = r.area * pm;
          var t = 'متراژ درخواستی <n>' + Num.pct(r.area, 2) + '</n> متر مربع؛ نیاز خام <n>' + Num.group(Math.ceil(raw)) + '</n> قالب';
          if (pc) {
            var cts = Math.ceil(raw / pc - 1e-9);
            t += ' که با گرد کردن به کارتن کامل می‌شود <n>' + Num.group(cts) + '</n> کارتن، برابر <n>' + Num.group(cts * pc) + '</n> قالب.';
            out.push({ level: 'ok', text: t });
            var eff = (cts * pc) / pm;
            var diff = eff - r.area;
            if (Math.abs(diff) >= 0.05) {
              out.push({
                level: 'info',
                text: 'متراژ واقعی پس از گرد کردن: <n>' + Num.pct(eff, 2) + '</n> متر مربع (<n>' +
                  (diff >= 0 ? '+' : '') + Num.pct(diff, 2) + '</n> متر مربع نسبت به درخواست).'
              });
            }
          } else {
            t += '. «تعداد در کارتن» مشخص نیست، بنابراین گرد کردن به کارتن انجام نشد.';
            out.push({ level: 'info', text: t });
          }
        }
      }

      if (!qty) {
        out.push({ level: 'info', text: 'مقدار را وارد کنید تا تحلیل بسته‌بندی انجام شود.' });
        return { messages: out, warn: hasWarn };
      }

      /* --- carton analysis --- */
      if (!pc) {
        out.push({ level: 'info', text: 'اطلاعات تعداد در کارتن برای این محصول مشخص نشده است.' });
      } else {
        var c = Packaging.cartons(qty, pc);
        if (c.complete) {
          out.push({
            level: 'ok',
            text: 'این مقدار دقیقاً <n>' + Num.group(c.full) + '</n> کارتن کامل است (<n>' + Num.group(pc) + '</n> قالب در هر کارتن).'
          });
        } else {
          hasWarn = true;
          out.push({
            level: 'warn',
            text: 'این تعداد کارتن کامل نیست: <n>' + Num.group(c.full) + '</n> کارتن کامل و <n>' + Num.group(c.rem) +
              '</n> قالب اضافه. با افزودن <n>' + Num.group(c.addToNext) + '</n> قالب، کارتن بعدی کامل می‌شود (مجموع <n>' +
              Num.group(c.nextQty) + '</n> قالب). نزدیک‌ترین مقدار کامل پایین‌تر <n>' + Num.group(c.prevQty) + '</n> قالب است.',
            actions: [
              { label: 'افزایش به ' + Num.group(c.nextQty), act: 'setQty', qty: c.nextQty },
              c.prevQty > 0 ? { label: 'کاهش به ' + Num.group(c.prevQty), act: 'setQty', qty: c.prevQty } : null,
              { label: 'تأیید همین مقدار', act: 'ackCarton', kind: 'ghost' }
            ].filter(Boolean)
          });
        }
      }

      /* --- approximate area --- */
      if (pm) {
        out.push({
          level: 'info',
          text: 'متراژ تقریبی: <n>' + Num.pct(Packaging.area(qty, pm), 2) + '</n> متر مربع.'
        });
      }

      /* --- pallet analysis --- */
      if (pp) {
        var p = Packaging.pallets(qty, pc, pp);
        if (p.complete) {
          out.push({
            level: 'ok',
            text: 'سفارش دقیقاً <n>' + Num.group(p.full) + '</n> پالت کامل است (<n>' + Num.group(pp) + '</n> قالب در هر پالت).'
          });
        } else {
          var txt = 'وضعیت پالت: <n>' + Num.group(p.full) + '</n> پالت کامل و <n>' + Num.group(p.rem) + '</n> قالب باقی‌مانده';
          if (p.aligned) {
            txt += '. با افزودن <n>' + Num.group(p.addCartons) + '</n> کارتن / <n>' + Num.group(p.addToNext) +
              '</n> قالب، سفارش دقیقاً <n>' + Num.group(p.full + 1) + '</n> پالت کامل می‌شود';
            if (p.full >= 1) {
              txt += '؛ یا با کاهش <n>' + Num.group(p.removeCartons) + '</n> کارتن / <n>' + Num.group(p.rem) +
                '</n> قالب به <n>' + Num.group(p.full) + '</n> پالت کامل می‌رسد';
            }
            txt += '.';
          } else if (pc) {
            txt += '. برای پیشنهاد دقیق پالت، ابتدا مقدار را به کارتن کامل برسانید.';
          } else {
            txt += '. بدون اطلاعات کارتن، پیشنهاد فقط بر حسب قالب است: با افزودن <n>' +
              Num.group(p.addToNext) + '</n> قالب به <n>' + Num.group(p.full + 1) + '</n> پالت کامل می‌رسید.';
          }
          var acts = [{ label: 'رساندن به ' + Num.group(p.nextQty), act: 'setQty', qty: p.nextQty }];
          if (p.prevQty > 0) acts.push({ label: 'کاهش به ' + Num.group(p.prevQty), act: 'setQty', qty: p.prevQty });
          var near = p.addToNext / pp;
          out.push({ level: near <= 0.25 ? 'tip' : 'info', text: txt, actions: acts });
        }
      }

      /* --- pricing sanity --- */
      if (r.refPrice && r.price !== null && r.price !== r.refPrice) {
        out.push(OfflineRulesEngine.priceNote(r));
      }
      var cc = Calc.row(r);
      if (cc.gross > 0 && cc.final > cc.gross) {
        hasWarn = true;
        out.push(OfflineRulesEngine.negativeNote());
      }
      return { messages: out, warn: hasWarn };
    },
    priceNote: function (r) {
      var dp = ((r.price - r.refPrice) / r.refPrice) * 100;
      return {
        level: 'info',
        text: 'بهای واحد این فاکتور <n>' + Num.pct(Math.abs(dp), 1) + '٪</n> ' +
          (dp > 0 ? 'بالاتر' : 'پایین‌تر') + ' از قیمت مرجع (<n>' + Num.group(r.refPrice) + '</n> ریال) است.'
      };
    },
    negativeNote: function () {
      return {
        level: 'warn',
        text: 'مبلغ کل بیشتر از مبلغ ناخالص است؛ این یعنی افزایش قیمت به جای تخفیف. در صورت عمدی بودن، تأیید کنید.',
        actions: [{ label: 'تأیید افزایش قیمت', act: 'ackNegative', kind: 'ghost' }]
      };
    }
  };

  /* Provider registry — offline engine is the only v1 provider.
     An ExternalAIProvider could be added here later without touching
     the UI; nothing performs a network request in this version. */
  var Assistant = {
    providers: [OfflineRulesEngine],
    external: null,          // reserved for a future ExternalAIProvider
    analyze: function (row, ctx) {
      var res = { messages: [], warn: false };
      this.providers.forEach(function (p) {
        var r = p.analyze(row, ctx);
        res.messages = res.messages.concat(r.messages);
        res.warn = res.warn || r.warn;
      });
      return res;
    }
  };

  /* ==================================================================
     Validation
     ================================================================== */
  var Validate = {
    run: function () {
      var blocking = [], advisory = [];
      if (!S.customer.name.trim()) blocking.push('نام خریدار وارد نشده است.');
      if (!S.meta.date.trim()) blocking.push('تاریخ صدور وارد نشده است.');
      if (!S.customer.phone.trim()) advisory.push('شماره تلفن خریدار وارد نشده است.');

      var any = false;
      S.rows.forEach(function (r, i) {
        if (!Calc.isActive(r)) return;
        any = true;
        var n = 'ردیف ' + (i + 1) + ': ';
        if (!r.code && !r.desc) blocking.push(n + 'کد یا شرح کالا لازم است.');
        if (!r.qty || r.qty <= 0) blocking.push(n + 'مقدار معتبر وارد نشده است.');
        else if (r.qty !== Math.round(r.qty)) blocking.push(n + 'مقدار باید عدد صحیح باشد.');
        if (r.price === null || r.price < 0) blocking.push(n + 'بهای واحد معتبر وارد نشده است.');
        if (!r.unit) advisory.push(n + 'واحد وارد نشده است.');
        var c = Calc.row(r);
        if (r.perCarton && r.qty && (r.qty % r.perCarton !== 0) && !r.ackCarton) {
          blocking.push(n + 'مقدار کارتن کامل نیست و هشدار تأیید نشده است.');
        }
        if (c.gross > 0 && c.final > c.gross && !r.ackNegative) {
          blocking.push(n + 'مبلغ کل بیشتر از مبلغ ناخالص است و تأیید نشده است.');
        }
        if (c.pct > 100) blocking.push(n + 'درصد تخفیف بیش از ۱۰۰ است.');
        if (r.dtMode === 'custom' && !r.dtText.trim()) advisory.push(n + 'متن ستون تخفیف نقدی خالی است.');
        if (r.dtMode === 'custom' && r.dtText.trim().length > 18) {
          advisory.push(n + 'متن ستون تخفیف نقدی بلند است و در PDF کوچک‌تر چاپ می‌شود.');
        }
        if ((r.desc || '').length > 34) advisory.push(n + 'شرح کالا بلند است و در PDF کوچک‌تر چاپ می‌شود.');
      });
      if (!any) blocking.push('حداقل یک ردیف کالا باید تکمیل شود.');
      return { blocking: blocking, advisory: advisory, ok: blocking.length === 0 };
    }
  };

  /* ==================================================================
     Output — print model + PDF
     ================================================================== */
  var Output = {
    discountText: function (r, c) {
      switch (r.dtMode) {
        case 'special': return 'تخفیفات ویژه';
        case 'percent': return c.pct ? Num.pct(c.pct, 2) + '%' : '0%';
        case 'custom': return r.dtText || '';
        default: return '';
      }
    },
    model: function () {
      var rows = S.rows.map(function (r) {
        if (!Calc.isActive(r)) return { used: false };
        var c = Calc.row(r);
        return {
          used: true,
          code: r.code || '',
          desc: r.desc || '',
          unit: r.unit || '',
          qty: r.qty || 0,
          unitPrice: r.price || 0,
          gross: c.gross,
          final: c.final,
          discountText: Output.discountText(r, c)
        };
      });
      var t = Calc.totals();
      return {
        meta: { status: S.meta.status, date: S.meta.date, preparedBy: S.meta.preparedBy },
        customer: {
          name: S.customer.name, phone: S.customer.phone, province: S.customer.province,
          postal: S.customer.postal, address: S.customer.address, nationalId: S.customer.nationalId
        },
        rows: rows,
        totals: { gross: t.gross, discount: t.discount, payable: t.payable }
      };
    },
    /* «نام خریدار + تاریخ ۶ رقمی»  →  «آقای احمد 050604» */
    fileBase: function () {
      var name = (S.customer.name || '').replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ').trim();
      var d = Num.normalize(S.meta.date).replace(/[^0-9]/g, '');
      var six = d.length >= 8 ? d.slice(2, 8) : d.slice(-6);
      var base = ((name ? name + ' ' : '') + six).trim();
      return base || 'pish-faktor';
    },
    pdfBlob: function () {
      return new Blob([InvoiceEngine.render(Output.model())], { type: 'application/pdf' });
    },
    download: function (blob, name) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); }, 0);
      setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
      return url;
    },
    generate: function () {
      var url = Output.download(Output.pdfBlob(), Output.fileBase() + '.pdf');
      UI.toast('فایل PDF ساخته شد.', { label: 'باز کردن', href: url });
    },
    /* printing goes through the generated PDF itself, so paper matches the file */
    print: function () {
      var url = URL.createObjectURL(Output.pdfBlob());
      var settled = false;
      /* if the browser has no inline PDF viewer (or blocks printing from a
         blob frame) the user still gets the file, one tap away */
      function fallback() {
        if (settled) return;
        settled = true;
        UI.toast('برای چاپ، فایل را باز کنید و از منوی مرورگر «چاپ» را بزنید.',
          { label: 'باز کردن فایل', href: url });
      }
      var old = document.getElementById('printFrame');
      if (old) old.parentNode.removeChild(old);
      var f = document.createElement('iframe');
      f.id = 'printFrame';
      f.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;border:0;left:-9999px;bottom:0';
      f.onload = function () {
        setTimeout(function () {
          try {
            f.contentWindow.focus();
            f.contentWindow.print();
            settled = true;
          } catch (e) { fallback(); }
        }, 250);
      };
      f.onerror = fallback;
      f.src = url;
      document.body.appendChild(f);
      setTimeout(fallback, 4000);
      setTimeout(function () { URL.revokeObjectURL(url); }, 180000);
    },
    /* a copy of this very application with the invoice baked in, so the file
       can be reopened later and edited without retyping anything */
    exportHtml: function () {
      var clone = document.documentElement.cloneNode(true);
      ['mainCol', 'asideCol', 'modalBody', 'modalFoot', 'toast'].forEach(function (id) {
        var e = clone.querySelector('#' + id);
        if (e) { e.innerHTML = ''; e.classList.remove('on'); }
      });
      ['modal', 'scrim'].forEach(function (id) {
        var e = clone.querySelector('#' + id);
        if (e) e.classList.remove('on');
      });
      var mt = clone.querySelector('#modalTitle'); if (mt) mt.textContent = '';
      var mb = clone.querySelector('#mbTotal'); if (mb) mb.textContent = '0';
      var pf = clone.querySelector('#printFrame'); if (pf) pf.parentNode.removeChild(pf);
      var prev = clone.querySelector('#invoice-data');
      if (prev) prev.parentNode.removeChild(prev);

      var payload = JSON.stringify({ docId: S.docId, savedAt: Date.now(), state: S })
        .replace(/</g, '\\u003c')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
      var sc = document.createElement('script');
      sc.id = 'invoice-data';
      sc.textContent = 'window.__INVOICE_DATA__=' + payload + ';';
      var head = clone.querySelector('head');
      head.insertBefore(sc, head.firstChild);
      var ttl = clone.querySelector('title');
      if (ttl) ttl.textContent = 'پیش فاکتور' + (S.customer.name ? ' — ' + S.customer.name : '');

      var blob = new Blob(['<!DOCTYPE html>\n' + clone.outerHTML], { type: 'text/html;charset=utf-8' });
      Output.download(blob, Output.fileBase() + '.html');
      UI.toast('فایل HTML ذخیره شد؛ با باز کردن آن، همین فاکتور قابل ویرایش است.');
    }  };

  /* ==================================================================
     UI
     ================================================================== */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var ICON = {
    check: '<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8.5 3 3 7-7"/></svg>',
    alert: '<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v4"/><path d="M8 11.5h.01"/><circle cx="8" cy="8" r="6.4"/></svg>',
    info: '<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7.5v4"/><path d="M8 4.6h.01"/><circle cx="8" cy="8" r="6.4"/></svg>',
    spark: '<svg class="spark" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.2 9.3 5 13 6.3 9.3 7.6 8 11.4 6.7 7.6 3 6.3 6.7 5 8 1.2Z"/><path d="M12.8 10.2l.55 1.6 1.6.55-1.6.55-.55 1.6-.55-1.6-1.6-.55 1.6-.55.55-1.6Z" opacity=".55"/></svg>',
    chev: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg>',
    reset: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8a5 5 0 1 1-1.6-3.7"/><path d="M13 2.5V5h-2.5"/></svg>',
    printer: '<svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8V3h8v5"/><path d="M6 14H4.5A1.5 1.5 0 0 1 3 12.5v-3A1.5 1.5 0 0 1 4.5 8h11A1.5 1.5 0 0 1 17 9.5v3a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M6 12h8v5H6z"/></svg>',
    save: '<svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h9l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M7 4v4h6"/><path d="M6.5 17v-4h7v4"/></svg>',
    pencil: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11.4 2.3 13.7 4.6 5.6 12.7 2.6 13.4l.7-3Z"/><path d="M10.2 3.5 12.5 5.8"/></svg>'
  };

/* Which sections the user folded away, kept out of the invoice model so
   the saved document never carries interface state. */
var FOLD = (function () {
  var K = 'brickala.fold', v = {};
  try { v = JSON.parse(localStorage.getItem(K) || '{}') || {}; } catch (e) { v = {}; }
  return {
    /* a section may prefer to start shut; a stored choice always wins */
    get: function (k, dflt) { return (k in v) ? !!v[k] : !!dflt; },
    set: function (k, on) {
      v[k] = !!on;
      try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) { /* private mode */ }
    }
  };
})();

  var UI = {
    build: function () {
      var main = document.getElementById('mainCol');
      var aside = document.getElementById('asideCol');
      main.innerHTML = '';
      aside.innerHTML = '';
      main.appendChild(UI.metaCard());
      main.appendChild(UI.customerCard());
      main.appendChild(UI.itemsHeader());
      UI.rowNodes = [];
      for (var i = 0; i < 5; i++) {
        var n = UI.rowCard(i);
        UI.rowNodes.push(n);
        main.appendChild(n.el);
      }
      aside.appendChild(UI.summaryCard());
      main.appendChild(el('div', 'foot',
        'تمامی حقوق این سایت متعلق به بریک کالا می‌باشد.'));
      UI.refreshAll();
    },

    /* ---------------- meta ---------------- */
    metaCard: function () {
      var c = el('div', 'card');
      c.appendChild(el('div', 'card-h',
        '<div class="sect-num">1</div><h2>مشخصات فاکتور</h2>' +
        '<div style="flex:1"></div><div class="hint">تاریخ شمسی</div>'));
      var b = el('div', 'card-b');
      var g = el('div', 'grid g3');
      g.appendChild(UI.field('وضعیت', function (f) {
        var i = el('input', 'inp'); i.type = 'text'; i.value = S.meta.status;
        i.placeholder = 'پیش نویس';
        i.addEventListener('input', function () { S.meta.status = i.value; UI.touch(); });
        return i;
      }));
      g.appendChild(UI.field('تاریخ صدور', function () {
        var wrapEl = el('div');
        wrapEl.style.cssText = 'display:flex;gap:6px';
        var i = el('input', 'inp num'); i.type = 'text'; i.value = S.meta.date;
        i.placeholder = '1405.01.01'; i.setAttribute('inputmode', 'numeric');
        i.addEventListener('input', function () { S.meta.date = Num.normalize(i.value); UI.touch(); });
        var btn = el('button', 'btn sm', 'امروز'); btn.type = 'button';
        btn.addEventListener('click', function () {
          S.meta.date = Jalali.today(); i.value = S.meta.date; UI.touch();
        });
        wrapEl.appendChild(i); wrapEl.appendChild(btn);
        return wrapEl;
      }));
      g.appendChild(UI.field('تنظیم کننده <span class="opt">(اختیاری)</span>', function () {
        var i = el('input', 'inp'); i.type = 'text'; i.value = S.meta.preparedBy;
        i.placeholder = 'نام کارشناس';
        i.addEventListener('input', function () { S.meta.preparedBy = i.value; UI.touch(); });
        return i;
      }));
      b.appendChild(g);
      c.appendChild(b);
      /* Status and date are right by default and rarely touched, so the
         section starts shut and says what it holds in one line. */
      return UI.foldable(c, 'meta', function () {
        var bits = [S.meta.status || 'پیش نویس', S.meta.date || '—'];
        if (S.meta.preparedBy) bits.push(S.meta.preparedBy);
        return bits.join('  ·  ');
      }, true);
    },

    /* ---------------- customer ---------------- */
    customerCard: function () {
      var c = el('div', 'card');
      c.appendChild(el('div', 'card-h',
        '<div class="sect-num">2</div><h2>مشخصات خریدار</h2>'));
      var b = el('div', 'card-b');
      var g = el('div', 'grid g2');
      function txt(label, key, opt) {
        opt = opt || {};
        return UI.field(label, function (f) {
          var i = el('input', 'inp'); i.type = 'text'; i.value = S.customer[key];
          if (opt.numeric) { i.setAttribute('inputmode', 'numeric'); i.classList.add('num'); }
          if (opt.ph) i.placeholder = opt.ph;
          i.addEventListener('input', function () {
            S.customer[key] = opt.numeric ? Num.normalize(i.value) : i.value;
            UI.touch();
          });
          UI.bind('cust.' + key, function () { if (document.activeElement !== i) i.value = S.customer[key]; });
          return i;
        }, opt.span);
      }
      /* A name and a telephone are all most invoices need. The rest is
         behind one button, so the common case is two fields and the
         uncommon one is a single click away. */
      g.appendChild(txt('نام خریدار', 'name', { ph: 'مثال: آقای یزدانی' }));
      g.appendChild(txt('شماره تلفن', 'phone', { numeric: true, ph: '09xxxxxxxxx' }));
      b.appendChild(g);

      var more = el('div', 'more');
      var g2 = el('div', 'grid g2');
      g2.appendChild(txt('نام استان / شهر', 'province', { ph: 'مثال: قم' }));
      g2.appendChild(txt('کد پستی', 'postal', { numeric: true }));
      g2.appendChild(txt('کد ملی', 'nationalId', { numeric: true }));
      g2.appendChild(txt('نشانی', 'address', { span: true }));
      more.appendChild(g2);

      var moreBtn = el('button', 'morebtn'); moreBtn.type = 'button';
      moreBtn.innerHTML = '<span>بیشتر</span>' + ICON.chev;
      function paintMore(on) {
        more.classList.toggle('on', on);
        moreBtn.classList.toggle('on', on);
        moreBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
        moreBtn.querySelector('span').textContent = on ? 'کمتر' : 'بیشتر';
      }
      moreBtn.addEventListener('click', function () {
        var on = !more.classList.contains('on');
        FOLD.set('custMore', on);
        paintMore(on);
      });
      paintMore(FOLD.get('custMore', false));
      b.appendChild(moreBtn);
      b.appendChild(more);
      c.appendChild(b);
      return UI.foldable(c, 'cust', function () {
        if (!S.customer.name && !S.customer.phone) return 'تکمیل نشده';
        var bits = [S.customer.name || 'بدون نام'];
        if (S.customer.phone) bits.push(S.customer.phone);
        if (S.customer.province) bits.push(S.customer.province);
        return bits.join('  ·  ');
      });
    },

    itemsHeader: function () {
      var d = el('div');
      d.style.cssText = 'display:flex;align-items:center;gap:10px;padding:4px 4px 0';
      d.innerHTML = '<div class="sect-num">3</div>' +
        '<h2 style="margin:0;font-size:14px;font-weight:700">اقلام فاکتور</h2>' +
        '<div style="flex:1"></div>' +
        '<div class="sect-hint" style="font-size:11.5px;color:var(--muted)">پنج ردیف ثابت — ردیف‌های خالی در PDF حفظ می‌شوند</div>';
      return d;
    },

    field: function (label, make, span) {
      var f = el('div', 'f' + (span ? ' span2' : ''));
      f.appendChild(el('label', null, label));
      f.appendChild(make(f));
      var m = el('div', 'fmsg'); f.appendChild(m);
      return f;
    },

    /* small binding registry so inputs can be refreshed after programmatic changes */
    binds: {},
    bind: function (key, fn) { (UI.binds[key] = UI.binds[key] || []).push(fn); },
    fire: function (key) { (UI.binds[key] || []).forEach(function (f) { f(); }); },

    touch: function () { UI.refreshAll(); Store.save(); },

    /* ================= row card ================= */
    rowCard: function (idx) {
      var r = S.rows[idx];
      var card = el('div', 'rowcard');
      var api = { el: card };

      /* --- head --- */
      var head = el('button', 'rowhead'); head.type = 'button';
      head.setAttribute('aria-expanded', 'false');
      var badge = el('div', 'rowbadge', String(idx + 1));
      var title = el('div', 'rowtitle');
      var tName = el('b', 'empty', 'ردیف خالی');
      var tSub = el('small', null, '');
      title.appendChild(tName); title.appendChild(tSub);
      var sum = el('div', 'rowsum');
      var sumB = el('b', null, ''); var sumS = el('small', null, '');
      sum.appendChild(sumB); sum.appendChild(sumS);
      var chev = el('div', 'chev', ICON.chev);
      head.appendChild(badge); head.appendChild(title); head.appendChild(sum); head.appendChild(chev);
      card.appendChild(head);
      head.addEventListener('click', function () {
        r.open = !r.open;
        card.classList.toggle('open', r.open);
        head.setAttribute('aria-expanded', r.open ? 'true' : 'false');
      });

      /* --- body --- */
      var body = el('div', 'rowbody');
      card.appendChild(body);

      /* product picker */
      var s0 = el('div', 'rowsection');
      var pickWrap = el('div', 'f');
      pickWrap.appendChild(el('label', null, 'کالا'));
      var combo = UI.combo(idx, r);
      pickWrap.appendChild(combo.el);
      s0.appendChild(pickWrap);
      body.appendChild(s0);

      /* product facts, in one box */
      var s1 = el('div', 'rowsection');
      var inCode = el('input', 'inp ltr'); inCode.type = 'text'; inCode.placeholder = 'AB51301';
      var inDesc = el('input', 'inp'); inDesc.type = 'text'; inDesc.placeholder = 'شرح کالا';
      var inUnit = el('input', 'inp'); inUnit.type = 'text'; inUnit.placeholder = 'قالب';
      var inM2 = el('input', 'inp'); inM2.type = 'text'; inM2.placeholder = '—';
      var inCt = el('input', 'inp'); inCt.type = 'text'; inCt.placeholder = '—';
      var inPl = el('input', 'inp'); inPl.type = 'text'; inPl.placeholder = '—';
      var specEl = UI.specBox([
        ['کد کالا', inCode], ['شرح کالا', inDesc, 'left'], ['واحد', inUnit, 'left'],
        ['تعداد در متر مربع', inM2], ['تعداد در کارتن', inCt], ['تعداد در پالت', inPl]
      ]);
      s1.appendChild(specEl);

      /* price */
      var g2 = el('div', 'grid g2'); g2.style.marginTop = '10px';
      var inPrice = el('input', 'inp'); inPrice.type = 'text'; inPrice.placeholder = '0';
      /* the reference price rides in the label row so this field keeps the
         same height as the quantity field beside it and the two stay aligned */
      var priceField = el('div', 'f');
      var pLab = el('label');
      pLab.innerHTML = '<span>بهای واحد (ریال)</span>';
      var refChip = el('div', 'chip soft'); refChip.style.marginInlineStart = 'auto';
      refChip.classList.add('hidden');
      pLab.appendChild(refChip);
      priceField.appendChild(pLab); priceField.appendChild(inPrice);
      g2.appendChild(priceField);

      /* quantity */
      var qtyField = el('div', 'f');
      var qLab = el('label', null, '');
      qLab.innerHTML = '<span>مقدار</span>';
      var segWrap = el('div', 'seg'); segWrap.style.marginInlineStart = 'auto';
      var segArea = el('button', null, 'متر مربع'); segArea.type = 'button';
      var segBrick = el('button', null, 'قالب'); segBrick.type = 'button';   // label follows the unit
      segWrap.appendChild(segArea); segWrap.appendChild(segBrick);
      qLab.appendChild(segWrap);
      qtyField.appendChild(qLab);
      var inQty = el('input', 'inp'); inQty.type = 'text'; inQty.placeholder = '0';
      qtyField.appendChild(inQty);
      var qtyNote = el('div', 'lbl'); qtyNote.style.cssText = 'font-size:11px;color:var(--muted);font-weight:500';
      qtyField.appendChild(qtyNote);
      g2.appendChild(qtyField);
      s1.appendChild(g2);

      body.appendChild(s1);

      /* discount section */
      var s2 = el('div', 'rowsection');
      var disc = el('div', 'disc');
      var dTop = el('div', 'disc-top');
      var dLab = el('div', 'lbl', 'تخفیف'); dLab.style.cssText = 'flex:none;min-width:34px';
      var rng = el('input', 'rng'); rng.type = 'range'; rng.min = '0'; rng.max = '100'; rng.step = '0.5';
      var dVal = el('div', 'disc-val');
      var inPct = el('input', null); inPct.type = 'text'; inPct.setAttribute('inputmode', 'decimal');
      dVal.appendChild(inPct); dVal.appendChild(el('span', null, '٪'));
      dTop.appendChild(dLab); dTop.appendChild(rng); dTop.appendChild(dVal);
      disc.appendChild(dTop);
      var quick = el('div', 'disc-quick');
      [0, 5, 10, 15, 20, 23, 25, 30].forEach(function (v) {
        var b = el('button', null, v + '٪'); b.type = 'button';
        b.addEventListener('click', function () { setPct(v); });
        quick.appendChild(b);
      });
      disc.appendChild(quick);
      s2.appendChild(disc);

      var g3 = el('div', 'grid g3'); g3.style.marginTop = '12px';
      var inGross = el('input', 'inp'); inGross.type = 'text'; inGross.disabled = true;
      g3.appendChild(UI.wrapField('مبلغ (ناخالص)', inGross));
      var inNet = el('input', 'inp'); inNet.type = 'text';
      /* The unit belongs in the label, not in a chip beside it: one line
         that reads straight through instead of a heading and a footnote. */
      var netField = UI.wrapField('<span class="net-lbl">بهای واحد پس از تخفیف</span>', inNet);
      var netUnitTag = netField.querySelector('.net-lbl');
      g3.appendChild(netField);
      var inFinal = el('input', 'inp'); inFinal.type = 'text';
      var finalField = UI.wrapField('مبلغ کل (پس از تخفیف)', inFinal);
      g3.appendChild(finalField);
      s2.appendChild(g3);

      /* The three money fields open only when asked; see UI.guard. */
      UI.guard(inPrice, priceField);
      UI.guard(inNet, netField);
      UI.guard(inFinal, finalField);

      var g4 = el('div', 'grid g2'); g4.style.marginTop = '12px';
      var selDt = el('select', 'inp');
      [['special', 'تخفیفات ویژه'], ['percent', 'درصد تخفیف'], ['empty', 'خالی'], ['custom', 'متن انتخابی']]
        .forEach(function (o) {
          var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1];
          selDt.appendChild(op);
        });
      g4.appendChild(UI.wrapField('متن ستون «تخفیف نقدی» در PDF', selDt));
      var inDt = el('input', 'inp'); inDt.type = 'text'; inDt.placeholder = 'متن دلخواه';
      var dtField = UI.wrapField('متن دلخواه', inDt);
      g4.appendChild(dtField);
      s2.appendChild(g4);
      var dtPreview = el('div', 'lbl'); dtPreview.style.cssText = 'font-size:11px;color:var(--muted);font-weight:500;margin-top:8px';
      s2.appendChild(dtPreview);
      body.appendChild(s2);

      /* assistant */
      var asst = el('div', 'asst');
      asst.innerHTML = '<div class="asst-h">' + ICON.spark +
        '<b>دستیار هوشمند</b><span class="tag">آفلاین</span></div><div class="asst-b"></div>';
      var asstBody = asst.querySelector('.asst-b');
      body.appendChild(asst);

      /* clear row */
      var clearWrap = el('div');
      clearWrap.style.cssText = 'display:flex;justify-content:flex-start;margin-top:14px';
      var btnClear = el('button', 'btn sm ghost', 'پاک کردن این ردیف'); btnClear.type = 'button';
      btnClear.addEventListener('click', function () {
        var open = r.open;
        S.rows[idx] = newRow();
        S.rows[idx].open = open;
        r = S.rows[idx];
        api.sync(); UI.touch();
      });
      clearWrap.appendChild(btnClear);
      body.appendChild(clearWrap);

      /* ---------- wiring ---------- */
      var priceCtl = attachNumber(inPrice, {
        onInput: function (v) { r.price = v === null ? null : Math.round(v); recompute(); },
        selectAll: true
      });
      var qtyCtl = attachNumber(inQty, {
        decimal: true,
        onInput: function (v) {
          if (r.qtyMode === 'area') { r.area = v; applyArea(); }
          else { r.qty = v === null ? null : Math.round(v); r.ackCarton = false; }
          recompute();
        },
        selectAll: true
      });
      var m2Ctl = attachNumber(inM2, { onInput: function (v) { r.perM2 = v; if (r.qtyMode === 'area') applyArea(); recompute(); } });
      var ctCtl = attachNumber(inCt, { onInput: function (v) { r.perCarton = v; r.ackCarton = false; if (r.qtyMode === 'area') applyArea(); recompute(); } });
      var plCtl = attachNumber(inPl, { onInput: function (v) { r.perPallet = v; recompute(); } });
      var netCtl = attachNumber(inNet, {
        onInput: function (v) {
          var gross = Math.round((r.qty || 0) * (r.price || 0));
          if (v === null || !r.qty) { r.finalExact = null; r.finalBase = null; }
          else {
            r.finalExact = Math.round(v * r.qty); r.finalBase = gross;
            r.discPct = gross ? Money.pctOf(gross, gross - r.finalExact) : 0;
            if (r.finalExact <= gross) r.ackNegative = false;
          }
          recompute({ keepNet: true });
        },
        selectAll: true
      });
      var finalCtl = attachNumber(inFinal, {
        onInput: function (v) {
          var c = Calc.row(r);
          var gross = Math.round((r.qty || 0) * (r.price || 0));
          if (v === null) { r.finalExact = null; r.finalBase = null; }
          else {
            r.finalExact = Math.round(v); r.finalBase = gross;
            r.discPct = gross ? Money.pctOf(gross, gross - r.finalExact) : 0;
            if (r.finalExact <= gross) r.ackNegative = false;
          }
          recompute({ keepFinal: true });
        },
        selectAll: true
      });

      inCode.addEventListener('input', function () {
        r.code = inCode.value.trim();
        if (r.mode === 'empty' && r.code) r.mode = 'manual';
        if (r.mode === 'manual' && !r.unit) { r.unit = Catalog.unitFor(r.code); inUnit.value = r.unit; }
        recompute();
      });
      inDesc.addEventListener('input', function () {
        r.desc = inDesc.value;
        if (r.mode === 'empty' && r.desc) r.mode = 'manual';
        recompute();
      });
      inUnit.addEventListener('input', function () { r.unit = inUnit.value; recompute(); });

      function setPct(v) {
        v = Math.max(0, Math.min(100, v));
        r.discPct = v; r.finalExact = null; r.finalBase = null; r.ackNegative = false;
        recompute();
      }
      rng.addEventListener('input', function () { setPct(Number(rng.value)); });
      inPct.addEventListener('input', function () {
        var v = Num.parse(inPct.value);
        if (v === null) return;
        r.discPct = Math.max(0, Math.min(100, v));
        r.finalExact = null; r.finalBase = null; r.ackNegative = false;
        recompute({ keepPctText: true });
      });
      inPct.addEventListener('blur', function () { recompute(); });

      selDt.addEventListener('change', function () {
        r.dtMode = selDt.value; recompute();
      });
      inDt.addEventListener('input', function () { r.dtText = inDt.value; recompute(); });

      segArea.addEventListener('click', function () {
        r.qtyMode = 'area';
        if (r.qty && r.perM2 && !r.area) r.area = Math.round((r.qty / r.perM2) * 100) / 100;
        api.sync(); UI.touch();
      });
      segBrick.addEventListener('click', function () {
        r.qtyMode = 'brick'; api.sync(); UI.touch();
      });

      function applyArea() {
        var res = Packaging.fromArea(r.area, r.perM2, r.perCarton);
        if (res) { r.qty = res.qty; r.ackCarton = true; }
        else if (!r.area) { r.qty = null; }
      }
      function recompute(opt) {
        opt = opt || {};
        api.sync(opt);
        UI.refreshAll();
        Store.save();
      }

      /* combo callbacks */
      combo.onPick = function (p) {
        r.mode = 'catalog';
        r.code = p.printCode; r.desc = p.desc; r.unit = p.unit; r.grout = p.grout;
        r.refPrice = p.price; r.price = p.price;
        r.perM2 = p.perM2; r.perCarton = p.perCarton; r.perPallet = p.perPallet;
        r.finalExact = null; r.finalBase = null; r.ackCarton = false;
        if (r.qtyMode === 'area') applyArea();
        else if (r.qty && r.perCarton && r.qty % r.perCarton !== 0) r.ackCarton = false;
        if (!r.open) { r.open = true; card.classList.add('open'); head.setAttribute('aria-expanded', 'true'); }
        recompute();
      };
      combo.onManual = function () {
        r.mode = 'manual';
        r.refPrice = null; r.grout = false;
        if (!r.open) { r.open = true; card.classList.add('open'); head.setAttribute('aria-expanded', 'true'); }
        recompute();
        /* A manual row exists precisely to type these in, so the box opens
           itself. The pencil guards against a stray tap, not against work
           the person has just asked for. */
        specEl.unlock();
        setTimeout(function () { inCode.focus(); inCode.select(); }, 60);
      };
      combo.onClear = function () {
        var open = r.open;
        S.rows[idx] = newRow(); S.rows[idx].open = open; r = S.rows[idx];
        recompute();
      };

      /* assistant actions */
      function runAction(a) {
        if (a.act === 'setQty') {
          r.qty = a.qty; r.ackCarton = false;
          if (r.qtyMode === 'area' && r.perM2) r.area = Math.round((r.qty / r.perM2) * 100) / 100;
          r.finalExact = null; r.finalBase = null;
        } else if (a.act === 'ackCarton') r.ackCarton = true;
        else if (a.act === 'ackNegative') r.ackNegative = true;
        recompute();
      }

      /* ---------- sync (state -> DOM) ---------- */
      api.sync = function (opt) {
        opt = opt || {};
        r = S.rows[idx];
        var active = Calc.isActive(r);
        var c = Calc.row(r);

        card.classList.toggle('filled', active);
        card.classList.toggle('open', !!r.open);
        head.setAttribute('aria-expanded', r.open ? 'true' : 'false');

        /* head summary */
        if (active) {
          tName.textContent = r.desc || r.code || 'کالای بدون شرح';
          tName.classList.remove('empty');
          var bits = [];
          if (r.code) bits.push('<span class="ltr" style="direction:ltr">' + esc(r.code) + '</span>');
          if (r.qty) bits.push('<span class="num">' + Num.group(r.qty) + '</span> ' + esc(r.unit || ''));
          if (c.pct) bits.push('تخفیف <span class="num">' + Num.pct(c.pct) + '٪</span>');
          tSub.innerHTML = bits.join(' <span style="opacity:.4">•</span> ');
          sumB.textContent = Num.group(c.final);
          sumS.textContent = c.discount ? '−' + Num.group(c.discount) : 'بدون تخفیف';
        } else {
          tName.textContent = 'ردیف خالی'; tName.classList.add('empty');
          tSub.innerHTML = '<span style="color:var(--muted-2)">در PDF به صورت خالی چاپ می‌شود</span>';
          sumB.textContent = ''; sumS.textContent = '';
        }

        if (document.activeElement !== inCode) inCode.value = r.code || '';
        if (document.activeElement !== inDesc) inDesc.value = r.desc || '';
        if (document.activeElement !== inUnit) inUnit.value = r.unit || '';
        if (document.activeElement !== inPrice) priceCtl.set(r.price);

        var isCatalog = r.mode === 'catalog';
        inM2.disabled = isCatalog; inCt.disabled = isCatalog; inPl.disabled = isCatalog;
        if (document.activeElement !== inM2) m2Ctl.set(r.perM2);
        if (document.activeElement !== inCt) ctCtl.set(r.perCarton);
        if (document.activeElement !== inPl) plCtl.set(r.perPallet);
        // the packaging cells only make sense where packaging data exists
        var noPack = r.mode === 'catalog' && !r.perM2 && !r.perCarton && !r.perPallet;
        specEl.classList.toggle('nopack', r.mode === 'empty' || noPack);

        combo.setLabel(r);

        /* reference price chip (sits in the label row) */
        if (r.refPrice !== null) {
          refChip.classList.remove('hidden');
          var same = r.price === r.refPrice;
          refChip.innerHTML = 'قیمت مرجع: <span class="n">' + Num.group(r.refPrice) + '</span>' +
            (same ? '' : ' <button type="button" data-reset="1">' + ICON.reset + ' بازگردانی</button>');
          var rb = refChip.querySelector('[data-reset]');
          if (rb) rb.addEventListener('click', function () {
            r.price = r.refPrice; r.finalExact = null; r.finalBase = null; recompute();
          });
        } else refChip.classList.add('hidden');

        /* quantity mode */
        segBrick.textContent = r.unit || 'قالب';
        var canArea = !!r.perM2;
        segArea.disabled = !canArea;
        segArea.style.opacity = canArea ? '' : '.45';
        if (!canArea && r.qtyMode === 'area') r.qtyMode = 'brick';
        segArea.setAttribute('aria-pressed', r.qtyMode === 'area' ? 'true' : 'false');
        segBrick.setAttribute('aria-pressed', r.qtyMode === 'brick' ? 'true' : 'false');
        if (r.qtyMode === 'area') {
          inQty.placeholder = 'متراژ به متر مربع';
          if (document.activeElement !== inQty) qtyCtl.set(r.area);
          qtyNote.innerHTML = r.qty
            ? 'مقدار نهایی فاکتور: <span class="num">' + Num.group(r.qty) + '</span> ' + esc(r.unit || 'قالب')
            : 'متراژ را وارد کنید؛ مقدار قالب به صورت خودکار محاسبه می‌شود.';
        } else {
          inQty.placeholder = 'تعداد ' + (r.unit || 'قالب');
          if (document.activeElement !== inQty) qtyCtl.set(r.qty);
          qtyNote.innerHTML = (r.perM2 && r.qty)
            ? 'متراژ تقریبی: <span class="num">' + Num.pct(Packaging.area(r.qty, r.perM2), 2) + '</span> متر مربع'
            : '&nbsp;';
        }

        /* discount */
        var pctShown = c.pct;
        rng.value = String(Math.max(0, Math.min(100, pctShown)));
        rng.style.setProperty('--p', Math.max(0, Math.min(100, pctShown)) + '%');
        if (document.activeElement !== inPct) inPct.value = Num.pct(pctShown);
        inGross.value = Num.group(c.gross);
        if (document.activeElement !== inFinal) finalCtl.set(c.final);
        inNet.disabled = !r.qty;
        if (document.activeElement !== inNet) {
          netCtl.set(c.netUnit === null ? null : Math.round(c.netUnit));
        }
        netUnitTag.textContent = 'بهای واحد هر ' + (r.unit || 'قالب') + ' پس از تخفیف';
        finalField.classList.toggle('bad', c.gross > 0 && c.final > c.gross && !r.ackNegative);

        selDt.value = r.dtMode;
        dtField.style.display = r.dtMode === 'custom' ? '' : 'none';
        if (document.activeElement !== inDt) inDt.value = r.dtText || '';
        var dtOut = Output.discountText(r, c);
        dtPreview.innerHTML = 'چاپ در ستون تخفیف نقدی: ' +
          (dtOut ? '<b style="color:var(--ink-2)">' + esc(dtOut) + '</b>' : '<span style="color:var(--muted-2)">— خالی —</span>');

        /* assistant */
        var res = Assistant.analyze(r, { brickArea: Calc.brickArea() });
        asst.classList.toggle('has-warn', res.warn);
        asstBody.innerHTML = '';
        if (!res.messages.length) {
          asstBody.appendChild(el('div', 'asst-empty', 'اطلاعاتی برای تحلیل موجود نیست.'));
        }
        res.messages.forEach(function (m) {
          var mm = el('div', 'msg ' + m.level);
          mm.innerHTML = '<span class="dot"></span><div class="txt">' +
            m.text.replace(/<n>/g, '<span class="n">').replace(/<\/n>/g, '</span>') + '</div>';
          asstBody.appendChild(mm);
          if (m.actions && m.actions.length) {
            var ab = el('div', 'asst-acts');
            m.actions.forEach(function (a) {
              var b = el('button', 'btn xs' + (a.kind === 'ghost' ? ' ghost' : ''), esc(a.label));
              b.type = 'button';
              b.addEventListener('click', function () { runAction(a); });
              ab.appendChild(b);
            });
            asstBody.appendChild(ab);
          }
        });
        if (!Calc.isGrout(r) && r.ackCarton && r.perCarton && r.qty && r.qty % r.perCarton !== 0) {
          var okm = el('div', 'msg ok');
          okm.innerHTML = '<span class="dot"></span><div class="txt">مقدار غیرکارتنی توسط شما تأیید شده است.</div>';
          asstBody.appendChild(okm);
        }

        /* warning dot on the collapsed header */
        var hasDot = head.querySelector('.warndot');
        var needDot = active && res.warn &&
          !((!r.perCarton || !r.qty || r.qty % r.perCarton === 0 || r.ackCarton) &&
            (c.final <= c.gross || r.ackNegative));
        if (needDot && !hasDot) {
          var d = el('span', 'warndot');
          title.insertBefore(d, title.firstChild);
        } else if (!needDot && hasDot) hasDot.remove();
      };

      api.sync();
      return api;
    },

    wrapField: function (label, input) {
      var f = el('div', 'f');
      var l = el('label'); l.innerHTML = label;
      f.appendChild(l); f.appendChild(input);
      return f;
    },

    /* A field that will not take a keystroke until it is asked to.

       These row cards are scrolled past constantly on a phone, and a
       stray tap on a live money field throws the software keyboard over
       half the screen. The pencil opens it; leaving the field closes it
       again, so nothing stays armed by accident. */
    guard: function (input, field) {
      var lab = field.querySelector('label');
      input.readOnly = true;
      field.classList.add('guarded');
      var b = el('button', 'pen'); b.type = 'button';
      b.title = 'ویرایش'; b.setAttribute('aria-label', 'ویرایش این مقدار');
      b.innerHTML = ICON.pencil;
      lab.appendChild(b);
      // never let the button steal focus first: that would blur-lock the
      // field a moment before the click arrives
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function (e) {
        e.preventDefault();
        input.readOnly = false;
        field.classList.add('editing');
        input.focus();
        if (input.select) input.select();
      });
      input.addEventListener('blur', function () {
        input.readOnly = true;
        field.classList.remove('editing');
      });
      return field;
    },

    /* Code, description, unit and the packaging counts read as one quiet
       table. They are facts about the product, not things anyone retypes,
       so they cost a few lines instead of two full field grids — and the
       pencil opens all six at once when a manual row does need them. */
    specBox: function (cells) {
      var box = el('div', 'spec');
      var h = el('div', 'spec-h');
      h.appendChild(el('b', null, 'مشخصات کالا'));
      var pen = el('button', 'pen'); pen.type = 'button';
      pen.title = 'ویرایش مشخصات کالا';
      pen.setAttribute('aria-label', 'ویرایش مشخصات کالا');
      pen.innerHTML = ICON.pencil;
      h.appendChild(pen);
      box.appendChild(h);

      var grid = el('div', 'spec-g');
      cells.forEach(function (c) {
        var cell = el('div', 'spec-c');
        cell.appendChild(el('span', 'spec-l', c[0]));
        c[1].classList.add('spec-i');
        if (c[2]) c[1].classList.add('spec-' + c[2]);
        c[1].readOnly = true;
        cell.appendChild(c[1]);
        grid.appendChild(cell);
      });
      box.appendChild(grid);

      function setOpen(on, focus) {
        box.classList.toggle('editing', on);
        cells.forEach(function (c) { c[1].readOnly = !on; });
        if (on && focus) { cells[0][1].focus(); if (cells[0][1].select) cells[0][1].select(); }
      }
      pen.addEventListener('mousedown', function (e) { e.preventDefault(); });
      pen.addEventListener('click', function () {
        setOpen(!box.classList.contains('editing'), true);
      });
      box.unlock = function () { setOpen(true, false); };
      box.lock = function () { setOpen(false, false); };
      return box;
    },

    /* A whole section folds away behind its own heading, the way a row
       card does, and says in one line what it holds while it is shut. */
    foldable: function (card, key, summary, startFolded) {
      var head = card.querySelector('.card-h');
      head.classList.add('foldable');
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      var sum = el('div', 'fold-sum');
      var chev = el('div', 'fold-chev', ICON.chev);
      head.appendChild(sum); head.appendChild(chev);

      function paint() {
        var folded = card.classList.contains('folded');
        head.setAttribute('aria-expanded', folded ? 'false' : 'true');
        sum.textContent = folded ? summary() : '';
      }
      function toggle() {
        var folded = !card.classList.contains('folded');
        card.classList.toggle('folded', folded);
        FOLD.set(key, folded);
        paint();
      }
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
      if (FOLD.get(key, startFolded)) card.classList.add('folded');
      paint();
      UI.bind('fold', paint);
      return card;
    },

    /* ================= combobox ================= */
    combo: function (idx, r) {
      var c = el('div', 'combo');
      var input = el('input', 'inp'); input.type = 'text';
      input.placeholder = 'جستجوی کد یا شرح کالا…';
      input.setAttribute('autocomplete', 'off');
      var pop = el('div', 'combo-pop');
      var list = el('div', 'combo-list');
      var foot = el('div', 'combo-foot');
      var bMan = el('button', 'btn sm', 'کالای دستی'); bMan.type = 'button';
      var bClr = el('button', 'btn sm ghost', 'خالی کردن ردیف'); bClr.type = 'button';
      foot.appendChild(bMan); foot.appendChild(bClr);
      pop.appendChild(list); pop.appendChild(foot);
      c.appendChild(input); c.appendChild(pop);

      var api = { el: c, onPick: null, onManual: null, onClear: null };
      var active = -1, current = [];

      function render(q) {
        current = Catalog.search(q);
        list.innerHTML = '';
        if (!current.length) {
          list.appendChild(el('div', 'combo-empty', 'کالایی یافت نشد. می‌توانید «کالای دستی» را انتخاب کنید.'));
          return;
        }
        current.slice(0, 60).forEach(function (p, i) {
          var it = el('div', 'combo-item');
          var meta = ['<span class="ltr">' + esc(p.code) + '</span>'];
          if (p.perCarton) meta.push('کارتن <span class="n">' + p.perCarton + '</span>');
          if (p.perM2) meta.push('متر مربع <span class="n">' + p.perM2 + '</span>');
          it.innerHTML =
            '<div class="ci-main"><b>' + esc(p.desc) + '</b><small>' +
            meta.join('<span style="opacity:.45"> · </span>') + '</small></div>' +
            '<div class="ci-price">' + Num.group(p.price) + '</div>';
          if (i === active) it.classList.add('active');
          it.addEventListener('mousedown', function (e) { e.preventDefault(); pick(p); });
          list.appendChild(it);
        });
      }
      function open() { c.classList.add('open'); render(''); input.value = ''; active = -1; }
      function close() { c.classList.remove('open'); api.setLabel(S.rows[idx]); }
      function pick(p) { close(); if (api.onPick) api.onPick(p); }

      input.addEventListener('focus', open);
      input.addEventListener('input', function () { active = -1; render(input.value); });
      input.addEventListener('blur', function () { setTimeout(close, 120); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          var n = Math.min(current.length, 60);
          if (!n) return;
          active = e.key === 'ArrowDown' ? (active + 1) % n : (active - 1 + n) % n;
          render(input.value);
          var act = list.querySelector('.combo-item.active');
          if (act) act.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (active >= 0 && current[active]) pick(current[active]);
          else if (current.length === 1) pick(current[0]);
        } else if (e.key === 'Escape') { input.blur(); }
      });
      bMan.addEventListener('mousedown', function (e) { e.preventDefault(); close(); if (api.onManual) api.onManual(); });
      bClr.addEventListener('mousedown', function (e) { e.preventDefault(); close(); if (api.onClear) api.onClear(); });

      api.setLabel = function (row) {
        if (c.classList.contains('open')) return;
        if (row.mode === 'catalog' && row.code) input.value = row.desc + ' — ' + row.code;
        else if (row.mode === 'manual') input.value = 'کالای دستی';
        else input.value = '';
      };
      return api;
    },

    /* ================= summary ================= */
    summaryCard: function () {
      var c = el('div', 'card');
      c.appendChild(el('div', 'card-h', '<div class="sect-num">4</div><h2>جمع‌بندی</h2>'));
      var b = el('div', 'card-b');
      b.innerHTML =
        '<div class="sum-row"><span>جمع کل</span><div class="sum-amt"><b class="num" id="sGross">0</b><span class="sum-cur">ریال</span></div></div>' +
        '<div class="sum-row"><span>تخفیف</span><div class="sum-amt"><b class="num" id="sDisc">0</b><span class="sum-cur">ریال</span></div></div>' +
        '<div class="sum-row total"><span>قابل پرداخت</span><div class="sum-amt"><b class="num" id="sPay">0</b><span class="sum-cur">ریال</span></div></div>' +
        '<div class="divider" style="margin:14px 0 12px"></div>' +
        '<div class="checks" id="checks"></div>';
      var btn = el('button', 'btn pri wide', 'صدور PDF'); btn.type = 'button';
      btn.style.marginTop = '14px';
      btn.id = 'btnPdfSide';
      b.appendChild(btn);
      var outs = el('div');
      outs.style.cssText = 'display:flex;gap:8px;margin-top:8px';
      var bPrint = el('button', 'btn sm', ICON.printer + '<span>پرینت</span>');
      bPrint.type = 'button'; bPrint.id = 'btnPrintSide'; bPrint.style.flex = '1';
      var bHtml = el('button', 'btn sm', ICON.save + '<span>ذخیره HTML</span>');
      bHtml.type = 'button'; bHtml.id = 'btnHtmlSide'; bHtml.style.flex = '1';
      outs.appendChild(bPrint); outs.appendChild(bHtml);
      b.appendChild(outs);
      var note = el('div', 'lbl');
      note.style.cssText = 'font-size:11px;color:var(--muted-2);font-weight:500;margin-top:10px;line-height:1.7;text-align:center';
      note.innerHTML = 'PDF و پرینت دقیقاً مطابق قالب رسمی‌اند.<br>فایل HTML، همین فاکتور را با تمام اطلاعات برای ویرایش بعدی نگه می‌دارد.';
      b.appendChild(note);
      c.appendChild(b);
      return c;
    },

    refreshAll: function () {
      var t = Calc.totals();
      var g = document.getElementById('sGross'), d = document.getElementById('sDisc'), p = document.getElementById('sPay');
      if (g) g.textContent = Num.group(t.gross);
      if (d) d.textContent = Num.group(t.discount);
      if (p) p.textContent = Num.group(t.payable);
      var mb = document.getElementById('mbTotal');
      if (mb) mb.textContent = Num.group(t.payable);

      UI.fire('fold');                 // folded sections keep an honest summary

      var v = Validate.run();
      var box = document.getElementById('checks');
      if (box) {
        box.innerHTML = '';
        if (v.ok && !v.advisory.length) {
          box.appendChild(el('div', 'check ok', ICON.check + '<span>فاکتور آماده صدور است.</span>'));
        }
        v.blocking.forEach(function (m) {
          box.appendChild(el('div', 'check bad', ICON.alert + '<span>' + esc(m) + '</span>'));
        });
        v.advisory.forEach(function (m) {
          box.appendChild(el('div', 'check warn', ICON.info + '<span>' + esc(m) + '</span>'));
        });
      }
    },

    /* ================= overlays ================= */
    modal: function (title, bodyHtml, buttons) {
      var m = document.getElementById('modal'), s = document.getElementById('scrim');
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = bodyHtml;
      var f = document.getElementById('modalFoot');
      f.innerHTML = '';
      (buttons || []).forEach(function (b) {
        var btn = el('button', 'btn' + (b.pri ? ' pri' : ''), esc(b.label));
        btn.type = 'button';
        btn.addEventListener('click', function () { UI.closeModal(); if (b.act) b.act(); });
        f.appendChild(btn);
      });
      m.classList.add('on'); s.classList.add('on');
    },
    closeModal: function () {
      document.getElementById('modal').classList.remove('on');
      document.getElementById('scrim').classList.remove('on');
    },
    toastT: null,
    toast: function (msg, link) {
      var t = document.getElementById('toast');
      t.innerHTML = esc(msg) + (link ? ' <a href="' + link.href + '" target="_blank" rel="noopener">' + esc(link.label) + '</a>' : '');
      t.classList.add('on');
      clearTimeout(UI.toastT);
      UI.toastT = setTimeout(function () { t.classList.remove('on'); }, link ? 9000 : 3200);
    }
  };

  /* ==================================================================
     PDF action
     ================================================================== */
  var OUT = {
    pdf: { run: function () { Output.generate(); }, label: 'صدور PDF' },
    print: { run: function () { Output.print(); }, label: 'چاپ' },
    html: { run: function () { Output.exportHtml(); }, label: 'ذخیره فایل HTML' }
  };
  function doOut(kind) {
    var job = OUT[kind];
    var v = Validate.run();
    if (!v.ok) {
      UI.modal('امکان ' + job.label + ' نیست',
        '<p style="margin:0 0 10px">برای این خروجی، موارد زیر باید اصلاح شوند:</p><ul style="margin:0;padding-inline-start:18px">' +
        v.blocking.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>',
        [{ label: 'باشد', pri: true }]);
      return;
    }
    if (v.advisory.length) {
      UI.modal('تأیید ' + job.label,
        '<p style="margin:0 0 10px">فاکتور قابل صدور است، اما توجه کنید:</p><ul style="margin:0 0 12px;padding-inline-start:18px">' +
        v.advisory.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>' +
        '<p style="margin:0;color:var(--muted)">ادامه می‌دهید؟</p>',
        [{ label: job.label, pri: true, act: job.run }, { label: 'بازگشت' }]);
      return;
    }
    job.run();
  }
  function doPdf() { doOut('pdf'); }

  /* ==================================================================
     Boot
     ================================================================== */
  function boot() {
    /* embed the invoice typeface for the interface, from the very same
       bytes the PDF uses — no second copy, no network */
    try {
      if (window.FontFace && document.fonts) {
        var mk = function (b64, weight) {
          var bin = atob(b64), buf = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
          var ff = new FontFace('Vazirmatn', buf.buffer, { weight: weight, style: 'normal', display: 'swap' });
          ff.load().then(function (f) { document.fonts.add(f); });
        };
        mk(FONT_DATA.R.b64, '400');
        mk(FONT_DATA.B.b64, '700');
      }
    } catch (e) { /* system font fallback */ }

    InvoiceEngine.init(FONT_DATA, UNI_META);
    Store.load();
    UI.build();

    document.getElementById('btnPdfTop').addEventListener('click', doPdf);
    document.getElementById('btnPdfMob').addEventListener('click', doPdf);
    document.getElementById('btnPrintMob').addEventListener('click', function () { doOut('print'); });
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!t) return;
      if (t.id === 'btnPdfSide') doPdf();
      else if (t.id === 'btnPrintSide' || t.id === 'btnPrintTop') doOut('print');
      else if (t.id === 'btnHtmlSide') doOut('html');
    });
    document.getElementById('btnNew').addEventListener('click', function () {
      UI.modal('فاکتور جدید',
        'اطلاعات فاکتور فعلی پاک می‌شود و فرم خالی می‌گردد. ادامه می‌دهید؟',
        [{ label: 'بله، فاکتور جدید', pri: true, act: function () { Store.reset(); UI.build(); } },
         { label: 'انصراف' }]);
    });
    document.getElementById('scrim').addEventListener('click', UI.closeModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') UI.closeModal();
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); doOut('print'); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); doOut('html'); }
    });
    window.addEventListener('beforeunload', function () { Store.save(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* expose a little surface for debugging / future extension */
  window.Invoice = {
    state: function () { return S; },
    calc: Calc, packaging: Packaging, assistant: Assistant,
    validate: Validate, output: Output, catalog: Catalog, num: Num, money: Money, jalali: Jalali
  };
})();
