<?php
$PAGE_TITLE = 'مشتریان — بریک کالا';
$SHELL_BACK = '/panel/';
require __DIR__ . '/_shell.php';
?>
  <div class="pcard">
    <div class="pcard-h">
      <h2>مشتریان</h2>
      <span class="sp"></span>
      <div class="ptools">
        <input class="inp" id="q" type="search" placeholder="جستجوی نام یا تلفن…" autocomplete="off">
      </div>
    </div>
    <div class="pcard-b">
      <div class="tbl-wrap"><table class="tbl" id="tbl"><tbody><tr><td class="empty">در حال بارگذاری…</td></tr></tbody></table></div>
    </div>
  </div>
<script src="/assets/js/core.js?v=<?= $ASSET_V ?>"></script>
<script>
(function () {
  var esc = UI.esc, tbl = document.getElementById('tbl'), q = document.getElementById('q');
  function load() {
    API.get('customers.php?a=list', { q: q.value }).then(function (r) {
      if (!r.items.length) {
        tbl.innerHTML = '<tbody><tr><td class="empty"><b>موردی پیدا نشد</b>' +
          (q.value ? 'جستجو را تغییر دهید.' : 'با صدور اولین فاکتور، مشتری ثبت می‌شود.') + '</td></tr></tbody>';
        return;
      }
      var h = '<thead><tr><th>نام مشتری</th><th>تلفن</th><th>شهر</th><th>تعداد فاکتور</th>' +
              '<th>جمع کل</th><th>آخرین فاکتور</th><th></th></tr></thead><tbody>';
      r.items.forEach(function (c) {
        h += '<tr>' +
          '<td><b>' + esc(c.name) + '</b></td>' +
          '<td class="num">' + esc(c.phone || '—') + '</td>' +
          '<td>' + esc(c.province || '—') + '</td>' +
          '<td class="num">' + Num.group(c.count) + '</td>' +
          '<td class="num"><b>' + Num.group(c.total) + '</b></td>' +
          '<td class="num">' + esc(c.lastDate ? Jalali.pretty(c.lastDate) : '—') + '</td>' +
          '<td style="white-space:nowrap">' +
            '<a class="btn xs" href="/panel/customer.php?id=' + encodeURIComponent(c.id) + '">پروفایل</a> ' +
            '<a class="btn xs ghost" href="/panel/invoice.php?customer=' + encodeURIComponent(c.id) + '">فاکتور جدید</a>' +
          '</td></tr>';
      });
      tbl.innerHTML = h + '</tbody>';
    }).catch(function (e) {
      tbl.innerHTML = '<tbody><tr><td class="empty">' + esc(e.message) + '</td></tr></tbody>';
    });
  }
  var t; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(load, 220); });
  API.boot().then(load);
})();
</script>
</body></html>
