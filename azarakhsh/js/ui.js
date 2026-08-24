/* =========================================================================
   آذرخش · رابط کاربری
   رندر کلکسیون، شیت محصول، سبد سفارش، محاسبه‌گر، گالری و فرم‌ها.
   ========================================================================= */
window.AZUI = (function () {
  'use strict';

  const { $, $$, fa, en, faNum, toman, faFloat, pad2, byId, toneImages,
          wireImages, esc, toast, Cart, estimate, openSheet, closeSheet,
          isPhoneNumber } = AZ;

  const state = { family: 'all' };

  const goTo = sel => {
    if (window.AZMotion && window.AZMotion.goTo) window.AZMotion.goTo(sel);
    else { const el = $(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  };

  /* ============================ کارت محصول =========================
     قالب کارت اینجا نیست: کارت‌ها مستقیم در بدنهٔ HTML نوشته می‌شوند و با
     tools/build-static.mjs از js/data.js ساخته می‌شوند. اینجا فقط رفتارشان
     سیم‌کشی می‌شود تا قالب دو جا تعریف نشود.                            */

  function wireCards(root) {
    $$('.pc', root).forEach(el => {
      const p = byId(el.dataset.id);
      if (!p) return;

      $$('.tone', el).forEach(btn => btn.addEventListener('click', e => {
        e.stopPropagation();
        $$('.tone', el).forEach(b => b.classList.toggle('is-on', b === btn));
        el.dataset.tone = btn.dataset.tone;
        const im = toneImages(p, btn.dataset.tone);
        const a = $('.pc__img--main', el);
        const b = $('.pc__img--alt', el);
        if (a) { a.src = im.wall; a.removeAttribute('data-failed'); }
        if (b) { b.src = im.single; b.removeAttribute('data-failed'); }
      }));

      const view = $('[data-view]', el);
      if (view) view.addEventListener('click', () => openProduct(p.id, el.dataset.tone));

      const add = $('[data-add]', el);
      if (add) add.addEventListener('click', () => {
        Cart.add(p.id, el.dataset.tone, 1);
        add.classList.add('is-done');
        add.innerHTML = '<svg width="15" height="15"><use href="#i-check"/></svg> افزوده شد';
        setTimeout(() => {
          add.classList.remove('is-done');
          add.innerHTML = '<svg width="15" height="15"><use href="#i-plus"/></svg> افزودن';
        }, 1700);
      });
    });
  }

  /* ============================ ریل کلکسیون ========================
     کارت‌ها در بدنهٔ HTML هستند؛ اینجا فقط سیم‌کشی و فیلتر می‌شوند. */

  function initFilters() {
    const box = $('#filters');
    if (!box) return;
    $$('.filter', box).forEach(btn => btn.addEventListener('click', () => {
      state.family = btn.dataset.family;
      $$('.filter', box).forEach(x => x.classList.toggle('is-on', x === btn));
      applyRailFilter();
    }));
  }

  function applyRailFilter() {
    const items = $$('#railTrack .rail__item');
    if (!items.length) return;
    let shown = 0;
    items.forEach(it => {
      const ok = state.family === 'all' || it.dataset.family === state.family;
      it.hidden = !ok;
      if (ok) shown++;
    });
    const view = $('#railView');
    if (view) view.scrollLeft = 0;
    const total = $('#railTotal');
    if (total) total.textContent = fa(shown);
    const now = $('#railNow');
    if (now) now.textContent = pad2(shown ? 1 : 0);
    document.dispatchEvent(new CustomEvent('az:rail'));
  }

  function initRail() {
    const track = $('#railTrack');
    if (!track) return;
    wireImages(track);
    wireCards(track);
    const total = $('#railTotal');
    if (total) total.textContent = fa($$('.rail__item', track).length);
  }

  /* =========================== شیت محصول =========================== */
  function openProduct(id, toneName) {
    const p = byId(id);
    if (!p) return;
    /* صفحاتی که شیت محصول ندارند، به برگهٔ اثر می‌روند */
    if (!$('#productSheet')) { window.location.href = 'product-' + p.id + '.html'; return; }
    let tone = toneName || p.tones[0].name;
    let qty = 1;

    const shots = () => {
      const im = toneImages(p, tone);
      return [im.wall, im.single].concat(
        p.tones.filter(t => t.name !== tone).map(t => toneImages(p, t.name).wall));
    };

    const body = $('#productBody');
    body.innerHTML = `
      <div class="sheet-grip"></div>
      <div class="pd">
        <div>
          <div class="pd__stage">
            <img id="pdMain" src="${shots()[0]}" alt="${esc(p.name)}" data-slot>
          </div>
          <div class="pd__thumbs" id="pdThumbs"></div>
        </div>

        <div>
          <span class="label label--bare">${esc(p.familyLabel)} · ${esc(p.code)}</span>
          <h3 class="pd__name">${esc(p.name)}</h3>
          <a class="link-more" href="product-${p.id}.html" style="margin-top:.5rem">
            برگهٔ کامل اثر
            <svg width="15" height="15"><use href="#i-arrow"/></svg>
          </a>
          <p class="lede" style="font-size:.92rem;margin-top:.6rem">${esc(p.story)}</p>

          <div class="pd__marks">
            ${p.marks.map(m => `<span class="tag">${esc(m)}</span>`).join('')}
          </div>

          <div class="pc__tones" style="margin:0 0 .4rem">
            <span class="pc__tones-lab">رنگ‌بندی</span>
            ${p.tones.map(t => `
              <button class="tone${t.name === tone ? ' is-on' : ''}" type="button"
                      style="background:${t.hex}" data-tone="${esc(t.name)}" title="${esc(t.name)}"></button>`).join('')}
          </div>

          <sl-tab-group>
            <sl-tab slot="nav" panel="spec">مشخصات فنی</sl-tab>
            <sl-tab slot="nav" panel="use">اجرا و نگهداری</sl-tab>
            <sl-tab slot="nav" panel="ship">ارسال</sl-tab>

            <sl-tab-panel name="spec">
              <dl class="spec-rows">
                <div><dt>ابعاد</dt><dd>${fa(p.dims)} میلی‌متر</dd></div>
                <div><dt>جذب آب</dt><dd>${esc(p.absorb)}</dd></div>
                <div><dt>مقاومت فشاری</dt><dd>${fa(p.strength)}</dd></div>
                <div><dt>تعداد در هر ${esc(p.unit)}</dt><dd>${esc(p.perLabel)}</dd></div>
                <div><dt>وزن</dt><dd>${esc(p.weight)}</dd></div>
                <div><dt>بسته‌بندی</dt><dd>${esc(p.pack)}</dd></div>
              </dl>
            </sl-tab-panel>

            <sl-tab-panel name="use">
              <p class="small">${esc(KNOWLEDGE.install.replace(/\*\*/g, ''))}</p>
              <p class="small" style="margin-top:.8rem">شست‌وشو با آب و برس نرم کافی است؛ از اسید و واترجت با فشار بالا استفاده نکنید.</p>
            </sl-tab-panel>

            <sl-tab-panel name="ship">
              <dl class="spec-rows">
                <div><dt>زمان آماده‌سازی</dt><dd>${esc(p.lead)}</dd></div>
                <div><dt>حداقل سفارش</dt><dd>${esc(p.pack)}</dd></div>
                <div><dt>ارسال رایگان</dt><dd>بالای ۳۰۰ متر مربع</dd></div>
                <div><dt>پوشش ارسال</dt><dd>۹ استان، مستقیم از کارخانه</dd></div>
              </dl>
            </sl-tab-panel>
          </sl-tab-group>

          <div class="pd__buy">
            <div>
              <span class="pc__price-lab">قیمت هر ${esc(p.unit)}</span>
              <span class="pc__price-row">
                <span class="pc__price">${faNum(p.price)}</span>
                <span class="pc__unit">تومان</span>
              </span>
            </div>
            <div class="stepper">
              <button type="button" data-step="-1" aria-label="کاهش">−</button>
              <input type="number" id="pdQty" value="1" min="0.5" step="0.5" inputmode="decimal" aria-label="مقدار">
              <button type="button" data-step="1" aria-label="افزایش">+</button>
            </div>
            <button class="btn" type="button" id="pdAdd" style="flex:1">
              <svg width="16" height="16"><use href="#i-bag"/></svg>
              افزودن به سبد
            </button>
          </div>
        </div>
      </div>`;

    const paintThumbs = () => {
      $('#pdThumbs').innerHTML = shots().map((src, i) => `
        <button class="pd__thumb${i === 0 ? ' is-on' : ''}" type="button" data-src="${src}">
          <img src="${src}" alt="" data-slot>
        </button>`).join('');
      wireImages($('#pdThumbs'));
      $$('#pdThumbs .pd__thumb').forEach(t => t.addEventListener('click', () => {
        $$('#pdThumbs .pd__thumb').forEach(x => x.classList.toggle('is-on', x === t));
        const m = $('#pdMain');
        m.src = t.dataset.src;
        m.removeAttribute('data-failed');
      }));
    };
    paintThumbs();
    wireImages(body);

    $$('.tone', body).forEach(b => b.addEventListener('click', () => {
      $$('.tone', body).forEach(x => x.classList.toggle('is-on', x === b));
      tone = b.dataset.tone;
      const m = $('#pdMain');
      m.src = toneImages(p, tone).wall;
      m.removeAttribute('data-failed');
      paintThumbs();
    }));

    const qtyEl = $('#pdQty', body);
    $$('[data-step]', body).forEach(b => b.addEventListener('click', () => {
      qty = Math.max(0.5, (parseFloat(en(qtyEl.value)) || 1) + Number(b.dataset.step) * 0.5);
      qtyEl.value = qty;
    }));
    qtyEl.addEventListener('change', () => { qty = Math.max(0.5, parseFloat(en(qtyEl.value)) || 1); qtyEl.value = qty; });

    $('#pdAdd', body).addEventListener('click', () => {
      Cart.add(p.id, tone, Math.max(0.5, parseFloat(en(qtyEl.value)) || 1));
      closeSheet('#productSheet');
    });

    $('#productSheet').label = p.name;
    openSheet('#productSheet', '640px');
  }

  /* ============================ سبد سفارش ========================== */
  function openCart() {
    if (!$('#cartSheet')) return;
    openSheet('#cartSheet', '470px');
  }

  function showPane(which) {
    ['cartPane', 'orderPane', 'donePane'].forEach(id => {
      const el = $('#' + id);
      if (el) el.hidden = id !== which;
    });
    const foot = $('#cartFoot');
    if (foot) foot.hidden = which !== 'cartPane';
  }

  function renderCart() {
    const box = $('#cartPane');
    if (!box) {
      const t0 = Cart.totals();
      $$('.cart-dot').forEach(d => {
        d.textContent = fa(t0.rows);
        d.classList.toggle('is-on', t0.rows > 0);
      });
      return;
    }
    const items = Cart.list();
    const t = Cart.totals();

    if (!items.length) {
      box.innerHTML = `
        <div class="sheet-grip"></div>
        <div class="cart-void">
          <svg width="38" height="38"><use href="#i-bag"/></svg>
          <p>سبد سفارش شما خالی است.</p>
          <p class="small">از کلکسیون، کدهای موردنظرتان را اضافه کنید یا از مشاور بخواهید پیشنهاد بدهد.</p>
          <button class="btn-ghost btn-sm" type="button" style="margin-top:1.2rem" id="cartToAdvisor">
            <svg width="15" height="15"><use href="#i-spark"/></svg>
            از مشاور بپرس
          </button>
        </div>`;
      const b = $('#cartToAdvisor');
      if (b) b.addEventListener('click', () => { closeSheet('#cartSheet'); setTimeout(() => Advisor.open(), 320); });
    } else {
      box.innerHTML = '<div class="sheet-grip"></div>' + items.map(it => {
        const p = byId(it.id);
        const im = toneImages(p, it.tone);
        const key = Cart.keyOf(it.id, it.tone);
        return `
          <div class="cart-row" data-key="${key}">
            <span class="cart-row__img"><img src="${im.wall}" alt="" data-slot></span>
            <div>
              <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:flex-start">
                <div>
                  <div class="cart-row__name">${esc(p.name)}</div>
                  <div class="cart-row__meta">${esc(it.tone)} · ${esc(p.code)}</div>
                </div>
                <button class="cart-row__x" type="button" data-x aria-label="حذف">
                  <svg width="16" height="16"><use href="#i-trash"/></svg>
                </button>
              </div>
              <div class="cart-row__line">
                <div class="stepper stepper--sm">
                  <button type="button" data-q="-1" aria-label="کاهش">−</button>
                  <input type="number" value="${it.qty}" min="0.5" step="0.5" inputmode="decimal" aria-label="مقدار">
                  <button type="button" data-q="1" aria-label="افزایش">+</button>
                </div>
                <span class="cart-row__sum">${toman(p.price * it.qty)}</span>
              </div>
              <div class="cart-row__meta" style="margin-top:.4rem">${faFloat(it.qty)} ${esc(p.unit)} × ${faNum(p.price)}</div>
            </div>
          </div>`;
      }).join('');

      wireImages(box);
      $$('.cart-row', box).forEach(row => {
        const key = row.dataset.key;
        const inp = $('input', row);
        $$('[data-q]', row).forEach(b => b.addEventListener('click', () =>
          Cart.setQty(key, (parseFloat(en(inp.value)) || 1) + Number(b.dataset.q) * 0.5)));
        inp.addEventListener('change', () => Cart.setQty(key, parseFloat(en(inp.value)) || 1));
        $('[data-x]', row).addEventListener('click', () => Cart.remove(key));
      });
    }

    const put = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
    put('#cartTotal', toman(t.sum));
    put('#cartUnits', t.rows ? faFloat(t.qty) + ' واحد' : '—');
    $$('.cart-dot').forEach(d => {
      d.textContent = fa(t.rows);
      d.classList.toggle('is-on', t.rows > 0);
    });
    const btn = $('#toOrder');
    if (btn) { btn.disabled = !t.rows; btn.style.opacity = t.rows ? 1 : .4; }
    put('#orderSum', fa(t.rows) + ' قلم · ' + toman(t.sum));
    if (box.hidden === false || !t.rows) showPane('cartPane');
  }

  /* ============================ محاسبه‌گر ========================== */
  async function initCalc() {
    if (!$('#calcProduct')) return;
    await customElements.whenDefined('sl-range');
    await customElements.whenDefined('sl-select');

    const sel = $('#calcProduct');   /* گزینه‌ها در بدنهٔ HTML هستند */
    await customElements.whenDefined('sl-option');
    if (!sel.value) sel.value = 'r110';

    const w = $('#calcW'), h = $('#calcH'), o = $('#calcO'), j = $('#calcJ');

    function paint() {
      const est = estimate({
        product: sel.value,
        width: Number(w.value),
        height: Number(h.value),
        openings: Number(o.value),
        joint: Number(j.value) || 1
      });
      if (!est) return;

      $('#calcWv').textContent = faFloat(w.value) + ' متر';
      $('#calcHv').textContent = faFloat(h.value) + ' متر';
      $('#calcOv').textContent = fa(o.value) + '٪';

      $('#outArea').textContent    = faFloat(est.area) + ' ' + est.product.unit;
      $('#outBricks').textContent  = faNum(est.bricks) + ' عدد';
      $('#outPallets').textContent = faNum(est.pallets) + (est.product.pallet === 1 ? ' کارتن' : ' پالت');
      $('#outWeight').textContent  = est.weight >= 1000
        ? faFloat(est.weight / 1000) + ' تن'
        : faNum(est.weight) + ' کیلوگرم';
      $('#outPrice').textContent   = toman(est.price);
      $('#outUnit').textContent    = faNum(est.product.price) + ' تومان / ' + est.product.unit;
      return est;
    }

    [w, h, o].forEach(r => r.addEventListener('sl-input', paint));
    [sel, j].forEach(s => s.addEventListener('sl-change', paint));
    j.addEventListener('change', paint);

    $('#calcAdd').addEventListener('click', () => {
      const est = paint();
      if (!est || est.billed <= 0) { toast('ابتدا ابعاد دیوار را تنظیم کنید'); return; }
      Cart.add(est.product.id, null, Math.round(est.billed * 2) / 2);
      openCart();
    });

    $('#calcAsk').addEventListener('click', () =>
      Advisor.open(`${fa(w.value)} در ${fa(h.value)} با ${fa(o.value)} درصد بازشو`));

    paint();
  }

  /* ======================== گالری، نظرها، پرسش‌ها =================== */
  function initGallery() {
    const box = $('#gallery');
    if (!box) return;
    wireImages(box);

    const lb = $('#lightbox');
    $$('.gal__i', box).forEach(item => item.addEventListener('click', () => {
      $('#lbImg').src = item.dataset.src;
      $('#lbImg').alt = item.dataset.title;
      $('#lbCap').innerHTML = '<b>' + esc(item.dataset.title) + '</b>' + esc(item.dataset.meta);
      lb.classList.add('is-on');
      document.body.classList.add('is-frozen');
    }));
    const close = () => { lb.classList.remove('is-on'); document.body.classList.remove('is-frozen'); };
    $('#lbClose').addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  function initVoices() {
    const box = $('#voices');
    const nav = $('#voiceNav');
    if (!box || !nav) return;
    const figures = $$('.voice', box);
    const dots = $$('button', nav);
    if (!figures.length) return;

    let at = 0, timer;
    const show = i => {
      at = (i + figures.length) % figures.length;
      figures.forEach((f, k) => f.classList.toggle('is-on', k === at));
      dots.forEach((b, k) => b.classList.toggle('is-on', k === at));
    };
    const play = () => { clearInterval(timer); timer = setInterval(() => show(at + 1), 6500); };
    dots.forEach((b, i) => b.addEventListener('click', () => { show(i); play(); }));
    play();
  }

  /* پرسش‌ها و تیکر هم در بدنهٔ HTML هستند و چیزی برای ساختن ندارند. */

  /* =============================== فرم‌ها ========================== */
  async function initForms() {
    await customElements.whenDefined('sl-input');

    /* فرم تماس */
    const lead = $('#leadForm');
    if (lead) lead.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#leadName'), phone = $('#leadPhone');
      let ok = true;
      if (name.value.trim().length < 3) { name.setCustomValidity('نام را کامل بنویسید'); name.reportValidity(); ok = false; }
      else name.setCustomValidity('');
      if (!isPhoneNumber(phone.value)) { phone.setCustomValidity('شمارهٔ موبایل ۱۱ رقمی وارد کنید'); phone.reportValidity(); ok = false; }
      else phone.setCustomValidity('');
      if (!ok) return;

      $('#leadRef').textContent = fa('AZ-' + Math.floor(100000 + Math.random() * 899999));
      $('#contactPanel').classList.add('is-sent');
      toast('درخواست شما ثبت شد');
    });

    /* فرم سفارش داخل شیت سبد */
    const order = $('#orderForm');
    if (order) order.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#ordName'), phone = $('#ordPhone'), city = $('#ordCity');
      let ok = true;
      if (name.value.trim().length < 3) { name.setCustomValidity('نام را کامل بنویسید'); name.reportValidity(); ok = false; }
      else name.setCustomValidity('');
      if (!isPhoneNumber(phone.value)) { phone.setCustomValidity('شمارهٔ موبایل ۱۱ رقمی وارد کنید'); phone.reportValidity(); ok = false; }
      else phone.setCustomValidity('');
      if (city.value.trim().length < 2) { city.setCustomValidity('شهر پروژه را بنویسید'); city.reportValidity(); ok = false; }
      else city.setCustomValidity('');
      if (!ok) return;

      const t = Cart.totals();
      const ref = fa('AZ-' + Math.floor(100000 + Math.random() * 899999));
      $('#doneRef').textContent = ref;
      $('#doneSum').textContent = fa(t.rows) + ' قلم · ' + toman(t.sum);
      Cart.clear();
      showPane('donePane');
      toast('سفارش ثبت شد · پیگیری ' + ref);
    });

    const bind = (sel, fn) => { const el = $(sel); if (el) el.addEventListener('click', fn); };
    bind('#toOrder', () => showPane('orderPane'));
    bind('#backToCart', () => showPane('cartPane'));
    bind('#doneClose', () => { closeSheet('#cartSheet'); showPane('cartPane'); });
  }

  /* ============================== ناوبری =========================== */
  function initNav() {
    /* بخش فعال منو و داک از data-page روی body می‌آید،
       تا اسکلت مشترک در همهٔ صفحه‌ها دقیقاً یکسان بماند. */
    const key = document.body.dataset.page || '';
    if (key) $$('[data-nav]').forEach(a => a.classList.toggle('is-on', a.dataset.nav === key));

    document.addEventListener('click', e => {
      const a = e.target.closest('[data-go]');
      if (!a) return;
      const href = a.getAttribute('href') || a.dataset.go;
      if (!href || href.charAt(0) !== '#') return;
      e.preventDefault();
      closeSheet('#menuSheet');
      goTo(href);
    });

    $$('[data-open-cart]').forEach(b => b.addEventListener('click', openCart));
    $$('[data-open-advisor]').forEach(b => b.addEventListener('click', () => Advisor.open(null, b)));
    $$('[data-open-menu]').forEach(b => b.addEventListener('click', () => openSheet('#menuSheet', '360px')));

    $$('[data-ask]').forEach(b => b.addEventListener('click', () => Advisor.open(b.dataset.ask, b)));
  }

  /* ============================== شروع ============================= */
  function init() {
    initFilters();
    initRail();
    initGallery();
    initVoices();
    initCalc();
    initForms();
    initNav();
    renderCart();
    if (window.Advisor) Advisor.init();

    document.addEventListener('az:cart', renderCart);
  }

  return { init, openProduct, openCart, renderCart, goTo, wireCards, applyRailFilter };
})();
