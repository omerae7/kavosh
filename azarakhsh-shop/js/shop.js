/* =========================================================================
   Azarakhsh · منطق فروشگاه
   رندر محصولات، سبد خرید، محاسبه‌گر متراژ و فرم‌ها.
   بدون وابستگی به فریم‌ورک؛ فقط بوت‌استرپ برای مودال و آفکانواس.
   ========================================================================= */
(function () {
  'use strict';

  /* ----------------------------- ابزارها ----------------------------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  const fa = v => String(v).replace(/[0-9]/g, d => FA_DIGITS[+d]);
  const en = v => String(v)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

  const faNum   = n => fa(Math.round(Number(n) || 0).toLocaleString('en-US')).replace(/,/g, '٬');
  const toman   = n => faNum(n) + ' تومان';
  const faFloat = (n, d = 1) =>
    fa((Math.round(Number(n) * 10 ** d) / 10 ** d).toFixed(d)).replace('.', '٫');

  const byId = id => PRODUCTS.find(p => p.id === id);

  /* اگر عکس واقعی هنوز آپلود نشده، جای آن یک placeholder با نام دقیق فایل می‌نشیند */
  function wireImages(root) {
    $$('img[data-fallback]', root).forEach(img => {
      img.addEventListener('error', function () {
        if (this.dataset.failed) return;
        this.dataset.failed = '1';
        const box = document.createElement('div');
        box.className = 'img-fallback';
        box.innerHTML =
          '<strong>جای عکس محصول</strong><span>' + this.getAttribute('src') + '</span>';
        this.replaceWith(box);
      }, { once: true });
    });
  }

  const html = str => {
    const t = document.createElement('template');
    t.innerHTML = str.trim();
    return t.content;
  };

  /* ------------------------------ توست ------------------------------ */
  let toastTimer;
  function toast(msg) {
    const box = $('#toast');
    $('#toastText').textContent = msg;
    box.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('is-on'), 2600);
  }

  /* ============================ کارت محصول =========================== */
  function toneImages(product, toneName) {
    const t = (product.tones || []).find(x => x.name === toneName);
    const slug = t ? t.file : product.slug;
    return {
      wall:   'assets/products/' + slug + '-wall.jpg',
      single: 'assets/products/' + slug + '-single.jpg'
    };
  }

  function cardMarkup(p, mini) {
    const img = toneImages(p, p.tones[0] && p.tones[0].name);
    const badge = p.badge
      ? `<span class="pcard__badge${p.badge === 'محدود' ? ' pcard__badge--quiet' : ''}">${p.badge}</span>`
      : '<span></span>';

    const tones = p.tones.map((t, i) => `
      <button class="tone${i === 0 ? ' is-active' : ''}" type="button"
              style="background:${t.hex}" data-tone="${t.name}"
              title="${t.name}" aria-label="رنگ ${t.name}"></button>`).join('');

    const old = p.oldPrice ? `<s class="pcard__old">${faNum(p.oldPrice)}</s>` : '';

    const specs = mini ? '' : `
      <ul class="pcard__specs">
        <li><dt>ابعاد (mm)</dt><dd>${fa(p.dims)}</dd></li>
        <li><dt>جذب آب</dt><dd>${p.absorption}</dd></li>
        <li><dt>در هر ${p.unit}</dt><dd>${p.perUnit}</dd></li>
      </ul>
      <div class="pcard__tones">
        <span class="pcard__tones-label">رنگ‌بندی</span>${tones}
      </div>`;

    return `
      <article class="pcard${mini ? ' pcard--mini' : ''}" data-id="${p.id}" data-tone="${p.tones[0].name}">
        <div class="pcard__frame">
          <img class="pcard__img pcard__img--a" src="${img.wall}" alt="بافت ${p.name}" loading="lazy" data-fallback>
          <img class="pcard__img pcard__img--b" src="${img.single}" alt="تک آجر ${p.name}" loading="lazy" data-fallback>
          <span class="pcard__veil"></span>
          <span class="pcard__glow"></span>
          <div class="pcard__top">
            ${badge}
            <span class="pcard__code">${p.code}</span>
          </div>
          <button class="pcard__peek" type="button" data-peek>
            <svg width="16" height="16"><use href="#i-eye"/></svg>
            مشاهدهٔ جزئیات
          </button>
        </div>

        <div class="pcard__body">
          <div class="pcard__meta">
            <span>${p.familyLabel}</span>
            <span class="pcard__stock">
              <span class="dot${p.stock === 'موجود در انبار' ? '' : ' dot--warn'}"></span>${p.stock}
            </span>
          </div>
          <h3 class="pcard__title">${p.name}</h3>
          <p class="pcard__tagline">${p.tagline}</p>
          ${specs}
          <div class="pcard__foot">
            <div class="pcard__price-box">
              <span class="pcard__price-label">قیمت هر ${p.unit} ${old}</span>
              <span class="pcard__price-row">
                <span class="pcard__price">${faNum(p.price)}</span>
                <span class="pcard__unit">تومان</span>
              </span>
            </div>
            <button class="pcard__add" type="button" data-add>
              <svg width="16" height="16"><use href="#i-plus"/></svg>
              افزودن
            </button>
          </div>
        </div>
      </article>`;
  }

  /* رفتار مشترک کارت‌ها: نورافکن، تعویض رنگ، جزئیات، افزودن */
  function wireCards(root) {
    $$('.pcard', root).forEach(card => {
      const p = byId(card.dataset.id);
      const frame = $('.pcard__frame', card);

      frame.addEventListener('pointermove', e => {
        const r = frame.getBoundingClientRect();
        frame.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        frame.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });

      $$('.tone', card).forEach(btn => {
        btn.addEventListener('click', () => {
          $$('.tone', card).forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          card.dataset.tone = btn.dataset.tone;
          const im = toneImages(p, btn.dataset.tone);
          const a = $('.pcard__img--a', card);
          const b = $('.pcard__img--b', card);
          if (a) { a.src = im.wall; a.removeAttribute('data-failed'); }
          if (b) { b.src = im.single; b.removeAttribute('data-failed'); }
        });
      });

      const peek = $('[data-peek]', card);
      if (peek) peek.addEventListener('click', () => openQuickView(p.id, card.dataset.tone));

      const add = $('[data-add]', card);
      if (add) add.addEventListener('click', () => {
        Cart.add(p.id, card.dataset.tone, 1);
        add.classList.add('is-done');
        add.innerHTML = '<svg width="16" height="16"><use href="#i-check"/></svg> افزوده شد';
        setTimeout(() => {
          add.classList.remove('is-done');
          add.innerHTML = '<svg width="16" height="16"><use href="#i-plus"/></svg> افزودن';
        }, 1600);
      });
    });
  }

  /* ============================ شبکهٔ فروشگاه ========================= */
  const state = { family: 'all', sort: 'featured' };

  function renderChips() {
    const box = $('#chips');
    box.innerHTML = FAMILIES.map(f => {
      const n = f.id === 'all' ? PRODUCTS.length : PRODUCTS.filter(p => p.family === f.id).length;
      return `<button class="chip${f.id === state.family ? ' is-active' : ''}" type="button"
                data-family="${f.id}">${f.label} <span style="opacity:.55">${fa(n)}</span></button>`;
    }).join('');

    $$('.chip', box).forEach(chip => chip.addEventListener('click', () => {
      state.family = chip.dataset.family;
      $$('.chip', box).forEach(c => c.classList.toggle('is-active', c === chip));
      renderGrid();
    }));
  }

  function currentList() {
    let list = state.family === 'all'
      ? PRODUCTS.slice()
      : PRODUCTS.filter(p => p.family === state.family);

    if (state.sort === 'cheap')      list.sort((a, b) => a.price - b.price);
    else if (state.sort === 'expensive') list.sort((a, b) => b.price - a.price);
    else if (state.sort === 'name')  list.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
    return list;
  }

  function renderGrid() {
    const grid = $('#pgrid');
    const list = currentList();

    grid.innerHTML = list.length
      ? list.map(p => cardMarkup(p, false)).join('')
      : '<p class="pgrid__empty">در این دسته فعلاً محصولی ثبت نشده است.</p>';

    wireImages(grid);
    wireCards(grid);

    $('#shopCount').textContent =
      'نمایش ' + fa(list.length) + ' کد از ' + fa(PRODUCTS.length) + ' کد تولیدی کارخانه';

    document.dispatchEvent(new CustomEvent('az:grid'));
  }

  /* ========================= مودال جزئیات محصول ====================== */
  let qvModal;
  function openQuickView(id, toneName) {
    const p = byId(id);
    const tone = toneName || p.tones[0].name;
    const shots = p.tones.map(t => toneImages(p, t.name));
    const main = toneImages(p, tone);

    $('#quickViewBody').innerHTML = `
      <button class="qv__close" type="button" data-bs-dismiss="modal" aria-label="بستن">
        <svg width="17" height="17"><use href="#i-close"/></svg>
      </button>
      <div class="qv">
        <div class="qv__media">
          <img id="qvMain" src="${main.wall}" alt="${p.name}" data-fallback>
          <div class="qv__thumbs">
            ${[main.wall, main.single].concat(shots.slice(1).map(s => s.wall)).map((src, i) => `
              <button class="qv__thumb${i === 0 ? ' is-active' : ''}" type="button" data-src="${src}">
                <img src="${src}" alt="" data-fallback>
              </button>`).join('')}
          </div>
        </div>

        <div class="qv__body">
          <span class="eyebrow eyebrow--plain">${p.familyLabel} · ${p.code}</span>
          <h3 class="h-section mt-2" style="font-size:clamp(1.5rem,2.4vw,2rem)">${p.name}</h3>
          <p class="lede mt-2" style="font-size:.94rem">${p.tagline}</p>

          <div class="qv__marks">
            ${p.highlights.map(h => `<span class="pill">${h}</span>`).join('')}
          </div>

          <table class="qv__specs">
            <tbody>
              <tr><th>ابعاد</th><td>${fa(p.dims)} میلی‌متر</td></tr>
              <tr><th>جذب آب</th><td>${p.absorption}</td></tr>
              <tr><th>مقاومت فشاری</th><td>${fa(p.strength)}</td></tr>
              <tr><th>تعداد در هر ${p.unit}</th><td>${p.perUnit}</td></tr>
              <tr><th>وزن</th><td>${p.weight}</td></tr>
              <tr><th>بسته‌بندی</th><td>${p.pack}</td></tr>
              <tr><th>زمان آماده‌سازی</th><td>${p.lead}</td></tr>
            </tbody>
          </table>

          <div class="pcard__tones mb-3">
            <span class="pcard__tones-label">رنگ‌بندی</span>
            ${p.tones.map(t => `
              <button class="tone${t.name === tone ? ' is-active' : ''}" type="button"
                      style="background:${t.hex}" data-tone="${t.name}" title="${t.name}"></button>`).join('')}
          </div>

          <div class="qv__buy">
            <div>
              <span class="pcard__price-label">قیمت هر ${p.unit}</span>
              <span class="pcard__price">${faNum(p.price)}</span>
              <span class="pcard__unit">تومان</span>
            </div>
            <div class="stepper">
              <button type="button" data-step="-1" aria-label="کاهش">−</button>
              <input type="number" id="qvQty" value="1" min="0.5" step="0.5" inputmode="decimal" aria-label="مقدار">
              <button type="button" data-step="1" aria-label="افزایش">+</button>
            </div>
            <button class="btn-az flex-grow-1" type="button" id="qvAdd">
              <svg width="17" height="17"><use href="#i-cart"/></svg>
              افزودن به سبد
            </button>
          </div>
        </div>
      </div>`;

    const body = $('#quickViewBody');
    wireImages(body);

    let picked = tone;

    $$('.qv__thumb', body).forEach(t => t.addEventListener('click', () => {
      $$('.qv__thumb', body).forEach(x => x.classList.remove('is-active'));
      t.classList.add('is-active');
      const m = $('#qvMain');
      if (m) { m.src = t.dataset.src; m.removeAttribute('data-failed'); }
    }));

    $$('.tone', body).forEach(btn => btn.addEventListener('click', () => {
      $$('.tone', body).forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      picked = btn.dataset.tone;
      const im = toneImages(p, picked);
      const m = $('#qvMain');
      if (m) { m.src = im.wall; m.removeAttribute('data-failed'); }
      $$('.qv__thumb', body)[0].querySelector('img').src = im.wall;
      $$('.qv__thumb', body)[1].querySelector('img').src = im.single;
      $$('.qv__thumb', body)[0].dataset.src = im.wall;
      $$('.qv__thumb', body)[1].dataset.src = im.single;
    }));

    const qty = $('#qvQty', body);
    $$('[data-step]', body).forEach(b => b.addEventListener('click', () => {
      const v = Math.max(0.5, (parseFloat(en(qty.value)) || 1) + Number(b.dataset.step) * 0.5);
      qty.value = v;
    }));

    $('#qvAdd', body).addEventListener('click', () => {
      Cart.add(p.id, picked, Math.max(0.5, parseFloat(en(qty.value)) || 1));
      qvModal.hide();
    });

    qvModal = qvModal || new bootstrap.Modal($('#quickView'));
    qvModal.show();
  }

  /* ============================== سبد خرید =========================== */
  const Cart = (function () {
    const KEY = 'azarakhsh-cart-v1';
    let items = [];

    try { items = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { items = []; }

    const save = () => {
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* حالت خصوصی مرورگر */ }
    };

    const keyOf = (id, tone) => id + '|' + tone;

    const totals = () => items.reduce((acc, it) => {
      const p = byId(it.id);
      if (!p) return acc;
      acc.sum  += p.price * it.qty;
      acc.qty  += it.qty;
      acc.rows += 1;
      return acc;
    }, { sum: 0, qty: 0, rows: 0 });

    function add(id, tone, qty) {
      const k = keyOf(id, tone);
      const found = items.find(it => keyOf(it.id, it.tone) === k);
      if (found) found.qty = Math.round((found.qty + qty) * 2) / 2;
      else items.push({ id, tone, qty });
      save(); render();
      const p = byId(id);
      toast(p.name + ' به سبد اضافه شد');
      bump();
    }

    function setQty(k, qty) {
      const it = items.find(x => keyOf(x.id, x.tone) === k);
      if (!it) return;
      it.qty = Math.max(0.5, Math.round(qty * 2) / 2);
      save(); render();
    }

    function remove(k) {
      items = items.filter(x => keyOf(x.id, x.tone) !== k);
      save(); render();
    }

    function clear() { items = []; save(); render(); }

    function bump() {
      const el = $('#cartCount');
      if (!window.gsap) return;
      gsap.fromTo(el, { scale: 1.6 }, { scale: 1, duration: .5, ease: 'elastic.out(1, .5)' });
    }

    function render() {
      const body = $('#cartBody');
      const t = totals();

      if (!items.length) {
        body.innerHTML = `
          <div class="cart-empty">
            <svg width="40" height="40"><use href="#i-cart"/></svg>
            <p class="mb-1">سبد سفارش شما خالی است.</p>
            <p style="font-size:.85rem">از فهرست محصولات، کدهای موردنظرتان را اضافه کنید.</p>
          </div>`;
      } else {
        body.innerHTML = items.map(it => {
          const p = byId(it.id);
          if (!p) return '';
          const k = keyOf(it.id, it.tone);
          const im = toneImages(p, it.tone);
          return `
            <div class="cart-line" data-key="${k}">
              <div class="cart-line__thumb"><img src="${im.wall}" alt="" data-fallback></div>
              <div>
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div class="cart-line__name">${p.name}</div>
                    <div class="cart-line__tone">${it.tone} · ${p.code}</div>
                  </div>
                  <button class="cart-line__rm" type="button" data-rm aria-label="حذف">
                    <svg width="17" height="17"><use href="#i-trash"/></svg>
                  </button>
                </div>
                <div class="cart-line__row">
                  <div class="stepper stepper--sm">
                    <button type="button" data-q="-1" aria-label="کاهش">−</button>
                    <input type="number" value="${it.qty}" min="0.5" step="0.5" inputmode="decimal" aria-label="مقدار">
                    <button type="button" data-q="1" aria-label="افزایش">+</button>
                  </div>
                  <span class="cart-line__total">${toman(p.price * it.qty)}</span>
                </div>
                <div class="cart-line__tone mt-1">${faFloat(it.qty)} ${p.unit} × ${faNum(p.price)}</div>
              </div>
            </div>`;
        }).join('');

        wireImages(body);

        $$('.cart-line', body).forEach(line => {
          const k = line.dataset.key;
          const input = $('input', line);
          $$('[data-q]', line).forEach(b => b.addEventListener('click', () =>
            setQty(k, (parseFloat(en(input.value)) || 1) + Number(b.dataset.q) * 0.5)));
          input.addEventListener('change', () => setQty(k, parseFloat(en(input.value)) || 1));
          $('[data-rm]', line).addEventListener('click', () => remove(k));
        });
      }

      $('#cartTotal').textContent = toman(t.sum);
      $('#cartArea').textContent  = faFloat(t.qty) + ' واحد سفارش';
      $('#cartSub').textContent   = t.rows ? fa(t.rows) + ' قلم در سبد' : 'خالی است';
      $('#orderSummary').textContent = fa(t.rows) + ' قلم · ' + toman(t.sum);

      const badge = $('#cartCount');
      badge.textContent = fa(t.rows);
      badge.classList.toggle('is-on', t.rows > 0);

      $('#checkout').disabled = t.rows === 0;
      $('#checkout').style.opacity = t.rows === 0 ? .5 : 1;
    }

    return { add, remove, setQty, clear, render, totals, items: () => items };
  })();

  /* ============================= محاسبه‌گر =========================== */
  function initCalc() {
    const sel = $('#calcProduct');
    sel.innerHTML = PRODUCTS.map(p =>
      `<option value="${p.id}">${p.name} · ${p.code}</option>`).join('');

    const read = id => parseFloat(en($('#' + id).value)) || 0;

    function compute() {
      const p = byId(sel.value) || PRODUCTS[0];
      const gross = read('calcW') * read('calcH');
      const open  = Math.min(80, Math.max(0, read('calcOpen')));
      const joint = parseFloat($('#calcJoint').value) || 1;

      const area   = Math.max(0, gross * (1 - open / 100));
      const withWaste = area * 1.07;
      const bricks = Math.ceil(withWaste * p.perUnitN * joint);
      const pallets = Math.ceil(withWaste / p.perPallet);
      const weight = withWaste * p.weightN;
      const price  = Math.round(withWaste * p.price);

      $('#outArea').textContent    = faFloat(area) + ' ' + p.unit;
      $('#outBricks').textContent  = faNum(bricks) + ' عدد';
      $('#outPallets').textContent = faNum(pallets) + (p.perPallet === 1 ? ' کارتن' : ' پالت');
      $('#outWeight').textContent  = weight >= 1000
        ? faFloat(weight / 1000, 1) + ' تن'
        : faNum(weight) + ' کیلوگرم';
      $('#outPrice').textContent   = toman(price);
      $('#outUnitPrice').textContent = faNum(p.price) + ' تومان / ' + p.unit;

      return { p, withWaste };
    }

    $$('#calcForm input, #calcForm select').forEach(f => {
      f.addEventListener('input', compute);
      f.addEventListener('change', compute);
    });

    $('#calcAdd').addEventListener('click', () => {
      const { p, withWaste } = compute();
      if (withWaste <= 0) { toast('ابتدا ابعاد دیوار را وارد کنید'); return; }
      Cart.add(p.id, p.tones[0].name, Math.max(0.5, Math.round(withWaste * 2) / 2));
      const panel = bootstrap.Offcanvas.getOrCreateInstance($('#cartPanel'));
      panel.show();
    });

    compute();
  }

  /* ======================= پروژه‌ها، نظرها، سوال‌ها ==================== */
  function renderGallery() {
    const box = $('#gallery');
    box.innerHTML = PROJECTS.map((pr, i) => {
      const mod = i === 0 ? ' gal__item--tall' : (i === 4 ? ' gal__item--wide' : '');
      return `
        <button class="gal__item${mod}" type="button" data-src="${pr.file}" data-title="${pr.title}" data-meta="${pr.meta}">
          <img src="${pr.file}" alt="${pr.title}" loading="lazy" data-fallback>
          <span class="gal__cap"><b>${pr.title}</b><span>${pr.meta}</span></span>
        </button>`;
    }).join('');
    wireImages(box);

    const lb = new bootstrap.Modal($('#lightbox'));
    $$('.gal__item', box).forEach(item => item.addEventListener('click', () => {
      $('#lightboxImg').src = item.dataset.src;
      $('#lightboxImg').alt = item.dataset.title;
      $('#lightboxCap').innerHTML =
        '<b>' + item.dataset.title + '</b><br><span style="opacity:.65;font-size:.85rem">' + item.dataset.meta + '</span>';
      lb.show();
    }));
  }

  function renderQuotes() {
    $('#quotesWrap').innerHTML = TESTIMONIALS.map(t => `
      <div class="swiper-slide">
        <div class="qslide">
          <svg class="qslide__mark" width="26" height="26"><use href="#i-quote"/></svg>
          <p>${t.text}</p>
          <div class="qslide__who">
            <span class="qslide__av">${t.name.trim().charAt(0)}</span>
            <span><b>${t.name}</b><span>${t.role}</span></span>
          </div>
        </div>
      </div>`).join('');
  }

  function renderFaq() {
    $('#faq').innerHTML = FAQS.map((f, i) => `
      <div class="accordion-item">
        <h3 class="accordion-header">
          <button class="accordion-button${i ? ' collapsed' : ''}" type="button"
                  data-bs-toggle="collapse" data-bs-target="#faq-${i}"
                  aria-expanded="${i ? 'false' : 'true'}">${f.q}</button>
        </h3>
        <div id="faq-${i}" class="accordion-collapse collapse${i ? '' : ' show'}" data-bs-parent="#faq">
          <div class="accordion-body">${f.a}</div>
        </div>
      </div>`).join('');
  }

  function renderTicker() {
    const row = TICKER.map(t => `<span class="ticker__item">${t}</span>`).join('');
    $('#ticker').innerHTML = row + row;
  }

  function renderHeroCard() {
    $('#heroCard').innerHTML = cardMarkup(PRODUCTS[0], true);
    wireImages($('#heroCard'));
    wireCards($('#heroCard'));
  }

  /* =============================== فرم‌ها ============================ */
  const isPhone = v => /^09\d{9}$/.test(en(v).replace(/[\s-]/g, ''));

  function mark(field, ok) {
    field.classList.toggle('is-invalid', !ok);
    return ok;
  }

  function initForms() {
    /* فرم مشاورهٔ فنی */
    const lead = $('#leadForm');
    lead.addEventListener('submit', e => {
      e.preventDefault();
      const name  = mark($('#fName'),  lead.name.value.trim().length >= 3);
      const phone = mark($('#fPhone'), isPhone(lead.phone.value));
      if (!name || !phone) return;

      $('#leadRef').textContent = fa('AZ-' + Math.floor(100000 + Math.random() * 899999));
      $('#contact').classList.add('is-sent');
      toast('درخواست شما ثبت شد؛ به‌زودی تماس می‌گیریم');
    });

    /* فرم ثبت سفارش */
    const order = $('#orderForm');
    order.addEventListener('submit', e => {
      e.preventDefault();
      const name  = mark($('#oName'),  order.name.value.trim().length >= 3);
      const phone = mark($('#oPhone'), isPhone(order.phone.value));
      const city  = mark($('#oCity'),  order.city.value.trim().length >= 2);
      if (!name || !phone || !city) return;

      const t = Cart.totals();
      if (!t.rows) { toast('سبد سفارش خالی است'); return; }

      const ref = fa('AZ-' + Math.floor(100000 + Math.random() * 899999));
      $('#orderModalBody').innerHTML = `
        <div class="text-center py-4">
          <svg width="52" height="52" style="color:var(--ember);margin-inline:auto"><use href="#i-check"/></svg>
          <h3 class="h-card mt-3">سفارش شما ثبت شد</h3>
          <p class="lede mx-auto mt-2" style="font-size:.94rem">
            شمارهٔ پیگیری <b class="num" style="color:var(--ember)">${ref}</b> ثبت شد.
            پیش‌فاکتور رسمی به‌همراه هزینهٔ باربری تا پایان ساعت کاری برای شما ارسال می‌شود.
          </p>
          <p class="pill mt-2">${fa(t.rows)} قلم · ${toman(t.sum)}</p>
          <div class="mt-4">
            <button class="btn-line" type="button" data-bs-dismiss="modal">بستن</button>
          </div>
        </div>`;
      Cart.clear();
      bootstrap.Offcanvas.getOrCreateInstance($('#cartPanel')).hide();
      toast('سفارش ثبت شد · شمارهٔ پیگیری ' + ref);
    });

    /* پاک شدن خطا هنگام تایپ */
    $$('.field input').forEach(inp => inp.addEventListener('input', () =>
      inp.closest('.field').classList.remove('is-invalid')));
  }

  /* ============================== شروع ============================== */
  function init() {
    renderTicker();
    renderHeroCard();
    renderChips();
    renderGrid();
    renderGallery();
    renderQuotes();
    renderFaq();
    initCalc();
    initForms();
    Cart.render();

    $('#quickView').addEventListener('show.bs.modal', () =>
      bootstrap.Offcanvas.getOrCreateInstance($('#cartPanel')).hide());
    $('#orderModal').addEventListener('show.bs.modal', () =>
      bootstrap.Offcanvas.getOrCreateInstance($('#cartPanel')).hide());

    $('#sortBy').addEventListener('change', e => {
      state.sort = e.target.value;
      renderGrid();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* در دسترس برای لایهٔ حرکت */
  window.AZ = { faNum, fa, toast, Cart, openQuickView };
})();
