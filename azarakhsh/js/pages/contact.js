/* ===================== تماس با ما ===================== */
window.AZContact = (function () {
  'use strict';
  const { $, $$, fa, esc, toast, isPhoneNumber } = AZ;

  const DEPTS = [
    { ic: 'i-bag',   name: 'واحد فروش',        note: 'سفارش، پیش‌فاکتور، موجودی', tel: '۰۴۱-۳۳۸۲۱۱۴۰', mail: 'sales@azarakhsh.shop' },
    { ic: 'i-shield', name: 'واحد فنی',        note: 'انتخاب کد، اجرا، پشتیبانی',  tel: '۰۴۱-۳۳۸۲۱۱۴۲', mail: 'tech@azarakhsh.shop' },
    { ic: 'i-truck', name: 'ارسال و باربری',   note: 'زمان بارگیری، پیگیری بار',   tel: '۰۴۱-۳۳۸۲۱۱۴۵', mail: 'logistics@azarakhsh.shop' },
    { ic: 'i-user',  name: 'نمایندگی و همکاری', note: 'قرارداد، معماران، توزیع',   tel: '۰۹۱۴ ۱۲۳ ۴۵۶۷', mail: 'partners@azarakhsh.shop' }
  ];

  function init() {
    $('#ctDepts').innerHTML = DEPTS.map(d => `
      <div class="ct-dept">
        <span class="ct-dept__ic"><svg width="17" height="17"><use href="#${d.ic}"/></svg></span>
        <div>
          <b>${esc(d.name)}</b>
          <span>${esc(d.note)}</span>
          <a href="tel:+984133821140" class="ltr">${esc(d.tel)}</a>
          <a href="mailto:${esc(d.mail)}" class="ltr">${esc(d.mail)}</a>
        </div>
      </div>`).join('');

    /* پرسش‌های رایج، از همان منبع صفحهٔ نخست */
    $('#ctFaq').innerHTML = FAQS.map((f, i) => `
      <sl-details ${i === 0 ? 'open' : ''} summary="${esc(f.q)}">
        <p class="small">${esc(f.a)}</p>
      </sl-details>`).join('');

    wireForm();
  }

  async function wireForm() {
    await customElements.whenDefined('sl-input');
    await customElements.whenDefined('sl-select');

    /* موضوع از آدرس صفحه پیش‌انتخاب می‌شود: contact.html?topic=quote */
    const topic = new URLSearchParams(location.search).get('topic');
    const sel = $('#ctTopic');
    if (topic && sel) sel.value = topic;

    const form = $('#ctForm');
    const panel = $('#ctPanel');

    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#ctName'), phone = $('#ctPhone');
      let ok = true;

      if (name.value.trim().length < 3) { name.setCustomValidity('نام را کامل بنویسید'); name.reportValidity(); ok = false; }
      else name.setCustomValidity('');

      if (!isPhoneNumber(phone.value)) { phone.setCustomValidity('شمارهٔ موبایل ۱۱ رقمی وارد کنید'); phone.reportValidity(); ok = false; }
      else phone.setCustomValidity('');

      if (!ok) return;

      $('#ctRef').textContent = fa('AZ-' + Math.floor(100000 + Math.random() * 899999));
      panel.classList.add('is-sent');
      toast('درخواست شما ثبت شد');
      window.scrollTo({ top: panel.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
    });

    $('#ctAgain').addEventListener('click', () => {
      panel.classList.remove('is-sent');
      ['#ctName', '#ctPhone', '#ctMail', '#ctArea', '#ctCity', '#ctNote'].forEach(s => {
        const el = $(s); if (el) el.value = '';
      });
    });
  }

  return { init };
})();
