<?php
$PAGE_TITLE = 'پروفایل مشتری — بریک کالا';
$PAGE_HEAD  = 'پروفایل مشتری';
$SHELL_BACK = '/panel/customers.php';
$NAV = 'customers';
require __DIR__ . '/_shell.php';
$cid = (string) ($_GET['id'] ?? '');
?>
<div id="wrap"><div class="pc"><div class="pc-b"><div class="skel" style="width:30%"></div>
  <div class="skel" style="margin-top:12px"></div></div></div></div>
<script>
window.__page = function () {
  var esc = UI.esc, CID = <?= json_encode($cid) ?>;
  API.get('customers.php?a=get', { id: CID }).then(function (r) {
    var c = r.customer, inv = r.invoices || [];
    var stats = [
      ['تعداد فاکتورها', Num.group(c.count) + ' فاکتور'],
      ['جمع کل خریدها', Num.group(c.total) + ' ریال'],
      ['آخرین فاکتور', inv.length ? Jalali.pretty(inv[0].date) : '—'],
      ['اولین خرید', c.firstDate ? Jalali.pretty(c.firstDate) : '—']
    ].map(function (kv) {
      return '<div class="st"><span>' + esc(kv[0]) + '</span><b class="num">' + esc(kv[1]) + '</b></div>';
    }).join('');

    var rows = inv.length ? inv.map(function (x) {
      return '<tr>' +
        '<td>' + Jalali.html(x.date) + '</td>' +
        '<td class="num">' + esc(x.id) + '</td>' +
        '<td class="num">' + Num.group(x.items || 0) + '</td>' +
        '<td class="num">' + Num.group(x.discount) + '</td>' +
        '<td class="num"><b>' + Num.group(x.payable) + '</b></td>' +
        '<td style="white-space:nowrap">' +
          '<a class="btn xs" href="/panel/invoice.php?open=' + encodeURIComponent(x.id) + '">ویرایش</a> ' +
          (x.pdf ? '<a class="btn xs ghost" href="/api/pdf.php?id=' + encodeURIComponent(x.id) + '&dl=1">PDF</a>' : '') +
        '</td></tr>';
    }).join('') : '<tr><td class="empty" colspan="6">فاکتوری ثبت نشده است.</td></tr>';

    document.getElementById('wrap').innerHTML =
      '<div class="pc" style="margin-bottom:16px"><div class="pc-h">' +
        '<h3>' + esc(c.name) + '</h3><span class="sp"></span>' +
        '<a class="btn sm pri" href="/panel/invoice.php?customer=' + encodeURIComponent(c.id) + '">فاکتور جدید برای این مشتری</a>' +
      '</div><div class="pc-b">' +
        '<div class="acts" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + stats + '</div>' +
        '<div class="grid g3" style="margin-top:16px">' +
          field('شماره تلفن', c.phone) + field('استان / شهر', c.province) +
          field('کد پستی', c.postal) + field('کد ملی', c.nationalId) +
          '<div class="f span2">' + labelled('نشانی', c.address) + '</div>' +
        '</div>' +
      '</div></div>' +
      '<div class="pc"><div class="pc-h"><h3>فاکتورهای این مشتری</h3></div>' +
      '<div class="pc-b flush"><div class="tbl-wrap"><table class="tbl">' +
      '<thead><tr><th>تاریخ</th><th>شماره</th><th>اقلام</th><th>تخفیف</th><th>مبلغ کل (ریال)</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div></div>';

    function field(k, v) { return '<div class="f">' + labelled(k, v) + '</div>'; }
    function labelled(k, v) {
      return '<label>' + esc(k) + '</label><div class="inp" style="display:flex;align-items:center;' +
        'background:var(--surface-3);color:' + (v ? 'var(--ink)' : 'var(--muted-2)') + '">' +
        esc(v || '—') + '</div>';
    }
  }).catch(function (e) {
    document.getElementById('wrap').innerHTML =
      '<div class="pc"><div class="pc-b empty"><b>خطا</b>' + esc(e.message) + '</div></div>';
  });
};
</script>
<?php require __DIR__ . '/_foot.php'; ?>
