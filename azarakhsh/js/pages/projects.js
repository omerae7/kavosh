/* ===================== فهرست پروژه‌ها ===================== */
window.AZProjects = (function () {
  'use strict';
  const { $, $$, fa, wireImages } = AZ;
  let type = 'همه';

  function apply() {
    let n = 0;
    $$('#prjGrid .tile').forEach(el => {
      const ok = type === 'همه' || el.dataset.type === type;
      el.hidden = !ok;
      if (ok) n++;
    });
    $('#prjCount').textContent = fa(n) + ' پروژه';
    $('#prjEmpty').hidden = n > 0;
    $$('#prjTypes .chip').forEach(c => c.classList.toggle('is-on', c.dataset.type === type));
  }

  function init() {
    wireImages($('#prjGrid'));
    $$('#prjTypes .chip').forEach(c => c.addEventListener('click', () => { type = c.dataset.type; apply(); }));
    apply();
  }

  return { init };
})();
