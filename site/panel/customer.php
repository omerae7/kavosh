<?php
$PAGE_TITLE = 'پروفایل مشتری — بریک کالا';
$SHELL_BACK = '/panel/customers.php';
require __DIR__ . '/_shell.php';
$cid = (string) ($_GET['id'] ?? '');
?>
  <div id="wrap"><div class="pcard"><div class="pcard-b pad"><div class="skel" style="width:30%"></div>
    <div class="skel" style="margin-top:12px"></div></div></div></div>
<script src="/assets/js/core.js?v=<?= $ASSET_V ?>"></script>
<script>
(function () {
  var esc = UI.esc, CID = <?= json_encode($cid) ?>;
  API.boot().then(function () { return API.get('customers.php?a=get', { id: CID }); }).then(function (r) {
    var c = r.customer, inv = r.invoices || [];
    var stats = [
      ['تعداد فاکتورها', Num.group(c.count) + ' فاکتور'],
      ['جمع کل خریدها', Num.group(c.total) + ' ریال'],
      ['آخرین فاکتور', inv.length ? Jalali.pretty(inv[0].date) : '—'],
      ['اولین خرید', c.firstDate ? Jalali.pretty(c.firstDate) : '—']
    ].map(function (kv) {
      return '<div class="lk-stat"><span>' + esc(kv[0]) + '</span><b class="num">' + esc(kv[1]) + '</b></div>';
    }).join('');

    var rows = inv.length ? inv.map(function (x) {
      return '<tr>' +
        '<td class="num">' + esc(Jalali.pretty(x.date)) + '</td>' +
        '<td class="num">' + esc(x.id) + '</td>' +
        '<td class="num">' + Num.group(x.items || 0) + '</td>' +
        '<td class="num">' + Num.group(x.discount) + '</td>' +
        '<td class="num"><b>' + Num.group(x.payable) + '</b></td>' +
        '<td style="white-space:nowrap">' +
          (x.pdf ? '<a class="btn xs" href="/api/pdf.php?id=' + encodeURIComponent(x.id) + '&dl=1">PDF</a> ' : '') +
          '<a class="btn xs ghost" href="/panel/invoice.php?open=' + encodeURIComponent(x.id) + '">بازکردن</a>' +
        '</td></tr>';
    }).join('') : '<tr><td class="empty" colspan="6">فاکتوری ثبت نشده است.</td></tr>';

    document.getElementById('wrap').innerHTML =
      '<div class="pcard" style="margin-bottom:16px"><div class="pcard-h">' +
        '<h2>' + esc(c.name) + '</h2><span class="sp"></span>' +
        '<a class="btn sm pri" href="/panel/invoice.php?customer=' + encodeURIComponent(c.id) + '">فاکتور جدید برای این مشتری</a>' +
      '</div><div class="pcard-b pad">' +
        '<div class="lk-stats">' + stats + '</div>' +
        '<div class="grid g3" style="margin-top:16px">' +
          field('شماره تلفن', c.phone) + field('استان / شهر', c.province) +
          field('کد پستی', c.postal) + field('کد ملی', c.nationalId) +
          '<div class="f span2">' + labelled('نشانی', c.address) + '</div>' +
        '</div>' +
      '</div></div>' +
      '<div class="pcard"><div class="pcard-h"><h2>فاکتورهای این مشتری</h2></div>' +
      '<div class="pcard-b"><div class="tbl-wrap"><table class="tbl">' +
      '<thead><tr><th>تاریخ</th><th>شماره</th><th>اقلام</th><th>تخفیف</th><th>قابل پرداخت</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div></div>';

    function field(k, v) { return '<div class="f">' + labelled(k, v) + '</div>'; }
    function labelled(k, v) {
      return '<label>' + esc(k) + '</label><div class="inp" style="display:flex;align-items:center;' +
        'background:var(--surface-3);color:' + (v ? 'var(--ink)' : 'var(--muted-2)') + '">' +
        esc(v || '—') + '</div>';
    }
  }).catch(function (e) {
    document.getElementById('wrap').innerHTML =
      '<div class="pcard"><div class="pcard-b pad empty"><b>خطا</b>' + esc(e.message) + '</div></div>';
  });
})();
</script>
</body></html>
