/* =========================================================================
   برگهٔ اثر — تک محصول
   کل محتوا در بدنهٔ HTML است. اینجا فقط رفتارها سیم‌کشی می‌شوند:
   تعویض رنگ، گالری، استپر، افزودن به سبد و برآورد متراژ.
   ========================================================================= */
window.AZProduct = (function () {
  'use strict';

  const { $, $$, fa, en, faNum, toman, faFloat, byId, toneImages,
          wireImages, esc, Cart, estimate, toast } = AZ;

  let p, tone;

  /* رنگ‌بندی: تصویر اصلی و بندانگشتی‌ها عوض می‌شوند */
  function paintMedia() {
    const im = toneImages(p, tone);
    const list = [im.wall, im.single].concat(
      p.tones.filter(t => t.name !== tone).map(t => toneImages(p, t.name).wall));

    const main = $('#pdpMain');
    main.src = list[0];
    main.removeAttribute('data-failed');

    $$('#pdpThumbs .pdp__thumb').forEach((btn, i) => {
      const src = list[i];
      if (!src) { btn.hidden = true; return; }
      btn.hidden = false;
      btn.dataset.src = src;
      btn.classList.toggle('is-on', i === 0);
      const img = btn.querySelector('img');
      if (img) { img.src = src; img.removeAttribute('data-failed'); }
    });
  }

  function paintEstimate() {
    const area = Math.max(0, parseFloat(en($('#pdpArea').value)) || 0);
    const est = estimate({ product: p, width: area, height: 1, openings: 0 });
    const rows = [
      ['با ۷٪ پرت', faFloat(est.billed) + ' ' + p.unit],
      ['تعداد آجر', faNum(est.bricks) + ' عدد'],
      ['تعداد پالت', faNum(est.pallets) + (p.pallet === 1 ? ' کارتن' : ' پالت')],
      ['برآورد هزینه', toman(est.price)]
    ];
    $('#pdpEstimate').innerHTML = rows
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    return est;
  }

  function init() {
    p = byId(document.body.dataset.product) || PRODUCTS[0];
    tone = p.tones[0].name;

    wireImages(document.querySelector('.pdp'));
    wireImages($('#pdpRelated'));
    AZUI.wireCards($('#pdpRelated'));

    $$('#pdpThumbs .pdp__thumb').forEach(t => t.addEventListener('click', () => {
      $$('#pdpThumbs .pdp__thumb').forEach(x => x.classList.toggle('is-on', x === t));
      const m = $('#pdpMain');
      m.src = t.dataset.src;
      m.removeAttribute('data-failed');
    }));

    $$('#pdpBuy .tone').forEach(b => b.addEventListener('click', () => {
      tone = b.dataset.tone;
      $$('#pdpBuy .tone').forEach(x => x.classList.toggle('is-on', x === b));
      paintMedia();
    }));

    const qEl = $('#pdpQty');
    $$('#pdpBuy [data-step]').forEach(b => b.addEventListener('click', () => {
      qEl.value = Math.max(0.5, (parseFloat(en(qEl.value)) || 1) + Number(b.dataset.step) * 0.5);
    }));
    qEl.addEventListener('change', () => {
      qEl.value = Math.max(0.5, parseFloat(en(qEl.value)) || 1);
    });

    $('#pdpAdd').addEventListener('click', () =>
      Cart.add(p.id, tone, Math.max(0.5, parseFloat(en(qEl.value)) || 1)));

    const ask = $('#pdpBuy [data-ask]');
    if (ask) ask.addEventListener('click', () => Advisor.open(ask.dataset.ask, ask));

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
