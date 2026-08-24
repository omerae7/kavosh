/* ===================== صفحهٔ ۴۰۴ ===================== */
window.AZNotFound = (function () {
  'use strict';
  const { $ } = AZ;

  function init() {
    $('#nfForm').addEventListener('submit', e => {
      e.preventDefault();
      const q = $('#nfQ').value.trim();
      location.href = 'search.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });

    /* سه پیشنهاد در بدنهٔ صفحه هستند؛ فقط رفتارشان سیم‌کشی می‌شود */
    const box = $('#nfPicks');
    AZ.wireImages(box);
    AZUI.wireCards(box);
  }

  return { init };
})();
