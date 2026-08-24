/* ===================== صفحهٔ ۴۰۴ ===================== */
window.AZNotFound = (function () {
  'use strict';
  const { $, wireImages } = AZ;

  function init() {
    const form = $('#nfForm');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const q = $('#nfQ').value.trim();
      location.href = 'search.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });

    /* سه پیشنهاد تصادفی از کلکسیون */
    const picks = PRODUCTS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    const box = $('#nfPicks');
    box.innerHTML = picks.map(p => AZUI.card(p)).join('');
    wireImages(box);
    AZUI.wireCards(box);
  }

  return { init };
})();
