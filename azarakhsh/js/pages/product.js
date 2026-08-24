/* =========================================================================
   برگهٔ اثر — تک محصول
   محصول از پارامتر ?id= خوانده می‌شود؛ نبودش به کلکسیون برمی‌گردد.
   ========================================================================= */
window.AZProduct = (function () {
  'use strict';

  const { $, $$, fa, en, faNum, toman, faFloat, pad2, byId, toneImages,
          wireImages, esc, Cart, estimate, toast } = AZ;

  let p, tone, qty = 1;

  const param = k => new URLSearchParams(location.search).get(k);

  function shots() {
    const im = toneImages(p, tone);
    return [im.wall, im.single].concat(
      p.tones.filter(t => t.name !== tone).map(t => toneImages(p, t.name).wall));
  }

  /* ---------------------------- گالری ---------------------------- */
  function paintMedia() {
    const list = shots();
    const main = $('#pdpMain');
    main.src = list[0];
    main.alt = p.name;
    main.removeAttribute('data-failed');

    $('#pdpThumbs').innerHTML = list.map((src, i) => `
      <button class="pdp__thumb${i === 0 ? ' is-on' : ''}" type="button" data-src="${src}" aria-label="تصویر ${i + 1}">
        <img src="${src}" alt="" data-slot>
      </button>`).join('');

    wireImages($('#pdpThumbs'));
    wireImages($('.pdp__stage'));
    $$('#pdpThumbs .pdp__thumb').forEach(t => t.addEventListener('click', () => {
      $$('#pdpThumbs .pdp__thumb').forEach(x => x.classList.toggle('is-on', x === t));
      main.src = t.dataset.src;
      main.removeAttribute('data-failed');
    }));
  }

  /* --------------------------- پنل خرید -------------------------- */
  function paintBuy() {
    const was = p.was ? `<s class="pdp__was">${faNum(p.was)}</s>` : '';
    $('#pdpBuy').innerHTML = `
      <div>
        <span class="label label--bare">${esc(p.familyLabel)} · ${esc(p.code)}</span>
        <h1 class="pdp__name">${esc(p.name)}</h1>
      </div>
      <p class="pdp__tagline">${esc(p.desc)}</p>

      <div class="pdp__marks">${p.marks.map(m => `<span class="tag">${esc(m)}</span>`).join('')}</div>

      <div class="pc__tones" style="margin:0">
        <span class="pc__tones-lab">رنگ‌بندی</span>
        ${p.tones.map(t => `
          <button class="tone${t.name === tone ? ' is-on' : ''}" type="button"
                  style="background:${t.hex}" data-tone="${esc(t.name)}" title="${esc(t.name)}"
                  aria-label="رنگ ${esc(t.name)}"></button>`).join('')}
      </div>

      <div class="pdp__pricebox">
        <div>
          <span class="pc__price-lab">قیمت هر ${esc(p.unit)} ${was}</span>
          <span class="pdp__price">${faNum(p.price)} <small>تومان</small></span>
        </div>
        <span class="tag"><span class="spark${p.stock === 'موجود در انبار' ? '' : ' spark--dim'}"></span>${esc(p.stock)}</span>
      </div>

      <div class="pdp__row">
        <div class="stepper">
          <button type="button" data-step="-1" aria-label="کاهش">−</button>
          <input type="number" id="pdpQty" value="1" min="0.5" step="0.5" inputmode="decimal" aria-label="مقدار">
          <button type="button" data-step="1" aria-label="افزایش">+</button>
        </div>
        <button class="btn" type="button" id="pdpAdd" style="flex:1">
          <svg width="16" height="16"><use href="#i-bag"/></svg>
          افزودن به سبد
        </button>
      </div>

      <div class="pdp__notes">
        <div class="pdp__note"><svg width="16" height="16"><use href="#i-shield"/></svg>
          <span>ضمانت کتبی ۲۵ ساله روی رنگ، شوره و پوسته‌شدن سطح</span></div>
        <div class="pdp__note"><svg width="16" height="16"><use href="#i-truck"/></svg>
          <span>آماده‌سازی ${esc(p.lead)} · ارسال رایگان بالای ۳۰۰ متر مربع</span></div>
        <div class="pdp__note"><svg width="16" height="16"><use href="#i-box"/></svg>
          <span>${esc(p.pack)}</span></div>
      </div>

      <button class="btn-ghost btn-wide" type="button" data-ask="دربارهٔ ${esc(p.name)} بیشتر بگو">
        <svg width="16" height="16"><use href="#i-spark"/></svg>
        پرسش از مشاور نما دربارهٔ این کد
      </button>`;

    $$('#pdpBuy .tone').forEach(b => b.addEventListener('click', () => {
      tone = b.dataset.tone;
      $$('#pdpBuy .tone').forEach(x => x.classList.toggle('is-on', x === b));
      paintMedia();
    }));

    const qEl = $('#pdpQty');
    $$('#pdpBuy [data-step]').forEach(b => b.addEventListener('click', () => {
      qty = Math.max(0.5, (parseFloat(en(qEl.value)) || 1) + Number(b.dataset.step) * 0.5);
      qEl.value = qty;
    }));
    qEl.addEventListener('change', () => { qty = Math.max(0.5, parseFloat(en(qEl.value)) || 1); qEl.value = qty; });

    $('#pdpAdd').addEventListener('click', () => Cart.add(p.id, tone, Math.max(0.5, parseFloat(en(qEl.value)) || 1)));
    $('#pdpBuy [data-ask]').addEventListener('click', e => Advisor.open(e.currentTarget.dataset.ask, e.currentTarget));
  }

  /* ---------------------- روایت و برگهٔ فنی ---------------------- */
  function paintStory() {
    $('#pdpStory').innerHTML = `
      <p>${esc(p.story)}</p>
      <h2>کجا خوب می‌نشیند</h2>
      <p>${esc(p.desc)} این کد در خانوادهٔ «${esc(p.familyLabel)}» قرار دارد و با تمام کدهای هم‌خانواده هم‌ابعاد است؛
         یعنی می‌توانید در یک نما ترکیبش کنید بدون اینکه بند و ردیف‌ها به هم بخورد.</p>
      <ul>${p.marks.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
      <blockquote>${esc(KNOWLEDGE.install.replace(/\*\*/g, ''))}</blockquote>
      <h2>پیش از سفارش</h2>
      <p>پیشنهاد ما این است که نمونه را از نزدیک ببینید. جعبهٔ نمونه رایگان است و ظرف ۴۸ ساعت می‌رسد؛
         کنار نمای فعلی بگذارید و در سه ساعت مختلف روز نگاهش کنید.</p>`;

    $('#pdpSpecs').innerHTML = [
      ['ابعاد', fa(p.dims) + ' میلی‌متر'],
      ['جذب آب', p.absorb],
      ['مقاومت فشاری', fa(p.strength)],
      ['تعداد در هر ' + p.unit, p.perLabel],
      ['وزن', p.weight],
      ['بسته‌بندی', p.pack],
      ['آماده‌سازی', p.lead]
    ].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  }

  /* -------------------------- برآورد سریع ------------------------ */
  function paintEstimate() {
    const area = Math.max(0, parseFloat(en($('#pdpArea').value)) || 0);
    const est = estimate({ product: p, width: area, height: 1, openings: 0 });
    $('#pdpEstimate').innerHTML = [
      ['با ۷٪ پرت', faFloat(est.billed) + ' ' + p.unit],
      ['تعداد آجر', faNum(est.bricks) + ' عدد'],
      ['تعداد پالت', faNum(est.pallets) + (p.pallet === 1 ? ' کارتن' : ' پالت')],
      ['برآورد هزینه', toman(est.price)]
    ].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    return est;
  }

  /* --------------------------- هم‌خانواده ------------------------ */
  function paintRelated() {
    const rel = PRODUCTS.filter(x => x.id !== p.id && x.family === p.family).slice(0, 3);
    const fill = rel.length < 3
      ? rel.concat(PRODUCTS.filter(x => x.id !== p.id && !rel.includes(x)).slice(0, 3 - rel.length))
      : rel;
    const box = $('#pdpRelated');
    box.innerHTML = fill.map(x => AZUI.card(x)).join('');
    wireImages(box);
    AZUI.wireCards(box);
  }

  /* ------------------------------ شروع --------------------------- */
  function init() {
    p = byId(param('id')) || PRODUCTS[0];
    tone = p.tones[0].name;

    document.title = p.name + ' | آذرخش';
    $('#pdpCrumb').textContent = p.name;
    $('#pdpIndex').textContent = 'اثر ' + pad2(p.index);

    paintMedia();
    paintBuy();
    paintStory();
    paintRelated();
    paintEstimate();

    $('#pdpArea').addEventListener('input', paintEstimate);
    $('#pdpCalcAdd').addEventListener('click', () => {
      const est = paintEstimate();
      if (!est || est.billed <= 0) { toast('ابتدا متراژ نما را وارد کنید'); return; }
      Cart.add(p.id, tone, Math.round(est.billed * 2) / 2);
      AZUI.openCart();
    });
  }

  return { init };
})();
