/* =========================================================================
   Azarakhsh · لایهٔ حرکت
   Lenis برای اسکرول نرم، GSAP + ScrollTrigger برای ورود اجزا و پارالاکس،
   Swiper برای اسلایدر نظرها. همه‌چیز با prefers-reduced-motion خاموش می‌شود.
   ========================================================================= */
(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  gsap.registerPlugin(ScrollTrigger);

  /* --------------------------- اسکرول نرم --------------------------- */
  let lenis = null;

  if (!REDUCED) {
    lenis = new Lenis({
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.6
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* هنگام باز بودن مودال یا کشوی سبد، اسکرول صفحه متوقف می‌شود */
  ['show.bs.modal', 'show.bs.offcanvas'].forEach(ev =>
    document.addEventListener(ev, () => lenis && lenis.stop()));
  ['hidden.bs.modal', 'hidden.bs.offcanvas'].forEach(ev =>
    document.addEventListener(ev, () => lenis && lenis.start()));

  const headerH = () => ($('#siteHeader') ? $('#siteHeader').offsetHeight : 90);

  function goTo(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - headerH() + 2;
    if (lenis) lenis.scrollTo(y, { duration: 1.25 });
    else window.scrollTo({ top: y, behavior: 'auto' });
  }

  document.addEventListener('click', e => {
    const link = e.target.closest('[data-nav]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '#' || href === '#') return;
    e.preventDefault();
    goTo(href);
  });

  /* --------------------------- هدر و پیشرفت -------------------------- */
  const header = $('#siteHeader');
  const bar = $('#progressLine');

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-stuck', y > 40);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    gsap.set(bar, { scaleX: max > 0 ? Math.min(1, y / max) : 0 });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------- ورود اجزا ---------------------------- */
  function reveal(scope) {
    const items = $$('[data-reveal]', scope || document)
      .filter(el => !el.dataset.revealed && !el.closest('.hero'));
    items.forEach(el => {
      el.dataset.revealed = '1';
      if (REDUCED) return;
      gsap.fromTo(el,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
    });
  }

  /* ------------------------------ هیرو ------------------------------- */
  function splitWords(el) {
    if (!el) return [];
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = part;
            frag.appendChild(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          child.classList.add('word');
        }
      });
    };
    walk(el);
    return $$('.word', el);
  }

  function heroIntro() {
    const words = splitWords($('#heroTitle'));
    if (REDUCED) {
      gsap.set(['#heroTitle .word', '.hero [data-reveal]', '.hero .hero__stat'], { opacity: 1, y: 0 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: .15 });

    tl.from('.hero .eyebrow', { y: 18, opacity: 0, duration: .8 })
      .from(words, { y: 34, opacity: 0, duration: .95, stagger: .045 }, '-=.5')
      .from('.hero .hero__lede', { y: 22, opacity: 0, duration: .9 }, '-=.65')
      .from('.hero .cta-row > *', { y: 20, opacity: 0, duration: .8, stagger: .1 }, '-=.6')
      .from('.hero .hero__assure li', { y: 14, opacity: 0, duration: .7, stagger: .07 }, '-=.55')
      .from('.hero .hero__card-wrap', { y: 46, opacity: 0, scale: .96, duration: 1.15 }, '-=1.05')
      .from('.hero .hero__tag', { scale: .5, opacity: 0, duration: .7, ease: 'back.out(2)' }, '-=.5')
      .from('.hero .hero__stat', { y: 26, opacity: 0, duration: .8, stagger: .08 }, '-=.7');

    /* پارالاکس پس‌زمینه */
    gsap.to('#heroBg', {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    gsap.to('.hero__in', {
      opacity: .25,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'center top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------------------------- شمارنده‌ها --------------------------- */
  function counters() {
    $$('[data-count]').forEach(el => {
      const end = Number(el.dataset.count);
      const pre = el.dataset.prefix || '';
      const suf = el.dataset.suffix || '';
      const set = v => { el.textContent = pre + AZ.faNum(v) + suf; };

      if (REDUCED) { set(end); return; }

      const obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => gsap.to(obj, {
          v: end,
          duration: 1.8,
          ease: 'power2.out',
          onUpdate: () => set(obj.v)
        })
      });
    });
  }

  /* ------------------------------ تیکر ------------------------------- */
  function ticker() {
    const track = $('#ticker');
    if (!track || REDUCED) return;
    gsap.to(track, { xPercent: 50, duration: 34, ease: 'none', repeat: -1 });
  }

  /* --------------------------- کارت‌ها ------------------------------- */
  function animateCards() {
    const cards = $$('#pgrid .pcard');
    if (!cards.length) return;
    if (REDUCED) { gsap.set(cards, { opacity: 1, y: 0 }); ScrollTrigger.refresh(); return; }

    gsap.fromTo(cards,
      { y: 34, opacity: 0, scale: .985 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: .85,
        ease: 'power3.out',
        stagger: { each: .07, from: 'start' },
        clearProps: 'transform',
        onComplete: () => ScrollTrigger.refresh()
      });
  }
  document.addEventListener('az:grid', animateCards);

  /* ---------------------------- پروژه‌ها ----------------------------- */
  function gallery() {
    if (REDUCED) return;
    const items = $$('.gal__item');
    if (!items.length) return;
    gsap.fromTo(items,
      { opacity: 0, y: 26, clipPath: 'inset(12% 12% 12% 12% round 24px)' },
      {
        opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 24px)',
        duration: 1.05, ease: 'power3.out', stagger: .08,
        scrollTrigger: { trigger: '#gallery', start: 'top 82%', once: true }
      });
  }

  /* ----------------------------- مراحل ------------------------------- */
  function steps() {
    if (REDUCED) return;
    const rows = $$('.step');
    if (!rows.length) return;
    gsap.from(rows, {
      opacity: 0, y: 24, duration: .85, ease: 'power3.out', stagger: .12,
      scrollTrigger: { trigger: '.steps', start: 'top 82%', once: true }
    });
  }

  /* ----------------------- نشانگر بخش فعال در منو -------------------- */
  function navSpy() {
    const links = $$('.nav-links a[href^="#"]');
    links.forEach(link => {
      const sec = $(link.getAttribute('href'));
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 45%',
        end: 'bottom 45%',
        onToggle: self => link.classList.toggle('is-active', self.isActive)
      });
    });
  }

  /* --------------------------- اسلایدر نظرها ------------------------- */
  function quotes() {
    if (!$('#quotesWrap') || !$('#quotesWrap').children.length) return;
    new Swiper('#quotes', {
      slidesPerView: 1.06,
      spaceBetween: 16,
      grabCursor: true,
      speed: 700,
      autoplay: REDUCED ? false : { delay: 5200, disableOnInteraction: false },
      pagination: { el: '#quotes .swiper-pagination', clickable: true },
      breakpoints: {
        640:  { slidesPerView: 1.6, spaceBetween: 18 },
        900:  { slidesPerView: 2.2, spaceBetween: 20 },
        1200: { slidesPerView: 3,   spaceBetween: 22 }
      }
    });
  }

  /* ------------------------------ شروع ------------------------------- */
  function start() {
    heroIntro();
    reveal();
    counters();
    ticker();
    gallery();
    steps();
    navSpy();
    quotes();
    animateCards();

    /* پس از بارگذاری کامل تصاویر، موقعیت تریگرها تازه‌سازی می‌شود */
    window.addEventListener('load', () => ScrollTrigger.refresh());
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => ScrollTrigger.refresh(), 220);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
