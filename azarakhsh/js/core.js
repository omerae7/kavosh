/* =========================================================================
   آذرخش · هستهٔ منطق
   قالب‌بندی اعداد، سبد سفارش، موتور محاسبهٔ متراژ و کمک‌کارهای مشترک.
   ========================================================================= */
window.AZ = (function () {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ------------------------------ اعداد ------------------------------ */
  const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  const fa = v => String(v).replace(/[0-9]/g, d => FA[+d]);

  const en = v => String(v)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[٫،]/g, '.')      /* اعشار فارسی و عربی */
    .replace(/٬/g, '');         /* جداکنندهٔ هزارگان */

  const faNum = n => fa(Math.round(Number(n) || 0).toLocaleString('en-US')).replace(/,/g, '٬');

  const toman = n => faNum(n) + ' تومان';

  const faFloat = (n, d = 1) => {
    const v = Math.round(Number(n) * 10 ** d) / 10 ** d;
    return Number.isInteger(v) ? fa(v) : fa(v.toFixed(d)).replace('.', '٫');
  };

  const pad2 = n => fa(String(n).padStart(2, '0'));

  /* ----------------------------- محصولات ----------------------------- */
  const byId = id => PRODUCTS.find(p => p.id === id);

  function toneImages(product, toneName) {
    const t = (product.tones || []).find(x => x.name === toneName);
    const slug = t ? t.file : product.slug;
    return {
      wall:   'assets/products/' + slug + '-wall.jpg',
      single: 'assets/products/' + slug + '-single.jpg'
    };
  }

  /* اگر عکس واقعی هنوز آپلود نشده، جای آن نام دقیق فایل نشان داده می‌شود */
  function wireImages(root) {
    $$('img[data-slot]', root || document).forEach(img => {
      if (img.dataset.wired) return;
      img.dataset.wired = '1';
      img.addEventListener('error', function handle() {
        if (this.dataset.failed) return;
        this.dataset.failed = '1';
        const box = document.createElement('div');
        box.className = 'img-slot';
        box.innerHTML = '<b>جای عکس</b><span>' + this.getAttribute('src') + '</span>';
        this.replaceWith(box);
      }, { once: true });
    });
  }

  const html = str => {
    const t = document.createElement('template');
    t.innerHTML = str.trim();
    return t.content;
  };

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------- توست ------------------------------ */
  let toastTimer;
  function toast(msg) {
    const box = $('#toast');
    if (!box) return;
    $('#toastText').textContent = msg;
    box.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('is-on'), 2800);
  }

  /* ------------------------------ شیت‌ها ----------------------------- */
  const isPhone = () => window.matchMedia('(max-width: 720px)').matches;

  /* روی موبایل شیت از پایین می‌آید (حس اپلیکیشن)، روی دسکتاپ از کنار */
  async function openSheet(id, size) {
    const el = typeof id === 'string' ? $(id) : id;
    if (!el) return null;
    await customElements.whenDefined('sl-drawer');
    if (isPhone()) {
      el.placement = 'bottom';
      el.style.setProperty('--size', '90vh');
    } else {
      el.placement = 'end';
      el.style.setProperty('--size', size || '460px');
    }
    el.show();
    return el;
  }

  const closeSheet = id => {
    const el = typeof id === 'string' ? $(id) : id;
    if (el && el.hide) el.hide();
  };

  /* ----------------------------- سبد سفارش --------------------------- */
  const Cart = (function () {
    const KEY = 'azarakhsh-order-v2';
    let items = [];

    try { items = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { items = []; }
    if (!Array.isArray(items)) items = [];
    items = items.filter(it => it && byId(it.id));

    const keyOf = (id, tone) => id + '::' + tone;
    const save = () => {
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* حالت ناشناس */ }
    };
    const emit = () => document.dispatchEvent(new CustomEvent('az:cart'));

    function totals() {
      return items.reduce((a, it) => {
        const p = byId(it.id);
        if (!p) return a;
        a.sum += p.price * it.qty;
        a.qty += it.qty;
        a.rows += 1;
        return a;
      }, { sum: 0, qty: 0, rows: 0 });
    }

    function add(id, tone, qty, quiet) {
      const p = byId(id);
      if (!p) return;
      const t = tone || p.tones[0].name;
      const k = keyOf(id, t);
      const found = items.find(it => keyOf(it.id, it.tone) === k);
      const amount = Math.max(0.5, Math.round((qty || 1) * 2) / 2);
      if (found) found.qty = Math.round((found.qty + amount) * 2) / 2;
      else items.push({ id, tone: t, qty: amount });
      save(); emit();
      if (!quiet) toast(p.name + ' به سبد اضافه شد');
    }

    function setQty(key, qty) {
      const it = items.find(x => keyOf(x.id, x.tone) === key);
      if (!it) return;
      const v = Math.round(Number(qty) * 2) / 2;
      if (!v || v < 0.5) return remove(key);
      it.qty = v;
      save(); emit();
    }

    function remove(key) {
      items = items.filter(x => keyOf(x.id, x.tone) !== key);
      save(); emit();
    }

    function clear() { items = []; save(); emit(); }

    return { add, setQty, remove, clear, totals, keyOf, list: () => items.slice() };
  })();

  /* -------------------------- موتور محاسبهٔ متراژ -------------------- */
  const WASTE = 1.07;

  function estimate({ product, width, height, openings = 0, joint = 1 }) {
    const p = typeof product === 'string' ? byId(product) : product;
    if (!p) return null;
    const gross = Math.max(0, Number(width) || 0) * Math.max(0, Number(height) || 0);
    const open = Math.min(80, Math.max(0, Number(openings) || 0));
    const area = gross * (1 - open / 100);
    const withWaste = area * WASTE;
    return {
      product: p,
      area,
      billed: withWaste,
      bricks: Math.ceil(withWaste * p.per * (Number(joint) || 1)),
      pallets: Math.ceil(withWaste / p.pallet),
      weight: withWaste * p.kg,
      price: Math.round(withWaste * p.price)
    };
  }

  /* اگر متن کاربر عدد داشت، برای مشاور استخراج می‌شود */
  function numbersIn(text) {
    return (en(text).match(/\d+(?:[.,]\d+)?/g) || [])
      .map(n => parseFloat(n.replace(',', '.')))
      .filter(n => !isNaN(n));
  }

  /* -------------------------- اعتبارسنجی فرم ------------------------- */
  const isPhoneNumber = v => /^09\d{9}$/.test(en(v || '').replace(/[\s\-‌]/g, ''));

  return {
    $, $$, fa, en, faNum, toman, faFloat, pad2,
    byId, toneImages, wireImages, html, esc,
    toast, openSheet, closeSheet, isPhone,
    Cart, estimate, numbersIn, isPhoneNumber, WASTE
  };
})();
