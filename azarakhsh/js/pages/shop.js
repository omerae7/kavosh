/* =========================================================================
   صفحهٔ کلکسیون
   کارت‌ها در بدنهٔ HTML هستند؛ اینجا فقط نمایش داده یا پنهان می‌شوند.
   مرتب‌سازی هم با order انجام می‌شود تا خودِ عنصرها جابه‌جا نشوند.
   ========================================================================= */
window.AZShop = (function () {
  'use strict';

  const { $, $$, fa, faNum, toast } = AZ;
  const PER = 9;

  const state = { q: '', family: 'all', tone: '', max: 2200000, stock: false, sort: 'featured', shown: PER };
  let cards = [];

  /* ---------------------- خواندن و نوشتن آدرس ---------------------- */
  function readURL() {
    const u = new URLSearchParams(location.search);
    if (u.get('family')) state.family = u.get('family');
    if (u.get('q')) state.q = u.get('q');
    if (u.get('tone')) state.tone = u.get('tone');
    if (u.get('sort')) state.sort = u.get('sort');
  }
  function writeURL() {
    const u = new URLSearchParams();
    if (state.family !== 'all') u.set('family', state.family);
    if (state.q) u.set('q', state.q);
    if (state.tone) u.set('tone', state.tone);
    if (state.sort !== 'featured') u.set('sort', state.sort);
    const qs = u.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  /* -------------------------- تطبیق با فیلتر ---------------------- */
  function match(el) {
    if (state.family !== 'all' && el.dataset.family !== state.family) return false;
    if (state.stock && el.dataset.stock !== '1') return false;
    if (Number(el.dataset.price) > state.max) return false;
    if (state.tone && !(el.dataset.tones || '').split('|').includes(state.tone)) return false;
    if (state.q) {
      const q = state.q.trim().toLowerCase();
      if (!(el.dataset.search || '').includes(q)) return false;
    }
    return true;
  }

  const nameOf = el => el.querySelector('.pc__name').textContent.trim();

  function apply() {
    const passed = cards.filter(match);
    const ordered = passed.slice();

    if (state.sort === 'cheap')          ordered.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
    else if (state.sort === 'expensive') ordered.sort((a, b) => Number(b.dataset.price) - Number(a.dataset.price));
    else if (state.sort === 'name')      ordered.sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'fa'));
    /* «پیشنهاد کارخانه» یعنی همان ترتیبی که در HTML نوشته شده */

    cards.forEach(el => { el.hidden = true; el.style.order = ''; });
    ordered.forEach((el, i) => {
      el.hidden = i >= state.shown;
      el.style.order = i;
    });

    const n = ordered.length;
    $('#shopCount').textContent = n
      ? 'نمایش ' + fa(Math.min(state.shown, n)) + ' از ' + fa(n) + ' کد'
      : 'بدون نتیجه';
    $('#shopEmpty').hidden = n > 0;
    $('#shopPager').hidden = n <= state.shown;

    $$('.shop__fam').forEach(b => b.classList.toggle('is-on', b.dataset.family === state.family));
    $$('.shop__tone').forEach(b => b.classList.toggle('is-on', b.dataset.tone === state.tone));
    writeURL();
  }

  function paintPrice() {
    const el = $('#shopPriceLabel');
    if (el) el.textContent = faNum(state.max) + ' تومان';
  }

  /* ------------------------------ شروع ---------------------------- */
  async function init() {
    cards = $$('#shopGrid .pc');
    AZ.wireImages($('#shopGrid'));
    AZUI.wireCards($('#shopGrid'));
    $$('#shopEmpty [data-open-advisor]').forEach(b =>
      b.addEventListener('click', () => Advisor.open(null, b)));

    readURL();

    $$('.shop__fam').forEach(b => b.addEventListener('click', () => {
      state.family = b.dataset.family;
      state.shown = PER;
      apply();
    }));

    $$('.shop__tone').forEach(b => b.addEventListener('click', () => {
      state.tone = state.tone === b.dataset.tone ? '' : b.dataset.tone;
      state.shown = PER;
      apply();
    }));

    const q = $('#shopQ');
    q.value = state.q;
    let t;
    q.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = q.value; state.shown = PER; apply(); }, 180);
    });

    $('#shopStock').addEventListener('change', e => { state.stock = e.target.checked; state.shown = PER; apply(); });
    $('#shopMore').addEventListener('click', () => { state.shown += PER; apply(); });

    $('#shopReset').addEventListener('click', () => {
      Object.assign(state, { q: '', family: 'all', tone: '', max: 2200000, stock: false, sort: 'featured', shown: PER });
      q.value = '';
      $('#shopStock').checked = false;
      const r = $('#shopPrice'); if (r) r.value = 2200000;
      const s = $('#shopSort'); if (s) s.value = 'featured';
      paintPrice();
      apply();
      toast('فیلترها پاک شد');
    });

    const toggle = $('#shopToggle');
    toggle.addEventListener('click', () => {
      const side = $('#shopFilters');
      toggle.setAttribute('aria-expanded', String(side.classList.toggle('is-open')));
    });

    await customElements.whenDefined('sl-range');
    await customElements.whenDefined('sl-select');

    const range = $('#shopPrice');
    range.addEventListener('sl-input', () => { state.max = Number(range.value); state.shown = PER; paintPrice(); apply(); });

    const sort = $('#shopSort');
    sort.value = state.sort;
    sort.addEventListener('sl-change', () => { state.sort = sort.value; apply(); });

    paintPrice();
    apply();
  }

  return { init };
})();
