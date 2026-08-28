/* =====================================================================
   Panel chrome: the rail on small screens, and the messages drawer.
   Loaded by every panel page.
   ===================================================================== */
(function () {
  'use strict';
  var esc = UI.esc;

  /* ---- rail ---- */
  var rail = document.getElementById('rail');
  var scrim = document.getElementById('railScrim');
  var railBtn = document.getElementById('railBtn');
  function closeRail() { rail.classList.remove('on'); scrim.classList.remove('on'); }
  if (railBtn) {
    railBtn.addEventListener('click', function () {
      rail.classList.toggle('on');
      scrim.classList.toggle('on', rail.classList.contains('on'));
    });
    scrim.addEventListener('click', closeRail);
  }

  /* ---- messages ---- */
  var bell = document.getElementById('bell');
  var count = document.getElementById('bellCount');
  var drawer = document.getElementById('msgDrawer');
  var list = document.getElementById('msgList');
  var loaded = false;

  function paintCount(n) {
    if (!count) return;
    count.textContent = n ? Num.group(n) : '';
    count.classList.toggle('zero', !n);
    if (n) bell.classList.add('bell-ring');
  }

  function load() {
    return API.get('messages.php?a=list').then(function (r) {
      paintCount(r.unread);
      window.__unread = r.unread;
      render(r.items);
      loaded = true;
      return r;
    }).catch(function () { /* the bell simply stays quiet */ });
  }

  function render(items) {
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="wempty">پیامی نیست.<br>هر فاکتوری که از صفحهٔ عمومی یا توسط ادمین دیگری ثبت شود اینجا می‌آید.</div>';
      return;
    }
    list.innerHTML = items.map(function (m) {
      var icon = m.kind === 'dup'
        ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5.5v5M10 13.6h.01"/><circle cx="10" cy="10" r="7"/></svg>'
        : m.kind === 'faktor'
        ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17Z"/><path d="M11 2.5v4h4"/></svg>'
        : '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="2.7"/><path d="M4.5 16.5a5.5 5.5 0 0 1 11 0"/></svg>';
      var tail = m.kind === 'dup'
        ? 'یک شماره برای چند مشتری ثبت شده است'
        : Jalali.html(m.date) + ' · ' + UI.ago(m.at) + ' · شمارهٔ ' + esc(m.invoice);
      return '<a class="msg-i' + (m.read ? '' : ' unread') +
        (m.kind === 'panel' ? ' panel-src' : '') + (m.kind === 'dup' ? ' warn-src' : '') +
        '" href="' + esc(m.href || ('/panel/invoice.php?open=' + encodeURIComponent(m.invoice))) + '">' +
        '<span class="mi">' + icon + '</span>' +
        '<span class="mb"><b>' + esc(m.title) + '</b>' +
        '<span>' + esc(m.name) + '</span>' +
        '<small>' + tail + '</small></span>' +
        (m.payable ? '<span class="mv">' + Num.group(m.payable) + '</span>' : '') + '</a>';
    }).join('');
  }

  function open() {
    drawer.classList.add('on');
    drawer.setAttribute('aria-hidden', 'false');
    scrim.classList.add('on');
    bell.classList.remove('bell-ring');
    var p = loaded ? Promise.resolve() : load();
    p.then(function () {
      // opening the drawer is what marks them read
      if (window.__unread) {
        API.post('messages.php?a=seen', {}).then(function () {
          paintCount(0);
          window.__unread = 0;
          setTimeout(function () {
            list.querySelectorAll('.msg-i.unread').forEach(function (x) { x.classList.remove('unread'); });
          }, 900);
        }).catch(function () { /* keep the badge if it did not stick */ });
      }
    });
  }
  function close() {
    drawer.classList.remove('on');
    drawer.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('on');
  }
  if (bell) {
    bell.addEventListener('click', function () {
      drawer.classList.contains('on') ? close() : open();
    });
    document.getElementById('msgClose').addEventListener('click', close);
    scrim.addEventListener('click', function () { close(); closeRail(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  API.boot().then(load).catch(function (e) {
    if (e && e.status === 401) location.href = '/panel/login.php';
  });
})();

/* Sub-pages hand their body in as window.__page and run once the CSRF
   token is in hand, so no page needs its own boot dance.

   The check waits for DOMContentLoaded: a page may declare __page in an
   inline script above this file, or in a script tag below it, and only
   the first of those has run by the time this line is reached. */
(function () {
  function go() {
    if (typeof window.__page !== 'function') return;
    API.boot().then(window.__page).catch(function (e) {
      if (e && e.status === 401) location.href = '/panel/login.php';
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
})();
