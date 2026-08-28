/* =====================================================================
   Dashboard — clock, figures, the month chart, reminders, notes and the
   assistant. Every number that changes rolls into place.
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = UI.esc, el = UI.el;
  var WEEK = 7 * 86400;

  /* ---------------------------------------------------------------
     Clock
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
    var ap = $('wAmPm');
    if (ap) ap.textContent = d.getHours() < 12 ? 'AM' : 'PM';
  }

  /* ---------------------------------------------------------------
     Figures
     --------------------------------------------------------------- */
  function loadStats() {
    return API.get('stats.php').then(function (s) {
      Odo.count($('wMonth'), s.thisMonth);
      Odo.money($('wMonthSum'), s.thisMonthSum);
      var last = s.series[s.series.length - 1];
      $('wMonthName').textContent = last ? last.label + ' ' + last.y : '';
      var total = s.series.reduce(function (a, m) { return a + m.count; }, 0);
      var sum = s.series.reduce(function (a, m) { return a + m.sum; }, 0);
      Odo.count($('sInv'), total);
      Odo.money($('sSum'), sum);
      Odo.money($('sAvg'), total ? Math.round(sum / total) : 0);

      drawChart(s.series);
      drawRecent(s.recent || []);
      window.__stats = s;
      drawAssistant();
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
      var wrap = el('div', 'colwrap');
      var col = el('div', 'col');
      col.style.height = '4px';
      if (m.count) col.innerHTML = '<b>' + Num.group(m.count) + '</b>';
      col.title = m.label + ' ' + m.y + ' — ' + Num.group(m.count) + ' فاکتور';
      wrap.appendChild(col);
      bar.appendChild(wrap);
      bar.appendChild(el('div', 'lb', esc(m.label)));
      box.appendChild(bar);
      requestAnimationFrame(function () {
        setTimeout(function () {
          col.style.height = Math.max(4, Math.round(m.count / max * 100)) + '%';
        }, 60 + i * 55);
      });
    });
  }

  function drawRecent(rows) {
    var box = $('wRecent');
    if (!box) return;
    box.innerHTML = '';
    if (!rows.length) {
      box.appendChild(el('div', 'wempty', 'هنوز فاکتوری صادر نشده است.'));
      return;
    }
    var body = rows.slice(0, 4).map(function (r) {
      return '<tr>' +
        '<td class="c">' + Jalali.html(r.date) + '</td>' +
        '<td><a class="nm" href="/panel/customer.php?id=' + encodeURIComponent(r.customerId || '') + '">' +
          esc(r.customerName) + '</a></td>' +
        '<td class="e"><a class="nm amt" href="/panel/invoice.php?open=' + encodeURIComponent(r.id) + '">' +
          Num.group(r.payable) + '</a></td>' +
      '</tr>';
    }).join('');
    var wrap = el('div', 'ptab-wrap');
    wrap.innerHTML = '<table class="ptab"><thead><tr>' +
      '<th class="c">تاریخ</th><th>نام مشتری</th><th class="e">مبلغ کل (ریال)</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>';
    box.appendChild(wrap);
  }

  /* ---------------------------------------------------------------
     Reminders
     --------------------------------------------------------------- */
  function loadReminders() {
    return API.get('reminders.php?a=list').then(function (r) {
      var open = r.items.filter(function (x) { return !x.done; });
      drawReminders(open.slice(0, 4), r.items.length, open.length);
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
      more.style.padding = '10px 0 0';
      more.innerHTML = '<a href="/panel/reminders.php" style="color:var(--brand);font-weight:600;text-decoration:none">' +
        Num.group(openCount - list.length) + ' یادآور دیگر…</a>';
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
     Assistant
     --------------------------------------------------------------- */
  function drawAssistant() {
    var box = $('wAssist');
    if (!box) return;
    var s = window.__stats, rem = window.__rem;
    if (!s || !rem) return;
    var out = [];
    var now = Date.now() / 1000;

    if (s.unread) {
      out.push({ k: 'msg', html: '<b>' + Num.group(s.unread) + '</b> پیام خوانده‌نشده دارید — ' +
        'از زنگولهٔ بالای صفحه ببینید.' });
    }
    var late = rem.filter(function (x) { return !x.done && (now - (x.createdAt || now)) > WEEK; });
    if (late.length) {
      out.push({ k: 'warn', html: '<b>' + Num.group(late.length) + '</b> یادآور بیش از یک هفته است باز مانده' +
        ' — «' + esc(late[0].text.slice(0, 36)) + (late[0].text.length > 36 ? '…' : '') + '»' });
    }
    var open = rem.filter(function (x) { return !x.done; }).length;
    if (open && !late.length) out.push({ k: 'tip', html: '<b>' + Num.group(open) + '</b> یادآور باز دارید.' });

    var series = s.series || [];
    if (series.length >= 2) {
      var cur = series[series.length - 1], prev = series[series.length - 2];
      if (prev.count > 0 && cur.count !== prev.count) {
        var pctChange = Math.round(Math.abs(cur.count - prev.count) / prev.count * 100);
        out.push({ k: cur.count > prev.count ? 'ok' : 'tip',
          html: 'فاکتورهای ' + esc(cur.label) + ' نسبت به ' + esc(prev.label) + ' <b>' + Num.group(pctChange) +
            '٪</b> ' + (cur.count > prev.count ? 'بیشتر' : 'کمتر') + ' شده است.' });
      } else if (prev.count === 0 && cur.count > 0) {
        out.push({ k: 'ok', html: 'شروع ' + esc(cur.label) + ' با <b>' + Num.group(cur.count) + '</b> فاکتور.' });
      }
    }
    if (s.thisMonth) {
      out.push({ k: 'tip', html: 'مجموع این ماه <b>' + Num.group(s.thisMonthSum) + '</b> ریال از <b>' +
        Num.group(s.thisMonth) + '</b> فاکتور.' });
    }
    if (!s.invoices) out.push({ k: 'tip', html: 'اولین فاکتور را از «دسترسی سریع» صادر کنید.' });
    if (!out.length) out.push({ k: 'ok', html: 'همه چیز مرتب است؛ موردی برای رسیدگی نیست.' });

    box.innerHTML = '';
    out.slice(0, 5).forEach(function (m) {
      var d = el('div', 'pa-item ' + m.k);
      d.innerHTML = '<span class="dot2"></span><div>' + m.html + '</div>';
      box.appendChild(d);
    });
  }

  /* ---------------------------------------------------------------
     Notes — one pair per administrator, kept until cleared
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
        // a written note starts locked, so a stray keystroke cannot change it
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
    }).catch(function (e) { UI.toast('یادداشت‌ها خوانده نشد: ' + e.message, { kind: 'bad' }); });

    function setLocked(b, locked) {
      var ta = b.querySelector('.note-area');
      ta.disabled = locked;
      b.querySelector('[data-act="edit"]').style.display = locked ? '' : 'none';
      b.querySelector('[data-act="save"]').style.display = locked ? 'none' : '';
    }
    function save(slot, text, saved, b) {
      API.post('notes.php?a=save', { slot: slot, text: text }).then(function () {
        saved.textContent = 'ذخیره شد';
        setTimeout(function () { saved.textContent = ''; }, 2200);
        setLocked(b, !!text);
      }).catch(function (e) { UI.toast('ذخیره نشد: ' + e.message, { kind: 'bad' }); });
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
    if (e && e.status === 401) { location.href = '/panel/login.php'; return; }
    UI.toast('خطا در بارگذاری پنل: ' + e.message, { kind: 'bad' });
  });
})();
