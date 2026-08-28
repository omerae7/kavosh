/* =====================================================================
   The assistant's window.

   Plumbing only: it opens a panel, asks assistant-brain.js what to say,
   and reports clicks back. Every phrase, number and formula lives in the
   brain, so this file rarely needs touching.

   Never loaded on the composer — neither in the panel nor on /faktor —
   because those pages carry their own row-level assistant and the two
   would talk over each other.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.Brain || !window.API) return;

  var ICONS = {
    spark: '<svg viewBox="0 0 32 32" fill="none"><defs>' +
      '<linearGradient id="aiG" x1="0" y1="1" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#F0A03C"/><stop offset=".38" stop-color="#E0603C"/>' +
      '<stop offset=".72" stop-color="#8C63F0"/><stop offset="1" stop-color="#2E9BEE"/></linearGradient></defs>' +
      '<path class="s1" fill="url(#aiG)" d="M12.2 2.6c.4-1.1 2-1.1 2.4 0l1.7 5c.4 1.2 1.3 2.1 2.5 2.5l5 1.7c1.1.4 1.1 2 0 2.4l-5 1.7a4 4 0 0 0-2.5 2.5l-1.7 5c-.4 1.1-2 1.1-2.4 0l-1.7-5a4 4 0 0 0-2.5-2.5l-5-1.7c-1.1-.4-1.1-2 0-2.4l5-1.7a4 4 0 0 0 2.5-2.5Z"/>' +
      '<path class="s2" fill="url(#aiG)" d="M23.4 19.2c.25-.72 1.27-.72 1.52 0l.86 2.5c.24.7.79 1.25 1.5 1.5l2.5.86c.72.25.72 1.27 0 1.52l-2.5.86c-.71.25-1.26.8-1.5 1.5l-.86 2.5c-.25.72-1.27.72-1.52 0l-.86-2.5c-.24-.7-.79-1.25-1.5-1.5l-2.5-.86c-.72-.25-.72-1.27 0-1.52l2.5-.86c.71-.25 1.26-.8 1.5-1.5Z"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    send:  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3 9 11"/><path d="M17 3l-5 14-3-6-6-3Z"/></svg>',
    home:      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1Z"/></svg>',
    invoices:  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 5h14M3 10h14M3 15h9"/></svg>',
    customers: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="2.7"/><path d="M3 16.5a5 5 0 0 1 10 0"/><path d="M14 4.7a2.6 2.6 0 0 1 0 4.9M17 16.5a4.9 4.9 0 0 0-2-3.9"/></svg>',
    reminders: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 0 0-5-5Z"/><path d="M8.2 16.5a1.9 1.9 0 0 0 3.6 0"/></svg>',
    products:  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5h5M12 6.5h5M3 13.5h9M16 13.5h1"/><circle cx="10" cy="6.5" r="2"/><circle cx="14" cy="13.5" r="2"/></svg>',
    settings:  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" stroke-linecap="round"/></svg>',
    profile:   '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4.5 16.8a5.5 5.5 0 0 1 11 0"/></svg>',
    newInvoice:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17Z"/><path d="M11 2.5v4h4"/><path d="M10 10v4M8 12h4"/></svg>'
  };

  var esc = UI.esc, el = UI.el;
  var DATA = null, ctx = null, busy = false, opened = false;

  /* ---------------------------------------------------------------
     Markup
     --------------------------------------------------------------- */
  var launch = el('button', 'ai-launch');
  launch.type = 'button';
  launch.setAttribute('aria-label', 'دستیار هوشمند');
  launch.title = 'دستیار هوشمند';
  launch.innerHTML = ICONS.spark + '<span class="dot" id="aiDot"></span>';

  var panel = el('aside', 'ai');
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML =
    '<div class="ai-h">' +
      '<span class="mark">' + ICONS.spark.replace(/class="s[12]"/g, '').replace(/url\(#aiG\)/g, 'currentColor') + '</span>' +
      '<span class="t"><b>دستیار هوشمند</b><small id="aiWhere">بریک کالا</small></span>' +
      '<button class="ai-x" type="button" id="aiClose" aria-label="بستن">' + ICONS.close + '</button>' +
    '</div>' +
    '<div class="ai-b" id="aiBody"></div>' +
    '<div class="ai-chips" id="aiChips"></div>' +
    '<form class="ai-f" id="aiForm">' +
      '<input id="aiIn" type="text" autocomplete="off" placeholder="بپرسید…" enterkeyhint="send">' +
      '<button type="submit" aria-label="بفرست">' + ICONS.send + '</button>' +
    '</form>';

  document.body.appendChild(launch);
  document.body.appendChild(panel);

  var body  = panel.querySelector('#aiBody');
  var chips = panel.querySelector('#aiChips');
  var input = panel.querySelector('#aiIn');
  var form  = panel.querySelector('#aiForm');

  /* ---------------------------------------------------------------
     Saying things
     --------------------------------------------------------------- */
  function bubble(kind, html) {
    var m = el('div', 'ai-m ' + kind);
    m.innerHTML = html;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  }

  function linksOf(list) {
    list = (list || []).filter(Boolean);
    if (!list.length) return '';
    return '<div class="ai-links">' + list.map(function (l) {
      return '<a href="' + esc(l.href) + '" title="' + esc(l.label) + '" aria-label="' + esc(l.label) + '">' +
        (ICONS[l.key] || ICONS.home) + '</a>';
    }).join('') + '</div>';
  }

  function setChips(list) {
    chips.innerHTML = '';
    (list || []).slice(0, 4).forEach(function (t) {
      var b = el('button', null, esc(t));
      b.type = 'button';
      b.addEventListener('click', function () { ask(t); });
      chips.appendChild(b);
    });
    chips.style.display = chips.children.length ? '' : 'none';
  }

  function thinking() {
    var d = el('div', 'ai-m bot ai-dots');
    d.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }

  /* Render one answer: text, icon links, and any question it asks back. */
  function say(res) {
    var m = bubble('bot', res.html + linksOf(res.links));
    if (res.action && res.action.kind === 'reminder') {
      var wrap = el('div', 'ai-act');
      var go = el('button', 'go', esc(res.action.confirm || 'باشد'));
      var no = el('button', null, esc(res.action.cancel || 'بی‌خیال'));
      go.type = no.type = 'button';
      go.addEventListener('click', function () {
        wrap.remove();
        API.post('reminders.php?a=add', { text: res.action.text })
          .then(function () {
            bubble('bot', 'ثبت شد ✓ «' + esc(res.action.text) + '» به یادآورها اضافه شد.' +
              linksOf([Brain.links.reminders && { key: 'reminders', href: Brain.links.reminders.href, label: Brain.links.reminders.label }]));
            if (DATA && DATA.reminders) DATA.reminders.open++;
          })
          .catch(function (e) { bubble('bot', 'ثبت نشد: ' + esc(e.message)); });
      });
      no.addEventListener('click', function () { wrap.remove(); bubble('bot', 'باشد، ثبتش نکردم.'); });
      wrap.appendChild(go); wrap.appendChild(no);
      m.appendChild(wrap);
      body.scrollTop = body.scrollHeight;
    }
    if (res.chips) setChips(res.chips);
  }

  /* ---------------------------------------------------------------
     Asking
     --------------------------------------------------------------- */
  function ask(text) {
    text = String(text || '').trim();
    if (!text || busy || !DATA) return;
    busy = true;
    bubble('me', esc(text));
    setChips([]);
    var dots = thinking();
    // a beat of thought reads as considered; any longer would read as slow
    setTimeout(function () {
      dots.remove();
      say(Brain.answer(text, DATA, ctx));
      busy = false;
      if (!isPhone()) input.focus();
    }, 260);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value;
    input.value = '';
    ask(t);
  });

  /* ---------------------------------------------------------------
     Opening and closing
     --------------------------------------------------------------- */
  function isPhone() { return window.matchMedia('(max-width:640px)').matches; }

  function open() {
    panel.classList.add('on');
    panel.setAttribute('aria-hidden', 'false');
    launch.classList.add('open');
    fitKeyboard();
    if (!opened) {
      opened = true;
      load().then(function () {
        var g = Brain.greeting(ctx, DATA);
        say(g);
        var where = document.getElementById('aiWhere');
        if (where) where.textContent = 'در صفحهٔ ' + (({
          home: 'داشبورد', invoices: 'پیش‌فاکتورها', customers: 'مشتریان',
          customer: 'پروندهٔ مشتری', reminders: 'یادآورها',
          settings: 'تنظیمات', profile: 'پروفایل'
        })[ctx.page] || 'پنل');
      });
    }
    if (!isPhone()) setTimeout(function () { input.focus(); }, 240);
  }

  function close() {
    panel.classList.remove('on');
    panel.setAttribute('aria-hidden', 'true');
    launch.classList.remove('open');
    input.blur();
  }

  launch.addEventListener('click', open);
  panel.querySelector('#aiClose').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('on')) close();
  });

  /* ---------------------------------------------------------------
     The software keyboard

     On a phone the keyboard covers the bottom of the window without the
     layout viewport noticing, so the sheet would sit underneath it. The
     visual viewport does notice: the difference between the two is how
     much the keyboard has taken, and the sheet is lifted by exactly that.
     --------------------------------------------------------------- */
  function fitKeyboard() {
    var vv = window.visualViewport;
    if (!vv) return;
    var kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    panel.style.setProperty('--ai-kb', kb + 'px');
    panel.style.setProperty('--ai-vh', Math.round(vv.height) + 'px');
    if (kb > 0) body.scrollTop = body.scrollHeight;
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitKeyboard);
    window.visualViewport.addEventListener('scroll', fitKeyboard);
  }
  input.addEventListener('focus', function () { setTimeout(fitKeyboard, 60); });
  input.addEventListener('blur', function () { setTimeout(fitKeyboard, 60); });

  /* ---------------------------------------------------------------
     Data
     --------------------------------------------------------------- */
  function load() {
    return API.get('assistant.php').then(function (d) {
      DATA = d;
      var dot = document.getElementById('aiDot');
      if (dot) {
        var n = (d.unread || 0) + (d.dupPhones ? d.dupPhones.length : 0);
        dot.textContent = n ? Num.group(n) : '';
      }
      return d;
    }).catch(function (e) {
      if (e && e.status === 401) { location.href = '/panel/login.php'; return; }
      DATA = null;
      bubble('bot', 'دادهٔ پنل خوانده نشد: ' + esc(e.message));
    });
  }

  ctx = {
    page: Brain.pageOf(location.pathname),
    customerName: (document.querySelector('.pc-h h3') && /customer\.php/.test(location.pathname))
      ? document.querySelector('.pc-h h3').textContent.trim() : ''
  };

  /* A quiet first fetch, so the badge is honest before anyone clicks. */
  API.boot().then(load).catch(function () { /* the launcher simply waits */ });
})();
