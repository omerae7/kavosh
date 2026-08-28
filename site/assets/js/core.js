/* =====================================================================
   Brickala — shared runtime
     Num      numbers: Persian digits in, grouped digits out
     Jalali   Gregorian -> Jalali, and the clock
     Odo      odometer: every changing figure rolls into place
     API      fetch wrapper carrying the CSRF token
     UI       toast, modal, element helper
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------
     Num
     --------------------------------------------------------------- */
  var FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';
  var Num = {
    normalize: function (s) {
      if (s === null || s === undefined) return '';
      s = String(s);
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s[i], k = FA.indexOf(ch);
        if (k >= 0) { out += k; continue; }
        k = AR.indexOf(ch);
        if (k >= 0) { out += k; continue; }
        out += (ch === '٫') ? '.' : (ch === '،' ? ',' : ch);
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
      var p = s.split('.');
      p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return (neg ? '-' : '') + p.join('.');
    },
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
    },
    /* compact rial for tight spaces: 1,450,000,000 -> 1.45 میلیارد */
    short: function (v) {
      var n = Math.abs(Number(v) || 0);
      if (n >= 1e9) return Num.pct(v / 1e9, 2) + ' میلیارد';
      if (n >= 1e6) return Num.pct(v / 1e6, 1) + ' میلیون';
      return Num.group(v);
    }
  };

  /* Caret-preserving formatted numeric input. */
  function attachNumber(el, opt) {
    opt = opt || {};
    el.setAttribute('inputmode', opt.decimal ? 'decimal' : 'numeric');
    el.setAttribute('autocomplete', 'off');
    el.classList.add('num');
    function reformat() {
      var pos = el.selectionStart === null ? el.value.length : el.selectionStart;
      var before = el.value.slice(0, pos).replace(/[^\d]/g, '').length;
      var clean = Num.clean(el.value, opt.decimal), out;
      if (opt.group === false) out = clean;
      else { var p = clean.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); out = p.join('.'); }
      if (out !== el.value) {
        el.value = out;
        var i = 0, seen = 0;
        while (i < out.length && seen < before) { if (out.charCodeAt(i) >= 48 && out.charCodeAt(i) <= 57) seen++; i++; }
        try { el.setSelectionRange(i, i); } catch (e) { /* ignore */ }
      }
    }
    el.addEventListener('input', function () { reformat(); if (opt.onInput) opt.onInput(Num.parse(el.value)); });
    el.addEventListener('blur', function () { reformat(); if (opt.onChange) opt.onChange(Num.parse(el.value)); });
    el.addEventListener('focus', function () { if (opt.selectAll) el.select(); });
    return {
      set: function (v) {
        el.value = (v === null || v === undefined || v === '') ? ''
          : (opt.group === false ? String(v) : Num.group(v, opt.decimal ? undefined : 0));
      }
    };
  }

  /* ---------------------------------------------------------------
     Jalali
     --------------------------------------------------------------- */
  var MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
                'مهر','آبان','آذر','دی','بهمن','اسفند'];
  var DAYS = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
  var Jalali = {
    months: MONTHS,
    fromGregorian: function (gy, gm, gd) {
      var gdm = [0,31,59,90,120,151,181,212,243,273,304,334];
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
    of: function (d) {
      d = d || new Date();
      return Jalali.fromGregorian(d.getFullYear(), d.getMonth() + 1, d.getDate());
    },
    stamp: function (d) {
      var j = Jalali.of(d);
      return j[0] + '.' + ('0' + j[1]).slice(-2) + '.' + ('0' + j[2]).slice(-2);
    },
    today: function () { return Jalali.stamp(); },
    long: function (d) {
      d = d || new Date();
      var j = Jalali.of(d);
      return DAYS[d.getDay()] + '، ' + j[2] + ' ' + MONTHS[j[1] - 1] + ' ' + j[0];
    },
    /* "1405.06.06" -> "۶ شهریور ۱۴۰۵" style, in Latin digits */
    pretty: function (stamp) {
      var d = Num.normalize(String(stamp || '')).replace(/\D/g, '');
      if (d.length < 8) return stamp || '';
      var m = parseInt(d.slice(4, 6), 10);
      return parseInt(d.slice(6, 8), 10) + ' ' + (MONTHS[m - 1] || '') + ' ' + d.slice(0, 4);
    },
    /* six-digit tail used in file names: 1405.06.04 -> 050604 */
    six: function (stamp) {
      var d = Num.normalize(String(stamp || '')).replace(/\D/g, '');
      return d.length >= 8 ? d.slice(2, 8) : d.slice(-6);
    }
  };

  /* ---------------------------------------------------------------
     Odo — vertical digit reels
     --------------------------------------------------------------- */
  var Odo = {
    /* Render `text` into `el`, rolling any digit that changed. */
    set: function (el, text, opt) {
      opt = opt || {};
      text = String(text === null || text === undefined ? '' : text);
      if (!el) return;
      if (el.dataset.odo === text) return;
      var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || opt.instant || !el.isConnected) {
        el.dataset.odo = text;
        el.className = (el.className.indexOf('odo') < 0 ? el.className + ' odo' : el.className);
        el.textContent = text;
        return;
      }
      var prev = el.dataset.odo || '';
      el.dataset.odo = text;
      if (el.className.indexOf('odo') < 0) el.className += ' odo';

      var cells = [];
      for (var i = 0; i < text.length; i++) cells.push(text[i]);
      // reuse existing reels where the shape matches, so only digits move
      var same = el.childElementCount === cells.length;
      if (!same) el.innerHTML = '';

      cells.forEach(function (ch, i) {
        var isDigit = ch >= '0' && ch <= '9';
        var node = same ? el.children[i] : null;
        if (!node) {
          node = document.createElement('span');
          node.className = isDigit ? 'odo-d' : 'odo-s';
          if (isDigit) {
            var reel = document.createElement('i');
            for (var d = 0; d <= 9; d++) {
              var s = document.createElement('span'); s.textContent = String(d); reel.appendChild(s);
            }
            node.appendChild(reel);
          } else node.textContent = ch;
          el.appendChild(node);
        }
        if (isDigit) {
          if (node.className !== 'odo-d') {
            node.className = 'odo-d'; node.textContent = '';
            var r2 = document.createElement('i');
            for (var d2 = 0; d2 <= 9; d2++) {
              var s2 = document.createElement('span'); s2.textContent = String(d2); r2.appendChild(s2);
            }
            node.appendChild(r2);
          }
          var reelEl = node.firstChild;
          var from = prev[i];
          if (!(from >= '0' && from <= '9')) reelEl.style.transition = 'none';
          var target = -Number(ch) * 1.15;
          // a nudge apart per column reads like a mechanical counter
          reelEl.style.transitionDelay = (i * 22) + 'ms';
          requestAnimationFrame(function () {
            reelEl.style.transition = '';
            reelEl.style.transform = 'translateY(' + target + 'em)';
          });
        } else if (node.className !== 'odo-s' || node.textContent !== ch) {
          node.className = 'odo-s'; node.textContent = ch;
        }
      });
    },
    money: function (el, v, opt) { Odo.set(el, Num.group(v), opt); },
    count: function (el, v, opt) { Odo.set(el, Num.group(v), opt); }
  };

  /* ---------------------------------------------------------------
     API
     --------------------------------------------------------------- */
  var API = {
    base: '/api/',
    csrf: '',
    get: function (ep, params) {
      var q = params ? ('&' + new URLSearchParams(params).toString()) : '';
      return fetch(API.base + ep + q, { credentials: 'same-origin' }).then(API._read);
    },
    post: function (ep, data) {
      return fetch(API.base + ep, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF': API.csrf },
        body: JSON.stringify(data || {})
      }).then(API._read);
    },
    _read: function (r) {
      return r.text().then(function (t) {
        var j;
        try { j = JSON.parse(t); } catch (e) { throw new Error('پاسخ نامعتبر از سرور (' + r.status + ')'); }
        if (!r.ok || j.ok === false) {
          var err = new Error(j.error || ('خطای ' + r.status));
          err.status = r.status;
          throw err;
        }
        return j;
      });
    },
    boot: function () {
      return API.get('auth.php?a=me').then(function (j) { API.csrf = j.csrf; return j; });
    }
  };

  /* ---------------------------------------------------------------
     UI
     --------------------------------------------------------------- */
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

  var toastTimer = null;
  var UI = {
    el: el, esc: esc,
    toast: function (msg, opt) {
      opt = opt || {};
      var t = document.getElementById('toast');
      if (!t) { t = el('div', 'toast'); t.id = 'toast'; document.body.appendChild(t); }
      t.className = 'toast on' + (opt.kind ? ' ' + opt.kind : '');
      t.innerHTML = esc(msg) + (opt.href ? ' <a href="' + opt.href + '" target="_blank" rel="noopener">' + esc(opt.label || 'باز کردن') + '</a>' : '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('on'); }, opt.href ? 9000 : 3400);
    },
    /* buttons: [{label, pri, danger, act}] — act may return a promise */
    modal: function (title, bodyHtml, buttons, opt) {
      opt = opt || {};
      var scrim = document.getElementById('scrim');
      var m = document.getElementById('modal');
      if (!scrim) {
        scrim = el('div', 'scrim'); scrim.id = 'scrim';
        m = el('div', 'modal');
        m.id = 'modal';
        m.setAttribute('role', 'dialog');
        m.setAttribute('aria-modal', 'true');
        m.innerHTML = '<div class="grab"></div><div class="modal-h"><h3 id="modalTitle"></h3></div>' +
          '<div class="modal-b" id="modalBody"></div><div class="modal-f" id="modalFoot"></div>';
        document.body.appendChild(scrim); document.body.appendChild(m);
        scrim.addEventListener('click', UI.close);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') UI.close(); });
      }
      m.className = 'modal on' + (opt.wide ? ' wide' : '');
      document.getElementById('modalTitle').textContent = title;
      var body = document.getElementById('modalBody');
      if (bodyHtml && bodyHtml.nodeType) { body.innerHTML = ''; body.appendChild(bodyHtml); }
      else body.innerHTML = bodyHtml || '';
      var f = document.getElementById('modalFoot');
      f.innerHTML = '';
      (buttons || []).forEach(function (b) {
        var btn = el('button', 'btn' + (b.pri ? ' pri' : '') + (b.danger ? ' danger' : ''), esc(b.label));
        btn.type = 'button';
        btn.addEventListener('click', function () {
          if (!b.act) return UI.close();
          var r = b.act(body);
          if (r && r.then) { btn.disabled = true; r.then(function (keep) { btn.disabled = false; if (!keep) UI.close(); },
            function () { btn.disabled = false; }); }
          else if (r !== false) UI.close();
        });
        f.appendChild(btn);
      });
      f.style.display = (buttons && buttons.length) ? '' : 'none';
      scrim.classList.add('on');
      return body;
    },
    close: function () {
      var m = document.getElementById('modal'), s = document.getElementById('scrim');
      if (m) m.classList.remove('on');
      if (s) s.classList.remove('on');
    },
    confirm: function (title, text, okLabel) {
      return new Promise(function (resolve) {
        UI.modal(title, '<p style="margin:0">' + esc(text) + '</p>', [
          { label: okLabel || 'تأیید', pri: true, act: function () { resolve(true); } },
          { label: 'انصراف', act: function () { resolve(false); } }
        ]);
      });
    },
    /* Persian-friendly relative time for lists */
    ago: function (ts) {
      var s = Math.max(0, Math.floor(Date.now() / 1000 - (ts || 0)));
      if (s < 60) return 'همین حالا';
      if (s < 3600) return Math.floor(s / 60) + ' دقیقه پیش';
      if (s < 86400) return Math.floor(s / 3600) + ' ساعت پیش';
      if (s < 86400 * 30) return Math.floor(s / 86400) + ' روز پیش';
      return Math.floor(s / (86400 * 30)) + ' ماه پیش';
    }
  };

  global.Num = Num;
  global.attachNumber = attachNumber;
  global.Jalali = Jalali;
  global.Odo = Odo;
  global.API = API;
  global.UI = UI;
})(window);
