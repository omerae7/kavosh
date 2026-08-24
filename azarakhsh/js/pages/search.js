/* =========================================================================
   جست‌وجو — در محصولات، پروژه‌ها و مقاله‌ها
   ========================================================================= */
window.AZSearch = (function () {
  'use strict';
  const { $, $$, fa, faNum, wireImages, esc, toneImages } = AZ;
  let tab = 'all', q = '';

  const HINTS = ['نمای سفید', 'آجر مشکی', 'پلاک نازک', 'شوره', 'بند نازک', 'اصفهان', 'مرمت'];

  /* یک نمایهٔ ساده از هر سه نوع محتوا */
  function index() {
    const rows = [];
    PRODUCTS.forEach(p => rows.push({
      kind: 'product', title: p.name,
      text: [p.desc, p.code, p.familyLabel, (p.keys || []).join(' ')].join(' '),
      meta: p.code + ' · ' + faNum(p.price) + ' تومان',
      img: toneImages(p, p.tones[0].name).wall,
      href: 'product.html?id=' + p.id
    }));
    (typeof PROJECTS_FULL !== 'undefined' ? PROJECTS_FULL : []).forEach(pr => rows.push({
      kind: 'project', title: pr.title,
      text: [pr.brief, pr.city, pr.type, pr.architect, pr.client].join(' '),
      meta: pr.city + ' · ' + pr.area + ' · ' + pr.year,
      img: pr.cover,
      href: 'project.html?id=' + pr.id
    }));
    (typeof ARTICLES !== 'undefined' ? ARTICLES : []).forEach(a => rows.push({
      kind: 'article', title: a.title,
      text: [a.excerpt, a.catLabel, a.author, (a.tags || []).join(' ')].join(' '),
      meta: a.catLabel + ' · ' + a.date,
      img: a.cover,
      href: 'article.html?slug=' + a.slug
    }));
    return rows;
  }

  const DATA = [];
  const GROUPS = [
    { id: 'product', label: 'محصولات' },
    { id: 'project', label: 'پروژه‌ها' },
    { id: 'article', label: 'مقاله‌ها' }
  ];

  const hit = r => {
    const needle = q.trim().toLowerCase();
    if (!needle) return false;
    return (r.title + ' ' + r.text).toLowerCase().includes(needle);
  };

  const mark = (s, needle) => {
    if (!needle) return esc(s);
    const i = s.toLowerCase().indexOf(needle.toLowerCase());
    if (i < 0) return esc(s);
    return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + needle.length)) + '</mark>' + esc(s.slice(i + needle.length));
  };

  function row(r) {
    return `
      <div class="srch-row">
        <a class="stretch" href="${r.href}" aria-label="${esc(r.title)}"></a>
        <span class="srch-row__img"><img src="${r.img}" alt="" loading="lazy" data-slot></span>
        <div>
          <b>${mark(r.title, q.trim())}</b>
          <p>${esc(r.text.slice(0, 120))}</p>
          <div class="srch-row__meta">${esc(r.meta)}</div>
        </div>
      </div>`;
  }

  function render() {
    const found = DATA.filter(hit);
    const box = $('#srchResults');

    $('#srchTabs').innerHTML = [{ id: 'all', label: 'همه' }].concat(GROUPS).map(g => {
      const n = g.id === 'all' ? found.length : found.filter(r => r.kind === g.id).length;
      return `<button class="srch-tab${g.id === tab ? ' is-on' : ''}" type="button" data-tab="${g.id}">${esc(g.label)}<i>${fa(n)}</i></button>`;
    }).join('');
    $$('.srch-tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));

    if (!q.trim()) {
      box.innerHTML = `<div class="empty">
          <svg width="34" height="34"><use href="#i-search"/></svg>
          <h3>چیزی بنویسید تا بگردیم</h3>
          <p>می‌توانید نام محصول، کد، نام شهر یا موضوع مقاله را جست‌وجو کنید.</p>
        </div>`;
      return;
    }

    if (!found.length) {
      box.innerHTML = `<div class="empty">
          <svg width="34" height="34"><use href="#i-search"/></svg>
          <h3>برای «${esc(q)}» چیزی پیدا نشد</h3>
          <p>املای عبارت را بررسی کنید یا از مشاور نما بپرسید.</p>
          <button class="btn-ghost btn-sm" type="button" style="margin-top:1.2rem" data-open-advisor>
            <svg width="15" height="15"><use href="#i-spark"/></svg> پرسش از مشاور
          </button>
        </div>`;
      $$('[data-open-advisor]', box).forEach(b => b.addEventListener('click', () => Advisor.open(q, b)));
      return;
    }

    const groups = tab === 'all' ? GROUPS : GROUPS.filter(g => g.id === tab);
    box.innerHTML = groups.map(g => {
      const rows = found.filter(r => r.kind === g.id);
      if (!rows.length) return '';
      return `<section class="srch-group">
                <h2>${esc(g.label)} <i>${fa(rows.length)} نتیجه</i></h2>
                ${rows.map(row).join('')}
              </section>`;
    }).join('') || '<div class="empty"><h3>در این دسته نتیجه‌ای نیست</h3></div>';
    wireImages(box);
  }

  function init() {
    DATA.push(...index());
    q = new URLSearchParams(location.search).get('q') || '';
    const input = $('#srchQ');
    input.value = q;

    $('#srchHints').innerHTML = HINTS.map(h =>
      `<button class="chip" type="button" data-hint="${esc(h)}">${esc(h)}</button>`).join('');
    $$('#srchHints .chip').forEach(c => c.addEventListener('click', () => {
      q = c.dataset.hint; input.value = q; sync(); render();
    }));

    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { q = input.value; sync(); render(); }, 160);
    });
    $('#srchForm').addEventListener('submit', e => { e.preventDefault(); q = input.value; sync(); render(); });

    if (!AZ.isPhone()) input.focus();
    render();
  }

  function sync() {
    const u = q.trim() ? '?q=' + encodeURIComponent(q.trim()) : location.pathname;
    history.replaceState(null, '', u);
  }

  return { init };
})();
