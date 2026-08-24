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

  /* ============================ کارت محصول ========================= */
  function card(p) {
    const im = toneImages(p, p.tones[0].name);
    const flag = p.flag
      ? `<span class="pc__flag${p.flag === 'محدود' || p.flag === 'دست‌ساز' ? ' pc__flag--quiet' : ''}">${esc(p.flag)}</span>`
      : '';
    const was = p.was ? `<s class="pc__was">${faNum(p.was)}</s>` : '';

    return `
      <article class="pc" data-id="${p.id}" data-tone="${esc(p.tones[0].name)}">
        <div class="pc__media">
          <img class="pc__img pc__img--main" src="${im.wall}" alt="بافت ${esc(p.name)}" loading="lazy" data-slot>
          <img class="pc__img pc__img--alt"  src="${im.single}" alt="تک آجر ${esc(p.name)}" loading="lazy" data-slot>
          <span class="pc__shade"></span>
          <span class="pc__sheen"></span>
          <div class="pc__top">
            <span class="pc__idx">${pad2(p.index)}</span>
            <span class="pc__code">${esc(p.code)}</span>
          </div>
          ${flag}
        </div>

        <div class="pc__body">
          <div class="pc__kicker">
            <span>${esc(p.familyLabel)}</span>
            <span class="pc__stock">
              <span class="spark${p.stock === 'موجود در انبار' ? '' : ' spark--dim'}"></span>${esc(p.stock)}
            </span>
          </div>

          <h3 class="pc__name">${esc(p.name)}</h3>
          <p class="pc__desc">${esc(p.desc)}</p>

          <div class="pc__rule"></div>

          <ul class="pc__specs">
            <li><dt>ابعاد</dt><dd>${fa(p.dims)}</dd></li>
            <li><dt>جذب آب</dt><dd>${esc(p.absorb)}</dd></li>
            <li><dt>در هر ${esc(p.unit)}</dt><dd>${esc(p.perLabel)}</dd></li>
          </ul>

          <div class="pc__tones">
            <span class="pc__tones-lab">رنگ‌بندی</span>
            ${p.tones.map((t, i) => `
              <button class="tone${i === 0 ? ' is-on' : ''}" type="button"
                      style="background:${t.hex}" data-tone="${esc(t.name)}"
                      aria-label="رنگ ${esc(t.name)}" title="${esc(t.name)}"></button>`).join('')}
          </div>

          <div class="pc__foot">
            <div>
              <span class="pc__price-lab">قیمت هر ${esc(p.unit)} ${was}</span>
              <span class="pc__price-row">
                <span class="pc__price">${faNum(p.price)}</span>
                <span class="pc__unit">تومان</span>
              </span>
            </div>
            <div class="pc__acts">
              <button class="pc__view" type="button" data-view aria-label="جزئیات ${esc(p.name)}"
                      data-cursor="جزئیات">
                <svg width="17" height="17"><use href="#i-eye"/></svg>
              </button>
              <button class="pc__add" type="button" data-add>
                <svg width="15" height="15"><use href="#i-plus"/></svg>
                افزودن
              </button>
            </div>
          </div>
        </div>
      </article>`;
  }

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

  /* ============================ ریل کلکسیون ======================== */
  function list() {
    return state.family === 'all'
      ? PRODUCTS.slice()
      : PRODUCTS.filter(p => p.family === state.family);
  }

  function renderFilters() {
    const box = $('#filters');
    box.innerHTML = FAMILIES.map(f => {
      const n = f.id === 'all' ? PRODUCTS.length : PRODUCTS.filter(p => p.family === f.id).length;
      return `<button class="filter${f.id === state.family ? ' is-on' : ''}" type="button"
                data-family="${f.id}">${esc(f.label)}<i>${fa(n)}</i></button>`;
    }).join('');
    $$('.filter', box).forEach(b => b.addEventListener('click', () => {
      state.family = b.dataset.family;
      $$('.filter', box).forEach(x => x.classList.toggle('is-on', x === b));
      renderRail();
    }));
  }

  function renderRail() {
    const track = $('#railTrack');
    const items = list();
    track.innerHTML = items.map(p => `<div class="rail__item">${card(p)}</div>`).join('');
    wireImages(track);
    wireCards(track);
    $('#railTotal').textContent = fa(items.length);
    $('#railNow').textContent = pad2(1);
    document.dispatchEvent(new CustomEvent('az:rail'));
  }

  /* =========================== شیت محصول =========================== */
  function openProduct(id, toneName) {
    const p = byId(id);
    if (!p) return;
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
  function openCart() { openSheet('#cartSheet', '470px'); }

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

    $('#cartTotal').textContent = toman(t.sum);
    $('#cartUnits').textContent = t.rows ? faFloat(t.qty) + ' واحد' : '—';
    $$('.cart-dot').forEach(d => {
      d.textContent = fa(t.rows);
      d.classList.toggle('is-on', t.rows > 0);
    });
    const btn = $('#toOrder');
    if (btn) { btn.disabled = !t.rows; btn.style.opacity = t.rows ? 1 : .4; }
    $('#orderSum').textContent = fa(t.rows) + ' قلم · ' + toman(t.sum);
    if ($('#cartPane').hidden === false || !t.rows) showPane('cartPane');
  }

  /* ============================ محاسبه‌گر ========================== */
  async function initCalc() {
    await customElements.whenDefined('sl-range');
    await customElements.whenDefined('sl-select');

    const sel = $('#calcProduct');
    sel.innerHTML = PRODUCTS.map(p =>
      `<sl-option value="${p.id}">${esc(p.name)} · ${esc(p.code)}</sl-option>`).join('');
    await customElements.whenDefined('sl-option');
    sel.value = 'r110';

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
  function renderGallery() {
    const box = $('#gallery');
    box.innerHTML = PROJECTS.map(p => `
      <button class="gal__i" type="button" data-src="${p.file}" data-title="${esc(p.title)}"
              data-meta="${esc(p.meta)}" data-cursor="بزرگ‌نمایی">
        <img src="${p.file}" alt="${esc(p.title)}" loading="lazy" data-slot>
        <span class="gal__cap"><b>${esc(p.title)}</b><span>${esc(p.meta)}</span></span>
      </button>`).join('');
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

  function renderVoices() {
    const box = $('#voices');
    box.innerHTML = VOICES.map((v, i) => `
      <figure class="voice${i === 0 ? ' is-on' : ''}">
        <p>«${esc(v.text)}»</p>
        <figcaption class="voice__who">
          <span class="voice__av">${esc(v.name.trim().charAt(0))}</span>
          <span><b>${esc(v.name)}</b><span>${esc(v.role)}</span></span>
        </figcaption>
      </figure>`).join('');

    const nav = $('#voiceNav');
    nav.innerHTML = VOICES.map((_, i) =>
      `<button type="button" class="${i === 0 ? 'is-on' : ''}" aria-label="نظر ${i + 1}"></button>`).join('');

    let at = 0, timer;
    const show = i => {
      at = (i + VOICES.length) % VOICES.length;
      $$('.voice', box).forEach((f, k) => f.classList.toggle('is-on', k === at));
      $$('button', nav).forEach((b, k) => b.classList.toggle('is-on', k === at));
    };
    const play = () => { clearInterval(timer); timer = setInterval(() => show(at + 1), 6500); };
    $$('button', nav).forEach((b, i) => b.addEventListener('click', () => { show(i); play(); }));
    play();
  }

  async function renderFaq() {
    const box = $('#faq');
    box.innerHTML = FAQS.map((f, i) => `
      <sl-details ${i === 0 ? 'open' : ''} summary="${esc(f.q)}">
        <p class="small">${esc(f.a)}</p>
      </sl-details>`).join('');
    await customElements.whenDefined('sl-details');
  }

  function renderTicker() {
    const row = TICKER.map(t => `<span class="tick">${esc(t)}</span>`).join('');
    $('#ticker').innerHTML = row + row;
  }

  function renderStage() {
    const p = PRODUCTS[0];
    const im = toneImages(p, p.tones[0].name);
    $('#stageImg').src = im.wall;
    $('#stageName').textContent = p.name;
    $('#stageMeta').textContent = p.code + ' · ' + p.familyLabel;
    $('#stagePrice').innerHTML = faNum(p.price) + ' <small>تومان / ' + esc(p.unit) + '</small>';
    $('#stageOpen').addEventListener('click', () => openProduct(p.id));
    wireImages($('#heroStage'));
  }

  /* =============================== فرم‌ها ========================== */
  async function initForms() {
    await customElements.whenDefined('sl-input');

    /* فرم تماس */
    const lead = $('#leadForm');
    lead.addEventListener('submit', e => {
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
    order.addEventListener('submit', e => {
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

    $('#toOrder').addEventListener('click', () => showPane('orderPane'));
    $('#backToCart').addEventListener('click', () => showPane('cartPane'));
    $('#doneClose').addEventListener('click', () => { closeSheet('#cartSheet'); showPane('cartPane'); });
  }

  /* ============================== ناوبری =========================== */
  function initNav() {
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
    $$('[data-open-advisor]').forEach(b => b.addEventListener('click', () => Advisor.open()));
    $$('[data-open-menu]').forEach(b => b.addEventListener('click', () => openSheet('#menuSheet', '360px')));

    $$('[data-ask]').forEach(b => b.addEventListener('click', () => Advisor.open(b.dataset.ask)));
  }

  /* ============================== شروع ============================= */
  function init() {
    renderTicker();
    renderStage();
    renderFilters();
    renderRail();
    renderGallery();
    renderVoices();
    renderFaq();
    initCalc();
    initForms();
    initNav();
    renderCart();
    Advisor.init();

    document.addEventListener('az:cart', renderCart);
  }

  return { init, openProduct, openCart, renderCart, goTo, card, wireCards };
})();
