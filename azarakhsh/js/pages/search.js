/* =========================================================================
   جست‌وجو
   همهٔ ردیف‌ها (محصول، پروژه، مقاله) در بدنهٔ صفحه هستند؛
   اینجا فقط فیلتر می‌شوند و عبارت جست‌وجو هایلایت می‌گیرد.
   ========================================================================= */
window.AZSearch = (function () {
  'use strict';
  const { $, $$, fa, wireImages, esc } = AZ;

  const HINTS = ['نمای سفید', 'آجر مشکی', 'پلاک نازک', 'شوره', 'بند نازک', 'اصفهان', 'مرمت'];
  const GROUPS = [{ id: 'product', label: 'محصولات' }, { id: 'project', label: 'پروژه‌ها' }, { id: 'article', label: 'مقاله‌ها' }];
  let tab = 'all', q = '';
  let rows = [];

  const hit = el => q.trim() && (el.dataset.search || '').includes(q.trim().toLowerCase());

  function highlight(el) {
    const b = el.querySelector('[data-title]');
    if (!b) return;
    const text = b.dataset.plain || b.textContent;
    b.dataset.plain = text;
    const needle = q.trim();
    if (!needle) { b.textContent = text; return; }
    const i = text.toLowerCase().indexOf(needle.toLowerCase());
    b.innerHTML = i < 0 ? esc(text)
      : esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + needle.length)) + '</mark>' + esc(text.slice(i + needle.length));
  }

  function apply() {
    const found = rows.filter(hit);

    $('#srchTabs').innerHTML = [{ id: 'all', label: 'همه' }].concat(GROUPS).map(g => {
      const n = g.id === 'all' ? found.length : found.filter(r => r.dataset.kind === g.id).length;
      return `<button class="srch-tab${g.id === tab ? ' is-on' : ''}" type="button" data-tab="${g.id}">${esc(g.label)}<i>${fa(n)}</i></button>`;
    }).join('');
    $$('.srch-tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; apply(); }));

    const idle = !q.trim();
    $('#srchIdle').hidden = !idle;
    $('#srchNone').hidden = idle || found.length > 0;

    rows.forEach(el => {
      const ok = found.includes(el) && (tab === 'all' || el.dataset.kind === tab);
      el.hidden = !ok;
      if (ok) highlight(el);
    });

    $$('.srch-group').forEach(sec => {
      const kind = sec.dataset.group;
      const n = found.filter(r => r.dataset.kind === kind).length;
      const visible = !idle && n > 0 && (tab === 'all' || tab === kind);
      sec.hidden = !visible;
      const c = sec.querySelector('[data-count]');
      if (c) c.textContent = fa(n) + ' نتیجه';
    });

    sync();
  }

  function sync() {
    history.replaceState(null, '', q.trim() ? '?q=' + encodeURIComponent(q.trim()) : location.pathname);
  }

  function init() {
    rows = $$('#srchResults .srch-row');
    wireImages($('#srchResults'));
    $$('#srchNone [data-open-advisor]').forEach(b =>
      b.addEventListener('click', () => Advisor.open(q, b)));

    q = new URLSearchParams(location.search).get('q') || '';
    const input = $('#srchQ');
    input.value = q;

    $('#srchHints').innerHTML = HINTS.map(h =>
      `<button class="chip" type="button" data-hint="${esc(h)}">${esc(h)}</button>`).join('');
    $$('#srchHints .chip').forEach(c => c.addEventListener('click', () => {
      q = c.dataset.hint; input.value = q; apply();
    }));

    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { q = input.value; apply(); }, 160);
    });
    $('#srchForm').addEventListener('submit', e => { e.preventDefault(); q = input.value; apply(); });

    if (!AZ.isPhone()) input.focus();
    apply();
  }

  return { init };
})();
