/* ===================== تک مقاله ===================== */
window.AZArticle = (function () {
  'use strict';
  const { $, $$, fa, wireImages, esc, toast } = AZ;

  const render = {
    p:     b => `<p>${esc(b.v)}</p>`,
    h2:    b => `<h2 id="${slugify(b.v)}">${esc(b.v)}</h2>`,
    h3:    b => `<h3>${esc(b.v)}</h3>`,
    ul:    b => `<ul>${b.v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`,
    quote: b => `<blockquote>${esc(b.v)}</blockquote>`,
    fig:   b => `<figure><img src="${b.v}" alt="${esc(b.cap || '')}" loading="lazy" data-slot>
                 <figcaption>${esc(b.cap || '')}</figcaption></figure>`
  };

  function slugify(s) {
    return 'h-' + String(s).trim().replace(/\s+/g, '-').replace(/[^؀-ۿ\w-]/g, '');
  }

  function init() {
    const slug = new URLSearchParams(location.search).get('slug');
    const a = ARTICLES.find(x => x.slug === slug) || ARTICLES[0];

    document.title = a.title + ' | دفترچهٔ نما';
    $('#artCrumb').textContent = a.title;
    $('#artCat').textContent = a.catLabel;
    $('#artTitle').textContent = a.title;
    const cover = $('#artCover');
    cover.src = a.cover; cover.alt = a.title;
    wireImages($('.art-hero'));

    $('#artMeta').innerHTML = [
      ['i-user', a.author], ['i-clock', a.date], ['i-doc', fa(a.mins) + ' دقیقه خواندن']
    ].map(([ic, tx]) => `<span><svg width="15" height="15"><use href="#${ic}"/></svg>${esc(tx)}</span>`).join('');

    $('#artLead').textContent = a.excerpt;
    $('#artBody').innerHTML = a.body.map(b => (render[b.t] || render.p)(b)).join('');
    wireImages($('#artBody'));

    /* فهرست مطالب از سرتیترها */
    const heads = $$('#artBody h2');
    $('#artToc').innerHTML = heads.length
      ? heads.map(h => `<a href="#${h.id}">${esc(h.textContent)}</a>`).join('')
      : '<span class="small">این مقاله سرفصل ندارد.</span>';

    $$('#artToc a').forEach(link => link.addEventListener('click', e => {
      e.preventDefault();
      AZUI.goTo('#' + link.getAttribute('href').slice(1));
    }));

    /* نشانگر پیشرفت خواندن و سرتیتر فعال */
    const body = $('#artBody');
    const bar = $('#readBar');
    const onScroll = () => {
      const r = body.getBoundingClientRect();
      const total = r.height - window.innerHeight * .4;
      const done = Math.min(1, Math.max(0, (window.innerHeight * .4 - r.top) / Math.max(1, total)));
      bar.style.transform = `scaleX(${done})`;

      let current = heads[0];
      heads.forEach(h => { if (h.getBoundingClientRect().top <= window.innerHeight * .3) current = h; });
      $$('#artToc a').forEach(l => l.classList.toggle('is-on', current && l.getAttribute('href') === '#' + current.id));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* نویسنده و هم‌رسانی */
    $('#artAuthor').innerHTML = `
      <span class="art-author__av">${esc(a.author.trim().charAt(0))}</span>
      <div><b>${esc(a.author)}</b><span>${esc(a.role)}</span></div>`;

    const url = location.href;
    $('#artTg').href = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(a.title);
    $('#artWa').href = 'https://wa.me/?text=' + encodeURIComponent(a.title + ' ' + url);
    $('#artCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); toast('نشانی مقاله کپی شد'); }
      catch (e) { toast('کپی نشد؛ نشانی را از نوار مرورگر بردارید'); }
    });

    /* مرتبط‌ها */
    const rel = ARTICLES.filter(x => x.slug !== a.slug && x.cat === a.cat)
      .concat(ARTICLES.filter(x => x.slug !== a.slug && x.cat !== a.cat)).slice(0, 3);
    $('#artRelated').innerHTML = rel.map(x => `
      <article class="tile post">
        <a class="tile__link" href="article.html?slug=${encodeURIComponent(x.slug)}" aria-label="${esc(x.title)}"></a>
        <div class="tile__media"><span class="tile__tag">${esc(x.catLabel)}</span>
          <img src="${x.cover}" alt="${esc(x.title)}" loading="lazy" data-slot></div>
        <div class="tile__body">
          <div class="tile__kicker"><b>${esc(x.date)}</b><span>·</span><span>${fa(x.mins)} دقیقه</span></div>
          <h3>${esc(x.title)}</h3>
          <p>${esc(x.excerpt)}</p>
        </div>
      </article>`).join('');
    wireImages($('#artRelated'));
  }

  return { init };
})();
