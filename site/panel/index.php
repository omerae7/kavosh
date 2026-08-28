<?php
$PAGE_TITLE = 'پنل مدیریت — بریک کالا';
$PAGE_HEAD  = 'پنل مدیریت';
$PAGE_SUB   = 'بریک کالا';
$NAV        = 'home';
$PAGE_JS    = ['panel.js'];
require __DIR__ . '/_shell.php';
?>

<div class="prows">

  <!-- ── row 1 ───────────────────────────────────────────── -->
  <div class="prow r1">

    <section class="pc">
      <div class="pc-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="4.5" width="14" height="13" rx="2"/><path d="M3 8.5h14M7 3v3M13 3v3"/></svg>
        <h3>خلاصه این ماه</h3>
      </div>
      <div class="pc-b">
        <div class="big">
          <div class="v num" id="wMonth">0</div>
          <div class="u">پیش‌فاکتور صادر شده<span class="dot"></span><span id="wMonthName">—</span></div>
          <div class="sub">جمع کل فاکتورها<b class="num" id="wMonthSum">0</b></div>
        </div>
      </div>
    </section>

    <section class="pc">
      <div class="pc-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5 12.2 7l5 .7-3.6 3.5.9 5-4.5-2.4L5.5 16.2l.9-5L2.8 7.7l5-.7Z"/></svg>
        <h3>دسترسی سریع</h3>
      </div>
      <div class="pc-b">
        <div class="quick">
          <a class="qt" href="/panel/invoice.php">
            <span class="qi"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17Z"/><path d="M11 2.5v4h4"/><path d="M10 10v4M8 12h4"/></svg></span>
            <b>صدور پیش‌فاکتور</b><small>ایجاد پیش‌فاکتور جدید</small>
          </a>
          <a class="qt" href="/panel/customers.php">
            <span class="qi"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="2.7"/><path d="M3 16.5a5 5 0 0 1 10 0"/><path d="M14 4.7a2.6 2.6 0 0 1 0 4.9M17 16.5a4.9 4.9 0 0 0-2-3.9"/></svg></span>
            <b>مشتریان</b><small>مدیریت مشتریان</small>
          </a>
        </div>
      </div>
    </section>

    <section class="pc">
      <div class="pc-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><path d="M10 5.5V10l3 2"/></svg>
        <h3>ساعت و تاریخ</h3>
      </div>
      <div class="pc-b">
        <div class="clock-b">
          <div class="clock-time"><span id="wClock">00:00:00</span><span class="clock-ampm" id="wAmPm"></span></div>
          <div class="clock-date" id="wDate">—</div>
          <div class="clock-greet" id="wGreet"></div>
        </div>
      </div>
    </section>

  </div>

  <!-- ── row 2 ───────────────────────────────────────────── -->
  <div class="prow r2">

    <section class="pc">
      <div class="pc-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 5h14M3 10h14M3 15h9"/></svg>
        <h3>پیش‌فاکتورهای صادر شده</h3>
        <span class="sp"></span>
        <a class="btn pri sm" href="/panel/invoice.php">فاکتور جدید</a>
      </div>
      <div class="pc-b flush">
        <div class="rows" id="wRecent"><div class="wempty">در حال بارگذاری…</div></div>
      </div>
      <div class="pc-f"><a href="/panel/invoices.php">مشاهده همه پیش‌فاکتورها
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4-6 6 6 6"/></svg></a></div>
    </section>

    <section class="pc">
      <div class="pc-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 17h14M6 17V9M10 17V5M14 17v-5"/></svg>
        <h3>خلاصه عملکرد ماهانه</h3>
      </div>
      <div class="pc-b">
        <div class="chart-row">
          <div class="chart-col">
            <div class="legend">
              <span><i class="a"></i>ماه جاری</span>
              <span><i class="b"></i>ماه‌های گذشته</span>
            </div>
            <div class="chart" id="wChart"></div>
          </div>
          <div class="strip">
            <div class="st"><b class="num" id="sInv">0</b><span>فاکتور صادر شده</span></div>
            <div class="st"><b class="num" id="sSum">0</b><span>مبلغ کل فاکتورها (ریال)</span></div>
            <div class="st"><b class="num" id="sAvg">0</b><span>میانگین هر فاکتور (ریال)</span></div>
          </div>
        </div>
      </div>
    </section>

  </div>

  <!-- ── row 3 ───────────────────────────────────────────── -->
  <div class="prow r3">

    <section class="pc">
      <div class="pc-h">
        <svg class="ic" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.2 9.3 5 13 6.3 9.3 7.6 8 11.4 6.7 7.6 3 6.3 6.7 5 8 1.2Z"/><path d="M12.8 10.2l.55 1.6 1.6.55-1.6.55-.55 1.6-.55-1.6-1.6-.55 1.6-.55.55-1.6Z" opacity=".55"/></svg>
        <h3>دستیار هوشمند</h3>
      </div>
      <div class="pc-b">
        <div class="pa" id="wAssist"><div class="wempty">در حال بررسی…</div></div>
      </div>
    </section>

    <section class="pc">
      <div class="pc-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 0 0-5-5Z"/><path d="M8.2 16.5a1.9 1.9 0 0 0 3.6 0"/></svg>
        <h3>یادآورها</h3>
        <span class="sp"></span>
        <a href="/panel/reminders.php">همه</a>
      </div>
      <div class="pc-b col">
        <div id="wRem"><div class="wempty">در حال بارگذاری…</div></div>
        <form class="rem-add" id="remAdd">
          <input class="inp" id="remText" type="text" placeholder="یادآور تازه…" autocomplete="off">
          <button class="btn pri" type="submit" style="height:36px">افزودن</button>
        </form>
      </div>
    </section>

    <?php
    /* The two notepads are identical but for their label; the panel keeps
       them per-admin, so one manager never sees another's notes. */
    foreach ([1 => 'یادداشت ۲', 0 => 'یادداشت ۱'] as $slot => $label): ?>
    <section class="pc" data-note="<?= $slot ?>">
      <div class="pc-h">
        <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M12 3v3h3"/></svg>
        <h3><?= $label ?></h3>
      </div>
      <div class="pc-b">
        <div class="note-b">
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
        </div>
      </div>
    </section>
    <?php endforeach; ?>

  </div>

</div>

<?php require __DIR__ . '/_foot.php'; ?>
