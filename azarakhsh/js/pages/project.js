/* ===================== پروندهٔ یک پروژه ===================== */
window.AZProject = (function () {
  'use strict';
  const { $, $$, fa, faNum, wireImages, esc, byId } = AZ;

  function init() {
    const id = new URLSearchParams(location.search).get('id');
    const idx = Math.max(0, PROJECTS_FULL.findIndex(p => p.id === id));
    const pr = PROJECTS_FULL[idx];

    document.title = pr.title + ' | آذرخش';
    $('#prjCrumb').textContent = pr.title;
    $('#prjKicker').textContent = `${pr.city} · ${pr.type} · ${pr.year}`;
    $('#prjTitle').textContent = pr.title;
    $('#prjBrief').textContent = pr.brief;
    const hero = $('#prjHeroImg');
    hero.src = pr.cover;
    hero.alt = pr.title;
    wireImages($('.prj-hero'));

    $('#prjStats').innerHTML = [
      [pr.area, 'متراژ نما'],
      [pr.year, 'سال اجرا'],
      [pr.duration, 'مدت اجرا'],
      [pr.city, 'موقعیت']
    ].map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('');

    $('#prjBody').innerHTML = `
      <h2>صورت مسئله</h2><p>${esc(pr.brief)}</p>
      <h2>چالش اجرا</h2><p>${esc(pr.challenge)}</p>
      <h2>نتیجه</h2><p>${esc(pr.result)}</p>`;

    $('#prjMeta').innerHTML = [
      ['کارفرما', pr.client], ['معمار', pr.architect], ['متراژ', pr.area],
      ['سال', pr.year], ['مدت اجرا', pr.duration], ['کاربری', pr.type]
    ].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

    $('#prjCodes').innerHTML = pr.codes.map(c => {
      const p = byId(c);
      if (!p) return '';
      return `<a href="product.html?id=${p.id}">${esc(p.name)} — ${esc(p.code)}</a>`;
    }).join('');

    const gal = $('#prjGallery');
    gal.innerHTML = pr.shots.map((src, i) => `
      <button class="gal__i${i === 0 ? ' gal__i--tall' : ''}" type="button" data-src="${src}"
              data-title="${esc(pr.title)}" data-meta="${esc(pr.city + ' · ' + pr.area)}" data-cursor="بزرگ‌نمایی">
        <img src="${src}" alt="${esc(pr.title)}" loading="lazy" data-slot>
      </button>`).join('');
    wireImages(gal);

    const lb = $('#lightbox');
    $$('.gal__i', gal).forEach(item => item.addEventListener('click', () => {
      $('#lbImg').src = item.dataset.src;
      $('#lbCap').innerHTML = '<b>' + esc(item.dataset.title) + '</b>' + esc(item.dataset.meta);
      lb.classList.add('is-on');
      document.body.classList.add('is-frozen');
    }));
    const close = () => { lb.classList.remove('is-on'); document.body.classList.remove('is-frozen'); };
    $('#lbClose').addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    $('#prjQuote').textContent = '«' + pr.quote + '»';
    $('#prjQuoteBy').textContent = pr.quoteBy;

    const prev = PROJECTS_FULL[(idx - 1 + PROJECTS_FULL.length) % PROJECTS_FULL.length];
    const next = PROJECTS_FULL[(idx + 1) % PROJECTS_FULL.length];
    $('#prjNav').innerHTML = `
      <a href="project.html?id=${prev.id}">
        <svg width="18" height="18"><use href="#i-arrow"/></svg>
        <div><span>پروژهٔ قبلی</span><b>${esc(prev.title)}</b></div>
      </a>
      <a class="is-next" href="project.html?id=${next.id}">
        <svg width="18" height="18"><use href="#i-arrow"/></svg>
        <div><span>پروژهٔ بعدی</span><b>${esc(next.title)}</b></div>
      </a>`;
  }

  return { init };
})();
