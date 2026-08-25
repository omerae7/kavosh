/* =========================================================================
   آذرخش · فروشگاه
   ترتیبِ نمایش و میزِ مقایسه. صافیِ خانواده در ui.js است.
   ========================================================================= */
(function () {
  'use strict';
  const { $, $$, fa, faNum, esc, byId, toast } = AZ;

  const grid = $('#shopGrid');
  if (!grid) return;

  /* ------------------------------ ترتیب ------------------------------ */
  const sort = $('#shopSort');
  if (sort) {
    sort.addEventListener('change', () => {
      const cards = $$('.spec', grid);
      const v = sort.value;
      cards.sort((a, b) => {
        if (v === 'price-asc')  return Number(a.dataset.price) - Number(b.dataset.price);
        if (v === 'price-desc') return Number(b.dataset.price) - Number(a.dataset.price);
        if (v === 'name')       return a.dataset.name.localeCompare(b.dataset.name, 'fa');
        return PRODUCTS.findIndex(p => p.id === a.dataset.id) - PRODUCTS.findIndex(p => p.id === b.dataset.id);
      });
      cards.forEach(c => grid.appendChild(c));
      const empty = $('.rack-empty', grid);
      if (empty) grid.appendChild(empty);
    });
  }

  /* --------------------------- میزِ مقایسه --------------------------- */
  const MAX = 3;
  const bench = $('#cmp');
  const box = $('#cmpGrid');
  let picked = [];

  const num = s => {
    const m = String(s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).match(/[\d.]+/);
    return m ? parseFloat(m[0]) : NaN;
  };

  function render() {
    if (!bench || !box) return;
    const items = picked.map(byId).filter(Boolean);

    if (!items.length) {
      bench.hidden = true;
      bench.classList.remove('is-up');
      document.body.classList.remove('has-cmp');
      return;
    }
    bench.hidden = false;
    requestAnimationFrame(() => bench.classList.add('is-up'));
    document.body.classList.add('has-cmp');

    const best = {
      price: Math.min(...items.map(p => p.price)),
      absorb: Math.min(...items.map(p => num(p.absorb))),
      strength: Math.max(...items.map(p => num(p.strength)))
    };

    box.innerHTML = items.map(p => `
      <div class="cmp__card" style="--warm:${esc(p.hex)}">
        <button class="cmp__x" type="button" data-drop="${esc(p.id)}" aria-label="برداشتن ${esc(p.name)} از میز">
          <svg><use href="#i-x"></use></svg>
        </button>
        <div class="cmp__ttl">${esc(p.name)}</div>
        <div class="cmp__code">${esc(p.code)}</div>
        <div class="cmp__rows">
          <div class="cmp__row${p.price === best.price ? ' is-best' : ''}">
            <span>قیمت</span><b>${faNum(p.price)}</b></div>
          <div class="cmp__row${num(p.absorb) === best.absorb ? ' is-best' : ''}">
            <span>جذب آب</span><b class="is-fa">${esc(p.absorb)}</b></div>
          <div class="cmp__row${num(p.strength) === best.strength ? ' is-best' : ''}">
            <span>مقاومت</span><b>${esc(p.strength)}</b></div>
          <div class="cmp__row"><span>وزن</span><b class="is-fa">${esc(p.weight)}</b></div>
          <div class="cmp__row"><span>در هر ${esc(p.unit)}</span><b class="is-fa">${esc(p.perLabel)}</b></div>
          <div class="cmp__row"><span>تحویل</span><b class="is-fa">${esc(p.lead || '۳ تا ۵ روز کاری')}</b></div>
        </div>
      </div>`).join('') +
      (items.length < MAX
        ? `<p class="cmp__hint">می‌توانید تا ${fa(MAX)} کد را کنار هم بگذارید؛ عددِ بهتر با سبز مشخص می‌شود.</p>`
        : '');

    $$('.spec__cmp', grid).forEach(b =>
      b.setAttribute('aria-pressed', String(picked.includes(b.dataset.cmp))));
  }

  grid.addEventListener('click', e => {
    const b = e.target.closest('.spec__cmp');
    if (!b) return;
    const id = b.dataset.cmp;
    if (picked.includes(id)) picked = picked.filter(x => x !== id);
    else if (picked.length >= MAX) { toast(`میز فقط جای ${fa(MAX)} کد دارد؛ یکی را بردارید.`); return; }
    else picked.push(id);
    render();
  });

  if (box) {
    box.addEventListener('click', e => {
      const d = e.target.closest('[data-drop]');
      if (!d) return;
      picked = picked.filter(x => x !== d.dataset.drop);
      render();
    });
  }
  const clear = $('#cmpClear');
  if (clear) clear.addEventListener('click', () => { picked = []; render(); });
})();
