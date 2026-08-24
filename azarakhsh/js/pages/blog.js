/* ===================== دفترچهٔ نما (فهرست مقاله‌ها) ===================== */
window.AZBlog = (function () {
  'use strict';
  const { $, $$, fa, wireImages, toast } = AZ;
  const state = { cat: 'all', q: '' };

  function apply() {
    const plain = state.cat === 'all' && !state.q.trim();
    const feature = $('#blogFeature');
    feature.hidden = !plain;

    let n = 0;
    $$('#blogGrid .tile').forEach(el => {
      let ok = state.cat === 'all' || el.dataset.cat === state.cat;
      if (ok && state.q.trim()) ok = (el.dataset.search || '').includes(state.q.trim().toLowerCase());
      /* مقالهٔ شاخص وقتی بالای صفحه نشان داده می‌شود، در شبکه تکرار نمی‌شود */
      if (ok && plain && el.dataset.feature === '1') { el.hidden = true; n++; return; }
      el.hidden = !ok;
      if (ok) n++;
    });

    $('#blogCount').textContent = fa(n) + ' مقاله';
    $('#blogEmpty').hidden = n > 0;
    $$('#blogCats .chip').forEach(c => c.classList.toggle('is-on', c.dataset.cat === state.cat));
  }

  function init() {
    wireImages($('#blogGrid'));
    wireImages($('#blogFeature'));

    $$('#blogCats .chip').forEach(c => c.addEventListener('click', () => { state.cat = c.dataset.cat; apply(); }));

    const q = $('#blogQ');
    let t;
    q.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = q.value; apply(); }, 180);
    });

    $('#newsForm').addEventListener('submit', e => {
      e.preventDefault();
      const mail = $('#newsMail');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value)) { toast('نشانی ایمیل معتبر وارد کنید'); return; }
      mail.value = '';
      toast('عضویت شما ثبت شد');
    });

    apply();
  }

  return { init };
})();
