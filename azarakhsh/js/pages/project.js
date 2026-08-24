/* ===================== پروندهٔ یک پروژه =====================
   کل محتوا در بدنهٔ HTML است؛ اینجا فقط لایت‌باکس گالری سیم‌کشی می‌شود. */
window.AZProject = (function () {
  'use strict';
  const { $, $$, wireImages, esc } = AZ;

  function init() {
    wireImages(document.querySelector('.prj-hero'));
    const gal = $('#prjGallery');
    if (!gal) return;
    wireImages(gal);

    const lb = $('#lightbox');
    const close = () => { lb.classList.remove('is-on'); document.body.classList.remove('is-frozen'); };

    $$('.gal__i', gal).forEach(item => item.addEventListener('click', () => {
      $('#lbImg').src = item.dataset.src;
      $('#lbImg').alt = item.dataset.title;
      $('#lbCap').innerHTML = '<b>' + esc(item.dataset.title) + '</b>' + esc(item.dataset.meta);
      lb.classList.add('is-on');
      document.body.classList.add('is-frozen');
    }));

    $('#lbClose').addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  return { init };
})();
