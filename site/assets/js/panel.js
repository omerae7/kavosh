/* =====================================================================
   Panel dashboard — clock, figures, reminders, notes, assistant.
   Everything that shows a number goes through the odometer.
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = UI.esc, el = UI.el;

  /* ---------------------------------------------------------------
     Clock and date
     --------------------------------------------------------------- */
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var d = new Date();
    Odo.set($('wClock'), two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds()));
    var dateEl = $('wDate');
    if (dateEl) dateEl.textContent = Jalali.long(d);
    var g = $('wGreet');
    if (g) {
      var h = d.getHours();
      g.textContent = h < 5 ? 'شب بخیر' : h < 12 ? 'صبح بخیر' : h < 17 ? 'ظهر بخیر' : h < 20 ? 'عصر بخیر' : 'شب بخیر';
    }
  }

  /* ---------------------------------------------------------------
     Dashboard figures
     --------------------------------------------------------------- */
  function loadStats() {
    return API.get('stats.php').then(function (s) {
      Odo.count($('wMonth'), s.thisMonth);
      Odo.money($('wMonthSum'), s.thisMonthSum);
      var last = s.series[s.series.length - 1];
      $('wMonthName').textContent = last ? last.label + ' ' + last.y : '';
      $('wInvSub').textContent = s.invoices
        ? Num.group(s.invoices) + ' فاکتور ثبت شده'
        : 'هنوز فاکتوری ثبت نشده است';
      $('wCusSub').textContent = s.customers
        ? Num.group(s.customers) + ' مشتری ثبت شده'
        : 'هنوز مشتری‌ای ثبت نشده است';

      drawChart(s.series);
      drawRecent(s.recent || []);
      window.__stats = s;
      return s;
    });
  }

  function drawChart(series) {
    var box = $('wChart');
    if (!box) return;
    box.innerHTML = '';
    var max = Math.max.apply(null, series.map(function (x) { return x.count; }).concat([1]));
    series.forEach(function (m, i) {
      var bar = el('div', 'bar' + (i === series.length - 1 ? ' now' : ''));
      var col = el('div', 'col');
      col.style.height = '3px';
      if (m.count) col.innerHTML = '<b>' + Num.group(m.count) + '</b>';
      col.title = m.label + ' ' + m.y + ' — ' + Num.group(m.count) + ' فاکتور، ' + Num.group(m.sum) + ' ریال';
      bar.appendChild(col);
      bar.appendChild(el('div', 'lb', esc(m.label)));
      box.appendChild(bar);
      // let the bars grow after paint so the motion is visible
      requestAnimationFrame(function () {
        setTimeout(function () {
          col.style.height = Math.max(4, Math.round(m.count / max * 96)) + 'px';
        }, 60 + i * 55);
      });
    });
  }

  function drawRecent(rows) {
    var box = $('wRecent');
    if (!box) return;
    box.innerHTML = '';
    if (!rows.length) { box.appendChild(el('div', 'wempty', 'هنوز فاکتوری صادر نشده است.')); return; }
    rows.forEach(function (r) {
      var a = el('a', 'wl');
      a.href = '/panel/invoices.php?q=' + encodeURIComponent(r.id);
      a.innerHTML = '<div class="m"><b>' + esc(r.customerName) + '</b>' +
        '<small>' + esc(Jalali.pretty(r.date)) + ' · <span class="num">' + esc(r.id) + '</span>' +
        (r.kind === 'kasri' ? ' · کسری بار' : '') + '</small></div>' +
        '<div class="v">' + Num.group(r.payable) + '</div>';
      box.appendChild(a);
    });
  }

  /* ---------------------------------------------------------------
     Reminders
     --------------------------------------------------------------- */
  var WEEK = 7 * 86400;
  function loadReminders() {
    return API.get('reminders.php?a=list').then(function (r) {
      var open = r.items.filter(function (x) { return !x.done; });
      drawReminders(open.slice(0, 6), r.items.length, open.length);
      window.__rem = r.items;
      drawAssistant();
      return r.items;
    });
  }

  function drawReminders(list, total, openCount) {
    var box = $('wRem');
    if (!box) return;
    box.innerHTML = '';
    if (!list.length) {
      box.appendChild(el('div', 'wempty', total ? 'همهٔ یادآورها انجام شده‌اند.' : 'یادآوری ثبت نشده است.'));
      return;
    }
    var now = Date.now() / 1000;
    list.forEach(function (x) {
      var late = (now - (x.createdAt || now)) > WEEK;
      var row = el('div', 'rem' + (late ? ' late' : ''));
      var tick = el('button', 'tick');
      tick.type = 'button';
      tick.title = 'انجام شد';
      tick.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-6"/></svg>';
      tick.addEventListener('click', function () {
        row.classList.add('done');
        API.post('reminders.php?a=update', { id: x.id, done: true })
          .then(loadReminders)
          .catch(function (e) { row.classList.remove('done'); UI.toast(e.message, { kind: 'bad' }); });
      });
      var t = el('div', 't');
      t.innerHTML = esc(x.text) +
        '<small>' + UI.ago(x.createdAt) + (late ? ' — بیش از یک هفته باز مانده' : '') + '</small>';
      row.appendChild(tick); row.appendChild(t);
      box.appendChild(row);
    });
    if (openCount > list.length) {
      var more = el('div', 'wempty');
      more.innerHTML = '<a href="/panel/reminders.php">' + Num.group(openCount - list.length) + ' یادآور دیگر…</a>';
      box.appendChild(more);
    }
  }

  function wireReminderAdd() {
    var f = $('remAdd');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var i = $('remText'), text = i.value.trim();
      if (!text) return;
      i.value = '';
      API.post('reminders.php?a=add', { text: text })
        .then(loadReminders)
        .then(function () { UI.toast('یادآور ثبت شد.', { kind: 'good' }); })
        .catch(function (err) { UI.toast(err.message, { kind: 'bad' }); i.value = text; });
    });
  }

  /* ---------------------------------------------------------------
     Assistant — what deserves attention right now
     --------------------------------------------------------------- */
  function drawAssistant() {
    var box = $('wAssist');
    if (!box) return;
    var s = window.__stats, rem = window.__rem;
    if (!s || !rem) return;
    var out = [];
    var now = Date.now() / 1000;

    var late = rem.filter(function (x) { return !x.done && (now - (x.createdAt || now)) > WEEK; });
    if (late.length) {
      out.push({ k: 'warn', html: '<b>' + Num.group(late.length) + '</b> یادآور بیش از یک هفته است باز مانده' +
        ' — «' + esc(late[0].text.slice(0, 40)) + (late[0].text.length > 40 ? '…' : '') + '»' });
    }
    var open = rem.filter(function (x) { return !x.done; }).length;
    if (open && !late.length) out.push({ k: 'tip', html: '<b>' + Num.group(open) + '</b> یادآور باز دارید.' });

    var series = s.series || [];
    if (series.length >= 2) {
      var cur = series[series.length - 1], prev = series[series.length - 2];
      if (prev.count > 0) {
        var diff = cur.count - prev.count;
        var pctChange = Math.round(Math.abs(diff) / prev.count * 100);
        if (diff !== 0) {
          out.push({ k: diff > 0 ? 'ok' : 'tip',
            html: 'فاکتورهای ' + esc(cur.label) + ' نسبت به ' + esc(prev.label) + ' <b>' + Num.group(pctChange) +
              '٪</b> ' + (diff > 0 ? 'بیشتر' : 'کمتر') + ' شده است.' });
        }
      } else if (cur.count > 0) {
        out.push({ k: 'ok', html: 'شروع خوبی برای ' + esc(cur.label) + ': <b>' + Num.group(cur.count) + '</b> فاکتور.' });
      }
    }
    if (s.thisMonth) {
      out.push({ k: 'tip', html: 'مجموع این ماه: <b>' + Num.group(s.thisMonthSum) + '</b> ریال از <b>' +
        Num.group(s.thisMonth) + '</b> فاکتور.' });
    }
    if (!s.invoices) out.push({ k: 'tip', html: 'اولین فاکتور را از ویجت «صدور پیش فاکتور» صادر کنید.' });
    if (!out.length) out.push({ k: 'ok', html: 'همه چیز مرتب است؛ موردی برای رسیدگی نیست.' });

    box.innerHTML = '';
    out.slice(0, 5).forEach(function (m) {
      var d = el('div', 'pa-item ' + m.k);
      d.innerHTML = '<span class="dot"></span><div>' + m.html + '</div>';
      box.appendChild(d);
    });
  }

  /* ---------------------------------------------------------------
     Notes — write, keep, clear, edit
     --------------------------------------------------------------- */
  function wireNotes() {
    var boxes = document.querySelectorAll('[data-note]');
    if (!boxes.length) return;
    API.get('notes.php?a=get').then(function (r) {
      boxes.forEach(function (b) {
        var slot = Number(b.dataset.note);
        var ta = b.querySelector('.note-area');
        var saved = b.querySelector('.note-saved');
        ta.value = (r.notes && r.notes[slot]) || '';
        // an already-written note starts locked, so it can't be changed by a stray keystroke
        setLocked(b, !!ta.value);

        b.querySelectorAll('.nbtn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var act = btn.dataset.act;
            if (act === 'edit') { setLocked(b, false); ta.focus(); return; }
            if (act === 'clear') {
              UI.confirm('خالی کردن یادداشت', 'متن این یادداشت پاک و خالی ذخیره می‌شود. ادامه می‌دهید؟', 'پاک کن')
                .then(function (yes) {
                  if (!yes) return;
                  ta.value = '';
                  save(slot, '', saved, b);
                });
              return;
            }
            save(slot, ta.value, saved, b);
          });
        });
      });
    }).catch(function (e) { UI.toast(e.message, { kind: 'bad' }); });

    function setLocked(b, locked) {
      var ta = b.querySelector('.note-area');
      ta.disabled = locked;
      b.querySelector('[data-act="edit"]').style.display = locked ? '' : 'none';
      b.querySelector('[data-act="save"]').style.display = locked ? 'none' : '';
    }
    function save(slot, text, saved, b) {
      API.post('notes.php', { slot: slot, text: text }).then(function () {
        saved.textContent = 'ذخیره شد';
        setTimeout(function () { saved.textContent = ''; }, 2200);
        setLocked(b, !!text);
      }).catch(function (e) { UI.toast(e.message, { kind: 'bad' }); });
    }
  }

  /* ---------------------------------------------------------------
     Boot
     --------------------------------------------------------------- */
  API.boot().then(function () {
    tick();
    setInterval(tick, 1000);
    wireReminderAdd();
    wireNotes();
    return Promise.all([loadStats(), loadReminders()]);
  }).catch(function (e) {
    if (e.status === 401) { location.href = '/panel/login.php'; return; }
    UI.toast('خطا در بارگذاری پنل: ' + e.message, { kind: 'bad' });
  });
})();
