<?php
/* Header shared by every panel page: background, brand, and the way out. */
require_once dirname(__DIR__) . '/api/_boot.php';
$ME = require_login();
require dirname(__DIR__) . '/_cfg.php';
$PAGE_CSS = array_merge(['panel.css'], $PAGE_CSS ?? []);
require dirname(__DIR__) . '/_head.php';
?>
<body class="panel">
<div class="pbg" role="presentation"></div>
<div class="<?= $SHELL_WRAP ?? 'psheet' ?>">
  <header class="phead">
    <a class="brand" href="/panel/">
      <img src="/assets/img/logo.png" alt="">
      <span><b>پنل مدیریت</b><small>بریک کالا</small></span>
    </a>
    <div class="phead-sp"></div>
    <?php if (($SHELL_BACK ?? '') !== ''): ?>
    <a class="pchip" href="<?= htmlspecialchars($SHELL_BACK, ENT_QUOTES) ?>">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4-6 6 6 6"/></svg>
      بازگشت
    </a>
    <?php endif; ?>
    <a class="pchip" href="/panel/settings.php" title="تنظیمات">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" stroke-linecap="round"/></svg>
      <span class="lbl-txt">تنظیمات</span>
    </a>
    <a class="pchip" href="/panel/logout.php" title="خروج">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 17H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3"/><path d="M13 13.5 16.5 10 13 6.5"/><path d="M16.5 10H8"/></svg>
      <span class="lbl-txt"><?= htmlspecialchars($ME, ENT_QUOTES) ?></span>
    </a>
  </header>
