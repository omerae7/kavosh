/* ===================== فهرست پروژه‌ها ===================== */
window.AZProjects = (function () {
  'use strict';
  const { $, $$, fa, wireImages, esc } = AZ;
  let type = 'همه';

  function card(pr) {
    const codes = pr.codes.map(c => (AZ.byId(c) || {}).code).filter(Boolean).join(' · ');
    return `
      <article class="tile prj-card">
        <a class="tile__link" href="project.html?id=${encodeURIComponent(pr.id)}" aria-label="${esc(pr.title)}"></a>
        <div class="tile__media">
          <span class="tile__tag">${esc(pr.type)}</span>
          <img src="${pr.cover}" alt="${esc(pr.title)}" loading="lazy" data-slot>
        </div>
        <div class="tile__body">
          <div class="tile__kicker"><b>${esc(pr.city)}</b><span>·</span><span>${esc(pr.year)}</span></div>
          <h3>${esc(pr.title)}</h3>
          <p>${esc(pr.brief)}</p>
          <div class="tile__foot">
            <span class="prj-meta">
              <span><svg width="13" height="13"><use href="#i-grid"/></svg>${esc(pr.area)}</span>
            </span>
            <span class="ltr" style="font-size:.72rem">${esc(codes)}</span>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const list = type === 'همه' ? PROJECTS_FULL : PROJECTS_FULL.filter(p => p.type === type);
    const grid = $('#prjGrid');
    grid.innerHTML = list.length
      ? list.map(card).join('')
      : `<div class="empty"><svg width="34" height="34"><use href="#i-layers"/></svg>
           <h3>در این دسته پروژه‌ای ثبت نشده</h3><p>دستهٔ دیگری را امتحان کنید.</p></div>`;
    wireImages(grid);
    $('#prjCount').textContent = fa(list.length) + ' پروژه';
    $$('#prjTypes .chip').forEach(c => c.classList.toggle('is-on', c.dataset.type === type));
  }

  function init() {
    $('#prjTypes').innerHTML = PROJECT_TYPES.map(t =>
      `<button class="chip${t === type ? ' is-on' : ''}" type="button" data-type="${esc(t)}">${esc(t)}</button>`).join('');
    $$('#prjTypes .chip').forEach(c => c.addEventListener('click', () => { type = c.dataset.type; render(); }));
    render();
  }

  return { init };
})();
