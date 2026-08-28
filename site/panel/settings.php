<?php
$PAGE_TITLE = 'تنظیمات — بریک کالا';
$SHELL_BACK = '/panel/';
require __DIR__ . '/_shell.php';
$first = !empty($_GET['first']);
?>
  <?php if ($first): ?>
  <div class="pcard" style="margin-bottom:16px;border-color:#EFCFC9">
    <div class="pcard-b pad" style="background:var(--danger-soft)">
      <b style="color:var(--danger-ink)">رمز پیش‌فرض را عوض کنید</b>
      <div style="font-size:13px;color:var(--danger-ink);margin-top:4px">
        حساب شما با نام کاربری و رمز <span class="ltr">admin</span> ساخته شده است. پیش از استفاده، از بخش «رمز عبور من» آن را تغییر دهید.
      </div>
    </div>
  </div>
  <?php endif; ?>

  <div class="pcard" style="margin-bottom:16px">
    <div class="pcard-h"><h2>تنظیمات</h2><span class="sp"></span>
      <div class="tabs" id="tabs">
        <button aria-selected="true" data-t="admins">ادمین‌ها</button>
        <button aria-selected="false" data-t="password">رمز عبور من</button>
        <button aria-selected="false" data-t="products">محصولات</button>
        <button aria-selected="false" data-t="data">داده‌ها</button>
      </div>
    </div>
    <div class="pcard-b pad" id="pane"><div class="empty">در حال بارگذاری…</div></div>
  </div>
<script src="/assets/js/core.js?v=<?= $ASSET_V ?>"></script>
<script src="/assets/js/settings.js?v=<?= $ASSET_V ?>"></script>
</body></html>
