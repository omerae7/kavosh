/* =====================================================================
   Settings — administrators, own password, the catalogue, and the data
   that can be carried away or wiped.
   ===================================================================== */
(function () {
  'use strict';
  var esc = UI.esc, el = UI.el;
  var pane = document.getElementById('pane');
  var tab = 'admins';

  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    tab = b.dataset.t;
    this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
    render();
  });

  function render() {
    pane.innerHTML = '<div class="empty">در حال بارگذاری…</div>';
    ({ admins: admins, password: password, products: products, data: dataPane })[tab]();
  }
  function fail(e) { pane.innerHTML = '<div class="empty"><b>خطا</b>' + esc(e.message) + '</div>'; }

  /* ---------------------------------------------------------------
     Administrators — up to five, all equal
     --------------------------------------------------------------- */
  function admins() {
    API.get('users.php?a=list').then(function (r) {
      var rows = r.items.map(function (u) {
        return '<tr><td><b>' + esc(u.name) + '</b>' + (u.me ? ' <span class="chip ok" style="height:20px;font-size:10.5px">شما</span>' : '') +
          (u.mustChange ? ' <span class="chip warn" style="height:20px;font-size:10.5px">رمز پیش‌فرض</span>' : '') +
          '</td><td class="ltr num">' + esc(u.u) + '</td>' +
          '<td style="white-space:nowrap">' +
            '<button class="btn xs ghost" data-edit="' + esc(u.u) + '">تغییر رمز</button> ' +
            (u.me ? '' : '<button class="btn xs ghost" data-del="' + esc(u.u) + '">حذف</button>') +
          '</td></tr>';
      }).join('');
      pane.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">' +
          '<div style="font-size:12.5px;color:var(--muted)">تا <b class="num">' + Num.group(r.max) +
          '</b> ادمین می‌توانید تعریف کنید. سطح دسترسی همه یکسان است؛ یادآورها و یادداشت‌های هر کس فقط برای خودش دیده می‌شود.</div>' +
          '<span style="flex:1"></span>' +
          (r.items.length < r.max ? '<button class="btn sm pri" id="addU">افزودن ادمین</button>' : '') +
        '</div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>نام</th><th>نام کاربری</th><th></th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>';

      var add = document.getElementById('addU');
      if (add) add.addEventListener('click', function () {
        var body = UI.modal('افزودن ادمین',
          '<div class="grid"><div class="f"><label>نام نمایشی</label><input class="inp" id="n"></div>' +
          '<div class="f"><label>نام کاربری <span class="opt">(لاتین)</span></label><input class="inp ltr" id="u" autocomplete="off"></div>' +
          '<div class="f"><label>رمز عبور</label><input class="inp ltr" id="p" type="text" autocomplete="new-password"></div></div>', [
          { label: 'افزودن', pri: true, act: function (b) {
              return API.post('users.php?a=add', {
                name: b.querySelector('#n').value, u: b.querySelector('#u').value, p: b.querySelector('#p').value
              }).then(function () { UI.toast('ادمین اضافه شد.', { kind: 'good' }); render(); })
                .catch(function (e) { UI.toast(e.message, { kind: 'bad' }); return true; });
            } },
          { label: 'انصراف' }
        ]);
        body.querySelector('#u').focus();
      });

      pane.querySelectorAll('[data-edit]').forEach(function (b) {
        b.addEventListener('click', function () {
          var body = UI.modal('تغییر رمز ' + b.dataset.edit,
            '<div class="f"><label>رمز جدید</label><input class="inp ltr" id="p" type="text" autocomplete="new-password"></div>', [
            { label: 'ذخیره', pri: true, act: function (bd) {
                return API.post('users.php?a=update', { u: b.dataset.edit, p: bd.querySelector('#p').value })
                  .then(function () { UI.toast('رمز تغییر کرد.', { kind: 'good' }); })
                  .catch(function (e) { UI.toast(e.message, { kind: 'bad' }); return true; });
              } },
            { label: 'انصراف' }
          ]);
          body.querySelector('#p').focus();
        });
      });
      pane.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          UI.confirm('حذف ادمین', 'حساب «' + b.dataset.del + '» به همراه یادآورها و یادداشت‌هایش حذف می‌شود.', 'حذف کن')
            .then(function (yes) {
              if (!yes) return;
              API.post('users.php?a=delete', { u: b.dataset.del })
                .then(function () { UI.toast('حذف شد.'); render(); })
                .catch(function (e) { UI.toast(e.message, { kind: 'bad' }); });
            });
        });
      });
    }).catch(fail);
  }

  /* ---------------------------------------------------------------
     Own password
     --------------------------------------------------------------- */
  function password() {
    pane.innerHTML =
      '<div class="grid g2" style="max-width:560px">' +
        '<div class="f"><label>رمز فعلی</label><input class="inp ltr" id="o" type="password" autocomplete="current-password"></div>' +
        '<div class="f"><label>رمز جدید</label><input class="inp ltr" id="n" type="password" autocomplete="new-password"></div>' +
      '</div><button class="btn pri" id="go" style="margin-top:14px">تغییر رمز</button>';
    document.getElementById('go').addEventListener('click', function () {
      API.post('auth.php?a=password', {
        old: document.getElementById('o').value, new: document.getElementById('n').value
      }).then(function () {
        UI.toast('رمز عبور تغییر کرد.', { kind: 'good' });
        document.getElementById('o').value = document.getElementById('n').value = '';
      }).catch(function (e) { UI.toast(e.message, { kind: 'bad' }); });
    });
  }

  /* ---------------------------------------------------------------
     Catalogue — the one list both pages read
     --------------------------------------------------------------- */
  var items = [];
  function products() {
    API.get('products.php?a=list').then(function (r) {
      items = r.items;
      drawProducts('');
    }).catch(fail);
  }
  function drawProducts(q) {
    pane.innerHTML =
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
        '<input class="inp" id="pq" placeholder="جستجوی کد یا شرح…" style="min-width:220px;width:auto;height:36px">' +
        '<span style="flex:1"></span>' +
        '<span style="font-size:12.5px;color:var(--muted)"><b class="num">' + Num.group(items.length) + '</b> کالا</span>' +
        '<button class="btn sm" id="pAdd">افزودن کالا</button>' +
        '<button class="btn sm pri" id="pSave">ذخیرهٔ تغییرات</button>' +
      '</div>' +
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:10px">' +
        'این فهرست در هر دو صفحهٔ <span class="ltr">/faktor</span> و <span class="ltr">/panel</span> یکی است. ' +
        'ستون‌های خالی یعنی آن اطلاعات موجود نیست و دستیار دربارهٔ آن پیشنهادی نمی‌دهد.</div>' +
      '<div class="tbl-wrap" style="max-height:56vh;overflow:auto"><table class="tbl" id="pt"></table></div>';

    var q2 = document.getElementById('pq');
    q2.value = q;
    var t; q2.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { fill(q2.value); }, 180); });
    document.getElementById('pSave').addEventListener('click', save);
    document.getElementById('pAdd').addEventListener('click', function () {
      items.unshift({ c: '', d: '', p: 0 });
      fill('');
      var first = document.querySelector('#pt input');
      if (first) first.focus();
    });
    fill(q);
  }
  function fill(q) {
    var needle = Num.normalize(q || '').toLowerCase().trim();
    var head = '<thead><tr><th>کد</th><th>شرح</th><th>بهای واحد</th><th>در متر</th><th>در کارتن</th>' +
      '<th>در پالت</th><th>واحد</th><th></th></tr></thead><tbody>';
    var body = '';
    items.forEach(function (p, i) {
      var hay = ((p.c || '') + ' ' + (p.d || '')).toLowerCase();
      if (needle && hay.indexOf(needle) < 0) return;
      body += '<tr data-i="' + i + '">' +
        cell(i, 'c', p.c, 'ltr', 92) + cell(i, 'd', p.d, '', 210) +
        cell(i, 'p', p.p, 'num', 110) + cell(i, 'm', p.m, 'num', 62) +
        cell(i, 'k', p.k, 'num', 62) + cell(i, 'l', p.l, 'num', 62) +
        cell(i, 'u', p.u || '', '', 74) +
        '<td><button class="btn xs ghost" data-rm="' + i + '">حذف</button></td></tr>';
    });
    var t = document.getElementById('pt');
    t.innerHTML = head + (body || '<tr><td class="empty" colspan="8">موردی پیدا نشد.</td></tr>') + '</tbody>';
    t.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var i = Number(inp.dataset.i), f = inp.dataset.f, v = inp.value;
        if (f === 'p' || f === 'm' || f === 'k' || f === 'l') {
          var n = Num.parse(v);
          if (n === null) delete items[i][f]; else items[i][f] = Math.round(n);
        } else items[i][f] = v;
      });
    });
    t.querySelectorAll('[data-rm]').forEach(function (b) {
      b.addEventListener('click', function () {
        items.splice(Number(b.dataset.rm), 1);
        fill(document.getElementById('pq').value);
      });
    });
  }
  function cell(i, f, v, cls, w) {
    return '<td><input class="inp ' + cls + '" data-i="' + i + '" data-f="' + f + '" value="' +
      esc(v === undefined || v === null ? '' : v) + '" style="height:32px;font-size:13px;width:' + w + 'px"></td>';
  }
  function save() {
    API.post('products.php?a=save', { items: items }).then(function (r) {
      UI.toast(Num.group(r.count) + ' کالا ذخیره شد. نسخهٔ قبلی برای بازگردانی نگه داشته شد.', { kind: 'good' });
    }).catch(function (e) { UI.toast(e.message, { kind: 'bad' }); });
  }

  /* ---------------------------------------------------------------
     Data — backup, restore, reset
     --------------------------------------------------------------- */
  function dataPane() {
    API.get('system.php?a=info').then(function (s) {
      var mb = function (b) { return Num.pct(b / 1048576, 2) + ' مگابایت'; };
      pane.innerHTML =
        '<div class="lk-stats" style="margin-bottom:16px">' +
          stat('فاکتورها', Num.group(s.invoices)) + stat('مشتریان', Num.group(s.customers)) +
          stat('کالاها', Num.group(s.products)) + stat('ادمین‌ها', Num.group(s.admins)) +
          stat('حجم PDFها', mb(s.pdfBytes)) + stat('حجم داده‌ها', mb(s.jsonBytes)) +
          stat('نسخهٔ PHP', s.php) + stat('امروز', Jalali.pretty(s.today)) +
        '</div>' +
        (s.writable ? '' : '<div class="check bad" style="margin-bottom:12px">پوشهٔ data یا storage قابل نوشتن نیست؛ ' +
          'در File Manager سطح دسترسی آنها را روی 755 بگذارید.</div>') +
        '<div class="grid g2" style="max-width:820px">' +
          box('گرفتن پشتیبان', 'یک فایل JSON شامل همهٔ مشتریان، فاکتورها، محصولات، یادآورها و یادداشت‌ها. ' +
              'آن را جای امنی نگه دارید.', '<a class="btn pri" href="/api/system.php?a=backup">دانلود فایل پشتیبان</a>') +
          box('بازگرداندن پشتیبان', 'فایل پشتیبان را انتخاب کنید. اطلاعات فعلی با محتوای فایل جایگزین می‌شود.',
              '<input type="file" id="rf" accept="application/json" style="display:none">' +
              '<button class="btn" id="rb">انتخاب فایل و بازگردانی</button>') +
        '</div>' +
        '<div class="pcard" style="margin-top:16px;border-color:#EFCFC9;box-shadow:none">' +
          '<div class="pcard-b pad">' +
            '<b style="color:var(--danger-ink)">پاک‌سازی کامل</b>' +
            '<div style="font-size:12.5px;color:var(--ink-2);margin:6px 0 12px">' +
              'همهٔ فاکتورها، فایل‌های PDF، مشتریان، یادآورها و یادداشت‌ها حذف می‌شوند. ' +
              'پیش از این کار حتماً پشتیبان بگیرید.</div>' +
            '<label class="lbl"><input type="checkbox" id="kp" checked> فهرست محصولات باقی بماند</label>' +
            '<label class="lbl" style="margin-top:6px"><input type="checkbox" id="ku" checked> حساب‌های ادمین باقی بمانند</label>' +
            '<button class="btn danger" id="rs" style="margin-top:12px">پاک‌سازی سامانه</button>' +
          '</div></div>';

      document.getElementById('rb').addEventListener('click', function () { document.getElementById('rf').click(); });
      document.getElementById('rf').addEventListener('change', function (e) {
        var f = e.target.files[0];
        if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          var bundle;
          try { bundle = JSON.parse(rd.result); } catch (er) { return UI.toast('فایل خوانده نشد.', { kind: 'bad' }); }
          UI.confirm('بازگرداندن پشتیبان', 'اطلاعات فعلی با محتوای این فایل جایگزین می‌شود. ادامه می‌دهید؟', 'بازگردانی')
            .then(function (yes) {
              if (!yes) return;
              API.post('system.php?a=restore', { bundle: bundle })
                .then(function (r) { UI.toast(Num.group(r.invoices) + ' فاکتور بازگردانی شد.', { kind: 'good' }); render(); })
                .catch(function (er2) { UI.toast(er2.message, { kind: 'bad' }); });
            });
        };
        rd.readAsText(f);
      });
      document.getElementById('rs').addEventListener('click', function () {
        var body = UI.modal('پاک‌سازی سامانه',
          '<p style="margin:0 0 10px">برای تأیید، عبارت <b class="ltr">RESET</b> را بنویسید.</p>' +
          '<input class="inp ltr" id="cf" placeholder="RESET">', [
          { label: 'پاک‌سازی', danger: true, act: function (b) {
              if (b.querySelector('#cf').value.trim() !== 'RESET') { UI.toast('عبارت تأیید درست نیست.', { kind: 'bad' }); return true; }
              return API.post('system.php?a=reset', {
                confirm: 'RESET',
                keepProducts: document.getElementById('kp').checked,
                keepUsers: document.getElementById('ku').checked
              }).then(function () { UI.toast('سامانه پاک‌سازی شد.'); render(); })
                .catch(function (e2) { UI.toast(e2.message, { kind: 'bad' }); return true; });
            } },
          { label: 'انصراف' }
        ]);
        body.querySelector('#cf').focus();
      });
    }).catch(fail);

    function stat(k, v) { return '<div class="lk-stat"><span>' + esc(k) + '</span><b class="num">' + esc(v) + '</b></div>'; }
    function box(t, d, a) {
      return '<div style="border:1px solid var(--line);border-radius:var(--r-md);padding:14px;background:var(--surface-2)">' +
        '<b style="font-size:13.5px">' + esc(t) + '</b>' +
        '<div style="font-size:12px;color:var(--muted);margin:6px 0 12px;line-height:1.8">' + esc(d) + '</div>' + a + '</div>';
    }
  }

  API.boot().then(render).catch(function (e) {
    if (e.status === 401) location.href = '/panel/login.php'; else fail(e);
  });
})();
