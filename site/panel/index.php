<?php
$PAGE_TITLE = 'پنل مدیریت — بریک کالا';
$SHELL_WRAP = 'pwrap';
require __DIR__ . '/_shell.php';
?>

  <div class="widgets" id="widgets">

    <!-- clock + date -->
    <section class="w glass-dark c4">
      <div class="w-clock">
        <div class="clock-time num" id="wClock">00:00:00</div>
        <div class="clock-date" id="wDate">—</div>
        <div class="clock-greet" id="wGreet"></div>
      </div>
    </section>

    <!-- issue an invoice -->
    <a class="w glass c4 w-click w-action" href="/panel/invoice.php">
      <span class="badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/></svg>
      </span>
      <span class="txt"><b>صدور پیش فاکتور</b><small>با دسترسی به مشتریان ثبت‌شده</small></span>
      <svg class="go" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4-6 6 6 6"/></svg>
    </a>

    <!-- issued invoices -->
    <a class="w glass c4 w-click w-action" href="/panel/invoices.php">
      <span class="badge" style="background:linear-gradient(150deg,#5C7A8C,#3E5A6B)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
      </span>
      <span class="txt"><b>پیش‌فاکتورهای صادر شده</b><small id="wInvSub">در حال بارگذاری…</small></span>
      <svg class="go" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4-6 6 6 6"/></svg>
    </a>

    <!-- this month -->
    <section class="w glass c3">
      <div class="w-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="4.5" width="14" height="13" rx="2"/><path d="M3 8.5h14M7 3v3M13 3v3"/></svg>
        <h3>فاکتورهای این ماه</h3>
      </div>
      <div class="stat">
        <div class="v num" id="wMonth">0</div>
        <div class="u" id="wMonthName">—</div>
        <div class="sub">مجموع: <b class="num" id="wMonthSum">0</b> ریال</div>
      </div>
    </section>

    <!-- six month chart -->
    <section class="w glass c5">
      <div class="w-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 17h14M6 17V9M10 17V5M14 17v-5"/></svg>
        <h3>روند شش ماه گذشته</h3>
        <span class="sp"></span>
        <a href="/panel/invoices.php">همه فاکتورها</a>
      </div>
      <div class="chart" id="wChart"></div>
    </section>

    <!-- customers -->
    <a class="w glass c4 w-click w-action" href="/panel/customers.php">
      <span class="badge" style="background:linear-gradient(150deg,#6E8A6B,#4B6A4F)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5.4 5.4 0 0 0-2.2-4.3"/></svg>
      </span>
      <span class="txt"><b>مشتریان</b><small id="wCusSub">در حال بارگذاری…</small></span>
      <svg class="go" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4-6 6 6 6"/></svg>
    </a>

    <!-- assistant -->
    <section class="w glass c5">
      <div class="w-h">
        <svg class="ic" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.2 9.3 5 13 6.3 9.3 7.6 8 11.4 6.7 7.6 3 6.3 6.7 5 8 1.2Z"/><path d="M12.8 10.2l.55 1.6 1.6.55-1.6.55-.55 1.6-.55-1.6-1.6-.55 1.6-.55.55-1.6Z" opacity=".55"/></svg>
        <h3>دستیار هوشمند</h3>
      </div>
      <div class="pa" id="wAssist"><div class="wempty">در حال بررسی…</div></div>
    </section>

    <!-- reminders -->
    <section class="w glass c7">
      <div class="w-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 0 0-5-5Z"/><path d="M8.2 16.5a1.9 1.9 0 0 0 3.6 0"/></svg>
        <h3>یادآورها</h3>
        <span class="sp"></span>
        <a href="/panel/reminders.php">همه یادآورها</a>
      </div>
      <div class="wlist" id="wRem"><div class="wempty">در حال بارگذاری…</div></div>
      <form class="rem-add" id="remAdd">
        <input class="inp" id="remText" type="text" placeholder="یادآور تازه…" autocomplete="off">
        <button class="btn pri" type="submit" style="height:36px">افزودن</button>
      </form>
    </section>

    <!-- notes -->
    <section class="w glass c4" data-note="0">
      <div class="w-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M12 3v3h3"/></svg>
        <h3>یادداشت ۱</h3>
      </div>
      <textarea class="note-area" placeholder="یادداشت خود را بنویسید…"></textarea>
      <div class="note-acts">
        <button class="nbtn ok" type="button" data-act="save" title="ثبت">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8.5 3 3 7-7"/></svg>
        </button>
        <button class="nbtn no" type="button" data-act="clear" title="خالی کردن">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
        </button>
        <button class="nbtn ed" type="button" data-act="edit" title="ویرایش">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 2.5 13.5 4.5 5.5 12.5 3 13l.5-2.5Z"/></svg>
        </button>
        <span class="note-saved"></span>
      </div>
    </section>

    <section class="w glass c4" data-note="1">
      <div class="w-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M12 3v3h3"/></svg>
        <h3>یادداشت ۲</h3>
      </div>
      <textarea class="note-area" placeholder="یادداشت خود را بنویسید…"></textarea>
      <div class="note-acts">
        <button class="nbtn ok" type="button" data-act="save" title="ثبت">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8.5 3 3 7-7"/></svg>
        </button>
        <button class="nbtn no" type="button" data-act="clear" title="خالی کردن">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
        </button>
        <button class="nbtn ed" type="button" data-act="edit" title="ویرایش">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 2.5 13.5 4.5 5.5 12.5 3 13l.5-2.5Z"/></svg>
        </button>
        <span class="note-saved"></span>
      </div>
    </section>

    <!-- latest invoices -->
    <section class="w glass c4">
      <div class="w-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5v5l3 2"/><circle cx="10" cy="10" r="7"/></svg>
        <h3>آخرین فاکتورها</h3>
        <span class="sp"></span>
        <a href="/panel/invoices.php">مشاهده همه</a>
      </div>
      <div class="wlist" id="wRecent"><div class="wempty">در حال بارگذاری…</div></div>
    </section>

  </div>
</div>

<script src="/assets/js/core.js?v=<?= $ASSET_V ?>"></script>
<script src="/assets/js/panel.js?v=<?= $ASSET_V ?>"></script>
</body>
</html>
