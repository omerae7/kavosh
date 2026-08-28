<?php
$PAGE_TITLE = 'پیش‌فاکتورهای صادر شده — بریک کالا';
$SHELL_BACK = '/panel/';
require __DIR__ . '/_shell.php';
?>
  <div class="pcard">
    <div class="pcard-h">
      <h2>پیش‌فاکتورهای صادر شده</h2>
      <span class="sp"></span>
      <div class="ptools">
        <input class="inp" id="q" type="search" placeholder="جستجوی نام، شماره فاکتور یا تلفن…" autocomplete="off"
               value="<?= htmlspecialchars($_GET['q'] ?? '', ENT_QUOTES) ?>">
        <a class="btn sm pri" href="/panel/invoice.php">فاکتور جدید</a>
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
    tbl.innerHTML = '<tbody><tr><td class="empty">در حال بارگذاری…</td></tr></tbody>';
    API.get('invoices.php?a=list', { q: q.value, limit: 300 }).then(function (r) {
      if (!r.items.length) {
        tbl.innerHTML = '<tbody><tr><td class="empty"><b>موردی پیدا نشد</b>' +
          (q.value ? 'جستجو را تغییر دهید.' : 'هنوز فاکتوری صادر نشده است.') + '</td></tr></tbody>';
        return;
      }
      var h = '<thead><tr><th>تاریخ</th><th>شماره</th><th>نام مشتری</th><th>اقلام</th>' +
              '<th>تخفیف</th><th>قابل پرداخت</th><th></th></tr></thead><tbody>';
      r.items.forEach(function (x) {
        h += '<tr>' +
          '<td><span class="num">' + esc(Jalali.pretty(x.date)) + '</span>' +
            (x.kind === 'kasri' ? ' <span class="chip warn" style="height:20px;font-size:10.5px">کسری بار</span>' : '') + '</td>' +
          '<td class="num">' + esc(x.id) + '</td>' +
          '<td><b>' + esc(x.customerName) + '</b>' +
            (x.phone ? '<br><small class="num" style="color:var(--muted)">' + esc(x.phone) + '</small>' : '') + '</td>' +
          '<td class="num">' + Num.group(x.items || 0) + '</td>' +
          '<td class="num">' + Num.group(x.discount) + '</td>' +
          '<td class="num"><b>' + Num.group(x.payable) + '</b></td>' +
          '<td style="white-space:nowrap">' +
            (x.pdf ? '<a class="btn xs" href="/api/pdf.php?id=' + encodeURIComponent(x.id) + '&dl=1">PDF</a> ' : '') +
            '<a class="btn xs ghost" href="/panel/invoice.php?open=' + encodeURIComponent(x.id) + '">بازکردن</a> ' +
            '<button class="btn xs ghost" data-del="' + esc(x.id) + '">حذف</button>' +
          '</td></tr>';
      });
      tbl.innerHTML = h + '</tbody>';
      tbl.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          UI.confirm('حذف فاکتور', 'فاکتور ' + b.dataset.del + ' و فایل PDF آن حذف می‌شود. این کار برگشت‌پذیر نیست.', 'حذف کن')
            .then(function (yes) {
              if (!yes) return;
              API.post('invoices.php?a=delete', { id: b.dataset.del })
                .then(function () { UI.toast('حذف شد.'); load(); })
                .catch(function (e) { UI.toast(e.message, { kind: 'bad' }); });
            });
        });
      });
    }).catch(function (e) {
      tbl.innerHTML = '<tbody><tr><td class="empty">' + esc(e.message) + '</td></tr></tbody>';
    });
  }
  var t; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(load, 220); });
  API.boot().then(load);
})();
</script>
</body></html>
