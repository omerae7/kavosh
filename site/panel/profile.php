<?php
$PAGE_TITLE = 'پروفایل من — بریک کالا';
$PAGE_HEAD  = 'پروفایل من';
$PAGE_SUB   = 'نام، عکس و راه‌های تماس';
$NAV        = 'profile';
$PAGE_JS    = ['profile.js'];
require __DIR__ . '/_shell.php';
?>

<div class="grid12">
  <section class="pc s5">
    <div class="pc-h">
      <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 17a6 6 0 0 1 12 0"/></svg>
      <h3>عکس پروفایل</h3>
    </div>
    <div class="pc-b">
      <div class="avbox">
        <div class="avbig" id="avBig"><span id="avLetter">—</span></div>
        <div class="avacts">
          <button class="btn pri sm" type="button" id="avPick">انتخاب عکس</button>
          <button class="btn sm ghost" type="button" id="avDrop">حذف عکس</button>
          <input type="file" id="avFile" accept="image/*" hidden>
          <p class="avnote">عکس فقط برای ادمین‌های وارد شده قابل دیدن است و در پوشهٔ خصوصی سایت نگهداری می‌شود. تصویر پیش از ارسال به ۲۵۶ پیکسل کوچک می‌شود.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="pc s7">
    <div class="pc-h">
      <svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M12 3v3h3"/><path d="M7.5 10h5M7.5 13h3"/></svg>
      <h3>مشخصات من</h3>
    </div>
    <div class="pc-b">
      <form id="pForm" class="fgrid">
        <label class="fld"><span>نام نمایشی</span><input class="inp" id="fName" type="text" maxlength="40" placeholder="مثال: عمر اعرابی"></label>
        <label class="fld"><span>سمت</span><input class="inp" id="fTitle" type="text" maxlength="40" placeholder="مثال: مدیر فروش"></label>
        <label class="fld"><span>شمارهٔ تماس</span><input class="inp num" id="fPhone" type="text" inputmode="numeric" maxlength="15" placeholder="09xxxxxxxxx"></label>
        <label class="fld"><span>ایمیل</span><input class="inp" id="fEmail" type="text" maxlength="80" placeholder="name@example.com"></label>
        <label class="fld wide"><span>یادداشت کوتاه <i>(اختیاری)</i></span><input class="inp" id="fNote" type="text" maxlength="200" placeholder="مثلاً حوزهٔ کاری یا ساعت پاسخگویی"></label>
        <div class="fld wide facts" id="pFacts"></div>
        <div class="fld wide"><button class="btn pri" type="submit">ذخیرهٔ مشخصات</button></div>
      </form>
    </div>
  </section>
</div>

<?php require __DIR__ . '/_foot.php'; ?>
