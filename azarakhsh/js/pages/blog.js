/* ===================== دفترچهٔ نما (فهرست مقاله‌ها) ===================== */
window.AZBlog = (function () {
  'use strict';
  const { $, $$, fa, wireImages, esc, toast } = AZ;
  const state = { cat: 'all', q: '' };

  const postCard = a => `
    <article class="tile post">
      <a class="tile__link" href="article.html?slug=${encodeURIComponent(a.slug)}" aria-label="${esc(a.title)}"></a>
      <div class="tile__media">
        <span class="tile__tag">${esc(a.catLabel)}</span>
        <img src="${a.cover}" alt="${esc(a.title)}" loading="lazy" data-slot>
      </div>
      <div class="tile__body">
        <div class="tile__kicker"><b>${esc(a.date)}</b><span>·</span><span>${fa(a.mins)} دقیقه</span></div>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.excerpt)}</p>
        <div class="tile__foot">
          <span>${esc(a.author)}</span>
          <span class="link-more">خواندن <svg width="15" height="15"><use href="#i-arrow"/></svg></span>
        </div>
      </div>
    </article>`;

  function match(a) {
    if (state.cat !== 'all' && a.cat !== state.cat) return false;
    if (!state.q) return true;
    const q = state.q.trim().toLowerCase();
    return [a.title, a.excerpt, a.catLabel, a.author, (a.tags || []).join(' ')]
      .join(' ').toLowerCase().includes(q);
  }

  function render() {
    const list = ARTICLES.filter(match);
    const feat = $('#blogFeature');
    const grid = $('#blogGrid');

    if (list.length && !state.q && state.cat === 'all') {
      const a = list[0];
      feat.hidden = false;
      feat.innerHTML = `
        <a class="feature__link" href="article.html?slug=${encodeURIComponent(a.slug)}" aria-label="${esc(a.title)}"></a>
        <div class="feature__media"><img src="${a.cover}" alt="${esc(a.title)}" data-slot></div>
        <div class="feature__body">
          <span class="label label--bare">تازه‌ترین · ${esc(a.catLabel)}</span>
          <h2>${esc(a.title)}</h2>
          <p>${esc(a.excerpt)}</p>
          <div class="feature__foot">
            <span>${esc(a.author)}</span><span>·</span><span>${esc(a.date)}</span>
            <span>·</span><span>${fa(a.mins)} دقیقه خواندن</span>
          </div>
        </div>`;
      wireImages(feat);
      grid.innerHTML = list.slice(1).map(postCard).join('');
    } else {
      feat.hidden = true;
      feat.innerHTML = '';
      grid.innerHTML = list.length
        ? list.map(postCard).join('')
        : `<div class="empty"><svg width="34" height="34"><use href="#i-doc"/></svg>
             <h3>مقاله‌ای پیدا نشد</h3><p>عبارت دیگری را امتحان کنید یا دسته را عوض کنید.</p></div>`;
    }

    wireImages(grid);
    $('#blogCount').textContent = fa(list.length) + ' مقاله';
    $$('#blogCats .chip').forEach(c => c.classList.toggle('is-on', c.dataset.cat === state.cat));
  }

  function init() {
    $('#blogCats').innerHTML = CATEGORIES.map(c =>
      `<button class="chip${c.id === state.cat ? ' is-on' : ''}" type="button" data-cat="${c.id}">${esc(c.label)}</button>`).join('');
    $$('#blogCats .chip').forEach(c => c.addEventListener('click', () => { state.cat = c.dataset.cat; render(); }));

    const q = $('#blogQ');
    let t;
    q.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = q.value; render(); }, 180);
    });

    $('#newsForm').addEventListener('submit', e => {
      e.preventDefault();
      const mail = $('#newsMail');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value)) { toast('نشانی ایمیل معتبر وارد کنید'); return; }
      mail.value = '';
      toast('عضویت شما ثبت شد');
    });

    render();
  }

  return { init };
})();
