/* ===================== تک مقاله =====================
   متن و فهرست مطالب در بدنهٔ HTML هستند؛ اینجا فقط نشانگر پیشرفت
   خواندن، سرتیتر فعال و دکمه‌های هم‌رسانی سیم‌کشی می‌شوند. */
window.AZArticle = (function () {
  'use strict';
  const { $, $$, wireImages, toast } = AZ;

  function init() {
    wireImages(document.querySelector('.art-hero'));
    wireImages($('#artBody'));

    const body = $('#artBody');
    const bar = $('#readBar');
    const heads = $$('#artBody h2');
    const links = $$('#artToc a');

    links.forEach(link => link.addEventListener('click', e => {
      e.preventDefault();
      AZUI.goTo(link.getAttribute('href'));
    }));

    const onScroll = () => {
      const r = body.getBoundingClientRect();
      const total = r.height - window.innerHeight * .4;
      const done = Math.min(1, Math.max(0, (window.innerHeight * .4 - r.top) / Math.max(1, total)));
      bar.style.transform = `scaleX(${done})`;

      let current = heads[0];
      heads.forEach(h => { if (h.getBoundingClientRect().top <= window.innerHeight * .3) current = h; });
      links.forEach(l => l.classList.toggle('is-on', current && l.getAttribute('href') === '#' + current.id));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const url = location.href;
    const title = document.title.split('|')[0].trim();
    $('#artTg').href = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title);
    $('#artWa').href = 'https://wa.me/?text=' + encodeURIComponent(title + ' ' + url);
    $('#artCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); toast('نشانی مقاله کپی شد'); }
      catch (e) { toast('کپی نشد؛ نشانی را از نوار مرورگر بردارید'); }
    });

    wireImages($('.grid-3'));
  }

  return { init };
})();
