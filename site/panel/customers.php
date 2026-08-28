<?php
$PAGE_TITLE = 'مشتریان — بریک کالا';
$PAGE_HEAD  = 'مشتریان';
$PAGE_SUB   = 'تازه‌ترین خرید در بالا';
$NAV = 'customers';
require __DIR__ . '/_shell.php';
?>
<div class="pc">
  <div class="pc-h">
    <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="2.7"/><path d="M3 16.5a5 5 0 0 1 10 0"/><path d="M14 4.7a2.6 2.6 0 0 1 0 4.9M17 16.5a4.9 4.9 0 0 0-2-3.9"/></svg>
    <h3>فهرست مشتریان</h3>
    <span class="sp"></span>
    <div class="ptools"><input class="inp" id="q" type="search" placeholder="جستجوی نام یا تلفن…" autocomplete="off"></div>
  </div>
  <div class="pc-b flush">
    <div class="tbl-wrap"><table class="tbl" id="tbl"><tbody><tr><td class="empty">در حال بارگذاری…</td></tr></tbody></table></div>
  </div>
</div>
<script>
window.__page = function () {
  var esc = UI.esc, tbl = document.getElementById('tbl'), q = document.getElementById('q');
  function load() {
    API.get('customers.php?a=list', { q: q.value }).then(function (r) {
      if (!r.items.length) {
        tbl.innerHTML = '<tbody><tr><td class="empty"><b>موردی پیدا نشد</b>' +
          (q.value ? 'جستجو را تغییر دهید.' : 'با صدور اولین فاکتور، مشتری ثبت می‌شود.') + '</td></tr></tbody>';
        return;
      }
      var h = '<thead><tr><th>نام مشتری</th><th>تلفن</th><th>شهر</th><th>تعداد فاکتور</th>' +
              '<th>جمع کل (ریال)</th><th>آخرین فاکتور</th><th></th></tr></thead><tbody>';
      r.items.forEach(function (c) {
        var prof = '/panel/customer.php?id=' + encodeURIComponent(c.id);
        h += '<tr>' +
          '<td><a class="namelink" href="' + prof + '"><b>' + esc(c.name) + '</b></a></td>' +
          '<td class="num">' + esc(c.phone || '—') + '</td>' +
          '<td>' + esc(c.province || '—') + '</td>' +
          '<td class="num">' + Num.group(c.count) + '</td>' +
          '<td class="num"><b>' + Num.group(c.total) + '</b></td>' +
          '<td>' + (c.lastDate ? Jalali.html(c.lastDate) : '—') + '</td>' +
          '<td style="white-space:nowrap">' +
            '<a class="btn xs" href="' + prof + '">پروفایل</a> ' +
            '<a class="btn xs ghost" href="/panel/invoice.php?customer=' + encodeURIComponent(c.id) + '">فاکتور جدید</a>' +
          '</td></tr>';
      });
      tbl.innerHTML = h + '</tbody>';
    }).catch(function (e) {
      tbl.innerHTML = '<tbody><tr><td class="empty">' + esc(e.message) + '</td></tr></tbody>';
    });
  }
  /* a link may arrive with the search already decided — the duplicate
     telephone warning points here with the number in hand */
  var pre = new URLSearchParams(location.search).get('q');
  if (pre) q.value = pre;
  var t; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(load, 220); });
  load();
};
</script>
<?php require __DIR__ . '/_foot.php'; ?>
