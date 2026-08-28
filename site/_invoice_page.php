<?php
/* The invoice composer, shared by /faktor and /panel.

   $INVOICE_MODE is 'faktor' or 'panel'. The only difference the markup
   carries is the back link and the mode flag; the panel's extra section
   is drawn by the script, and history never reaches this page. */
require __DIR__ . '/_cfg.php';
$mode = $INVOICE_MODE ?? 'faktor';
$PAGE_TITLE = 'صدور پیش فاکتور — بریک کالا';
$PAGE_CSS = ['invoice.css'];
require __DIR__ . '/_head.php';
?>
<body>

<header class="topbar">
  <?php if ($mode === 'panel'): ?>
  <a class="brand" href="/panel/" title="بازگشت به پنل">
  <?php else: ?>
  <a class="brand" href="/">
  <?php endif; ?>
    <img class="brand-mark" src="/assets/img/logo.png" alt="" aria-hidden="true">
    <span class="brand-txt">
      <b>پیش فاکتور فروش</b>
      <span>آجر نسوز آذرخش — پودر بند کشی فلکس</span>
    </span>
  </a>
  <div class="topbar-sp"></div>
  <div class="topbar-actions">
    <?php if ($mode === 'panel'): ?>
    <a class="btn sm ghost" href="/panel/" title="پنل">
      <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/></svg>
      <span class="lbl-txt">پنل</span>
    </a>
    <?php endif; ?>
    <button class="btn sm ghost" id="btnNew" type="button" title="فاکتور جدید">
      <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h7l5 5v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M11 4v5h5"/></svg>
      <span class="lbl-txt">فاکتور جدید</span>
    </button>
    <button class="btn sm pri" id="btnPdfTop" type="button">
      <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9"/><path d="m6.5 8.5 3.5 3.5 3.5-3.5"/><path d="M4 15v1.5A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V15"/></svg>
      صدور PDF
    </button>
  </div>
</header>

<main class="wrap">
  <div class="col" id="mainCol"></div>
  <div class="col aside" id="asideCol"></div>
</main>

<div class="mobar" id="mobar">
  <div class="mb-tot">
    <span>قابل پرداخت</span>
    <b id="mbTotal" class="num">0</b>
  </div>
  <button class="btn" id="btnPrintMob" type="button" title="پرینت" aria-label="پرینت">
    <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8V3h8v5"/><path d="M6 14H4.5A1.5 1.5 0 0 1 3 12.5v-3A1.5 1.5 0 0 1 4.5 8h11A1.5 1.5 0 0 1 17 9.5v3a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M6 12h8v5H6z"/></svg>
  </button>
  <button class="btn pri" id="btnPdfMob" type="button">
    <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9"/><path d="m6.5 8.5 3.5 3.5 3.5-3.5"/><path d="M4 15v1.5A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V15"/></svg>
    صدور PDF
  </button>
</div>

<script>
window.INVOICE_CTX = { mode: <?= json_encode($mode) ?> };
<?php if (!empty($PRESET)): ?>
window.INVOICE_PRESET = <?= json_encode($PRESET, JSON_UNESCAPED_UNICODE) ?>;
<?php endif; ?>
</script>
<script src="/assets/js/core.js?v=<?= $ASSET_V ?>"></script>
<script src="/assets/js/engine.js?v=<?= $ASSET_V ?>"></script>
<script src="/assets/js/invoice.js?v=<?= $ASSET_V ?>"></script>
</body>
</html>
