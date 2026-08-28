<?php
/* Panel chrome: the navigation rail, the top bar, the bell, and the
   messages drawer. Every panel page opens with this and closes with
   _foot.php, so the frame is identical throughout. */
require_once dirname(__DIR__) . '/api/_boot.php';
$ME = require_login();
require dirname(__DIR__) . '/_cfg.php';
$PAGE_CSS = array_merge(['panel.css'], $PAGE_CSS ?? []);
$NAV = $NAV ?? '';
$meUser = user_find($ME);
$meName = $meUser['name'] ?? $ME;
require dirname(__DIR__) . '/_head.php';

/** One rail entry. */
function nav_item(string $key, string $current, string $href, string $label, string $svg): void
{
    printf('<a class="nav" href="%s"%s>%s<span>%s</span></a>',
        htmlspecialchars($href, ENT_QUOTES),
        $key === $current ? ' aria-current="page"' : '',
        $svg, htmlspecialchars($label, ENT_QUOTES));
}
?>
<body class="panel">
<div class="pbg" role="presentation"></div>
<div class="rail-scrim" id="railScrim"></div>

<div class="stage">
  <nav class="rail" id="rail">
    <?php
    nav_item('home', $NAV, '/panel/', 'داشبورد',
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1Z"/></svg>');
    nav_item('new', $NAV, '/panel/invoice.php', 'صدور پیش فاکتور',
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17Z"/><path d="M11 2.5v4h4"/><path d="M8 11h4M8 14h3"/></svg>');
    nav_item('invoices', $NAV, '/panel/invoices.php', 'پیش‌فاکتورها',
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 5h14M3 10h14M3 15h9"/></svg>');
    nav_item('customers', $NAV, '/panel/customers.php', 'مشتریان',
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="2.7"/><path d="M3 16.5a5 5 0 0 1 10 0"/><path d="M14 4.7a2.6 2.6 0 0 1 0 4.9M17 16.5a4.9 4.9 0 0 0-2-3.9"/></svg>');
    nav_item('reminders', $NAV, '/panel/reminders.php', 'یادآورها',
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 0 0-5-5Z"/><path d="M8.2 16.5a1.9 1.9 0 0 0 3.6 0"/></svg>');
    nav_item('settings', $NAV, '/panel/settings.php', 'تنظیمات',
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" stroke-linecap="round"/></svg>');
    ?>
    <div class="sep"></div>
    <a class="nav out" href="/panel/logout.php">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 17H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3"/><path d="M13 13.5 16.5 10 13 6.5"/><path d="M16.5 10H8"/></svg>
      <span>خروج</span>
    </a>
  </nav>

  <div class="window">
    <header class="pbar">
      <a class="brandline" href="/panel/">
        <img src="/assets/img/logo.png" alt="">
        <h1><?= htmlspecialchars($PAGE_HEAD ?? ($PAGE_TITLE ?? ''), ENT_QUOTES) ?>
          <?php if (!empty($PAGE_SUB)): ?><small><?= htmlspecialchars($PAGE_SUB, ENT_QUOTES) ?></small><?php endif; ?>
        </h1>
      </a>
      <div class="sp"></div>
      <div class="tools">
      <button class="railbtn" id="railBtn" type="button" aria-label="منو">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h14M3 10h14M3 14h14"/></svg>
      </button>
      <?php if (($SHELL_BACK ?? '') !== ''): ?>
      <a class="btn sm" href="<?= htmlspecialchars($SHELL_BACK, ENT_QUOTES) ?>">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4-6 6 6 6"/></svg>
        بازگشت
      </a>
      <?php endif; ?>
      <button class="iconbtn" id="bell" type="button" aria-label="پیام‌ها" title="پیام‌ها">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 0 0-5-5Z"/><path d="M8.2 16.5a1.9 1.9 0 0 0 3.6 0"/></svg>
        <span class="badge zero" id="bellCount"></span>
      </button>
      <div class="who">
        <span class="av"><?= mb_substr($meName, 0, 1) ?></span>
        <span class="nm"><b><?= htmlspecialchars($meName, ENT_QUOTES) ?></b><small>مدیر سیستم</small></span>
      </div>
      </div>
    </header>

<aside class="drawer" id="msgDrawer" aria-hidden="true">
  <div class="drawer-h">
    <h3>پیام‌ها</h3>
    <button class="btn xs ghost" id="msgClose" type="button">بستن</button>
  </div>
  <div class="drawer-b" id="msgList"><div class="wempty">در حال بارگذاری…</div></div>
</aside>
