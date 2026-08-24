/* =========================================================================
   صفحهٔ کلکسیون — فیلتر، مرتب‌سازی و همگام‌سازی با آدرس صفحه
   ========================================================================= */
window.AZShop = (function () {
  'use strict';

  const { $, $$, fa, faNum, toast } = AZ;
  const PER = 9;

  const state = { q: '', family: 'all', tone: '', max: 2200000, stock: false, sort: 'featured', shown: PER };

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

  /* ------------------------------ فیلتر --------------------------- */
  function match(p) {
    if (state.family !== 'all' && p.family !== state.family) return false;
    if (state.stock && p.stock !== 'موجود در انبار') return false;
    if (p.price > state.max) return false;
    if (state.tone && !p.tones.some(t => t.name === state.tone)) return false;
    if (state.q) {
      const q = state.q.trim().toLowerCase();
      const hay = [p.name, p.code, p.familyLabel, p.desc, (p.keys || []).join(' ')].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function sorted(list) {
    const l = list.slice();
    if (state.sort === 'cheap') l.sort((a, b) => a.price - b.price);
    else if (state.sort === 'expensive') l.sort((a, b) => b.price - a.price);
    else if (state.sort === 'name') l.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
    return l;
  }

  /* ------------------------------ رندر ---------------------------- */
  function render() {
    const grid = $('#shopGrid');
    const all = sorted(PRODUCTS.filter(match));
    const view = all.slice(0, state.shown);

    grid.innerHTML = view.length
      ? view.map(p => AZUI.card(p)).join('')
      : `<div class="empty">
           <svg width="34" height="34"><use href="#i-search"/></svg>
           <h3>چیزی با این فیلترها پیدا نشد</h3>
           <p>فیلترها را ساده‌تر کنید یا از مشاور نما بپرسید کدام کد به کارتان می‌آید.</p>
           <button class="btn-ghost btn-sm" type="button" style="margin-top:1.2rem" data-open-advisor>
             <svg width="15" height="15"><use href="#i-spark"/></svg> پرسش از مشاور
           </button>
         </div>`;

    AZ.wireImages(grid);
    AZUI.wireCards(grid);
    $$('[data-open-advisor]', grid).forEach(b => b.addEventListener('click', () => Advisor.open(null, b)));

    $('#shopCount').textContent = all.length
      ? 'نمایش ' + fa(Math.min(state.shown, all.length)) + ' از ' + fa(all.length) + ' کد'
      : 'بدون نتیجه';

    const pager = $('#shopPager');
    pager.hidden = all.length <= state.shown;

    $$('.shop__fam').forEach(b => b.classList.toggle('is-on', b.dataset.family === state.family));
    $$('.shop__tone').forEach(b => b.classList.toggle('is-on', b.dataset.tone === state.tone));
    writeURL();
  }

  /* ---------------------------- کنترل‌ها -------------------------- */
  function buildFilters() {
    $('#shopFams').innerHTML = FAMILIES.map(f => {
      const n = f.id === 'all' ? PRODUCTS.length : PRODUCTS.filter(p => p.family === f.id).length;
      return `<button class="shop__fam" type="button" data-family="${f.id}">${f.label}<i>${fa(n)}</i></button>`;
    }).join('');
    $$('.shop__fam').forEach(b => b.addEventListener('click', () => {
      state.family = b.dataset.family;
      state.shown = PER;
      render();
    }));

    $('#shopTones').innerHTML = TONES.map(t =>
      `<button class="shop__tone" type="button" style="background:${t.hex}" data-tone="${t.name}" title="${t.name}" aria-label="رنگ ${t.name}"></button>`).join('');
    $$('.shop__tone').forEach(b => b.addEventListener('click', () => {
      state.tone = state.tone === b.dataset.tone ? '' : b.dataset.tone;
      state.shown = PER;
      render();
    }));
  }

  async function init() {
    readURL();
    buildFilters();

    const q = $('#shopQ');
    q.value = state.q;
    let t;
    q.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = q.value; state.shown = PER; render(); }, 180);
    });

    $('#shopStock').addEventListener('change', e => { state.stock = e.target.checked; state.shown = PER; render(); });
    $('#shopMore').addEventListener('click', () => { state.shown += PER; render(); });
    $('#shopReset').addEventListener('click', () => {
      Object.assign(state, { q: '', family: 'all', tone: '', max: 2200000, stock: false, sort: 'featured', shown: PER });
      q.value = '';
      $('#shopStock').checked = false;
      const r = $('#shopPrice'); if (r) r.value = 2200000;
      const s = $('#shopSort'); if (s) s.value = 'featured';
      paintPrice();
      render();
      toast('فیلترها پاک شد');
    });

    const toggle = $('#shopToggle');
    toggle.addEventListener('click', () => {
      const side = $('#shopFilters');
      const open = side.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    await customElements.whenDefined('sl-range');
    await customElements.whenDefined('sl-select');

    const range = $('#shopPrice');
    range.addEventListener('sl-input', () => { state.max = Number(range.value); state.shown = PER; paintPrice(); render(); });

    const sort = $('#shopSort');
    sort.value = state.sort;
    sort.addEventListener('sl-change', () => { state.sort = sort.value; render(); });

    paintPrice();
    render();
  }

  function paintPrice() {
    const el = $('#shopPriceLabel');
    if (el) el.textContent = faNum(state.max) + ' تومان';
  }

  return { init };
})();
