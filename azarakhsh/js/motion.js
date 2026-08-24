/* =========================================================================
   آذرخش · لایهٔ حرکت
   پردهٔ ورود، اسکرول نرم، نشانگر سفارشی، ریل افقی پین‌شده و روایت اسکرول.
   ========================================================================= */
window.AZMotion = (function () {
  'use strict';

  const { $, $$, fa, pad2 } = AZ;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DESKTOP = () => window.matchMedia('(min-width: 1000px)').matches;

  gsap.registerPlugin(ScrollTrigger);

  let lenis = null;

  /* ---------------------------- اسکرول نرم -------------------------- */
  function initScroll() {
    if (REDUCED) return;
    lenis = new Lenis({
      duration: 1.1,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.7
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);

    /* هنگام باز بودن شیت، صفحه پشت آن قفل می‌شود */
    document.addEventListener('sl-show', () => lenis && lenis.stop());
    document.addEventListener('sl-after-hide', () => lenis && lenis.start());
    document.addEventListener('az:lock', () => lenis && lenis.stop());
    document.addEventListener('az:unlock', () => lenis && lenis.start());
  }

  const barH = () => ($('#bar') ? $('#bar').offsetHeight + 22 : 90);

  function goTo(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - barH();
    if (lenis) lenis.scrollTo(y, { duration: 1.25 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* ---------------------------- پردهٔ ورود --------------------------
     نخستین قاب: تالار گالری. تصویر آرام زوم می‌شود و همان قاب،
     پس‌زمینهٔ هیرو است؛ پرده که می‌رود، دوربین در همان اتاق می‌ماند.
     ------------------------------------------------------------------ */
  const ZOOM_END = 1.12;   /* هیرو دقیقاً از همین مقیاس شروع می‌کند */

  function veil() {
    const el = $('#veil');
    if (!el) return Promise.resolve();

    const finish = () => {
      el.classList.add('is-gone');
      el.style.display = 'none';
      document.body.classList.remove('is-frozen');
      ScrollTrigger.refresh();
    };

    if (REDUCED) {
      finish();
      gsap.set('#heroBg', { scale: 1 });
      return Promise.resolve();
    }

    document.body.classList.add('is-frozen');
    gsap.set('#heroBg', { scale: ZOOM_END });

    return new Promise(resolve => {
      let done = false;
      const settle = () => {
        if (done) return;
        done = true;
        finish();
        resolve();
      };

      const tl = gsap.timeline({ onComplete: settle });

      tl.fromTo('#veilShot',
          { scale: 1, transformOrigin: '50% 48%' },
          { scale: ZOOM_END, duration: 4.6, ease: 'power1.inOut' }, 0)
        .to('#veil .veil__mark', { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }, .35)
        .from('.veil__word', { y: 18, opacity: 0, duration: .9, ease: 'power3.out' }, .5)
        .from('.veil__line', { y: 12, opacity: 0, duration: .8, ease: 'power3.out' }, .7)
        .to('.veil__rule', { width: 'min(180px, 40vw)', duration: 1.1, ease: 'power2.inOut' }, .85)
        .to('.veil__skip', { opacity: 1, duration: .6 }, 1.6)
        .to('.veil__in, .veil__skip', { opacity: 0, y: -10, duration: .5, ease: 'power2.in' }, 2.5)
        .to('#veil', { opacity: 0, duration: .9, ease: 'power2.inOut' }, 2.7)
        .set('#veil', { pointerEvents: 'none' }, 2.7);

      /* رد شدن از اینترو */
      const skip = () => {
        if (done) return;
        tl.kill();
        gsap.to('#veil', {
          opacity: 0, duration: .5, ease: 'power2.inOut',
          onComplete: settle
        });
      };
      el.addEventListener('click', skip, { once: true });
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
      }, { once: true });
      window.addEventListener('wheel', skip, { once: true, passive: true });
      window.addEventListener('touchstart', skip, { once: true, passive: true });
    });
  }

  /* ------------------------------- تم ------------------------------- */
  const THEME_KEY = 'azarakhsh-theme';

  function applyTheme(mode, animate) {
    const root = document.documentElement;
    if (animate) {
      root.classList.add('theme-shift');
      clearTimeout(applyTheme._t);
      applyTheme._t = setTimeout(() => root.classList.remove('theme-shift'), 620);
    }
    root.dataset.theme = mode;
    root.classList.toggle('sl-theme-dark', mode === 'dark');
    root.classList.toggle('sl-theme-light', mode !== 'dark');
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* حالت ناشناس */ }
    document.dispatchEvent(new CustomEvent('az:theme', { detail: mode }));
  }

  function theme() {
    const btn = $('#themeBtn');
    const flip = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
      if (!REDUCED && btn) gsap.fromTo(btn, { scale: .86 }, { scale: 1, duration: .55, ease: 'back.out(2.4)' });
    };
    if (btn) btn.addEventListener('click', flip);
    $$('[data-theme-toggle]').forEach(b => b.addEventListener('click', flip));
  }

  /* ------------------------------ هیرو ----------------------------- */
  function splitWords(el) {
    if (!el) return [];
    Array.from(el.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
          const s = document.createElement('span');
          s.className = 'w';
          s.textContent = part;
          frag.appendChild(s);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === 1) {
        if (!node.querySelector('.w')) splitWords(node);
      }
    });
    return $$('.w', el);
  }

  function heroIn() {
    const words = splitWords($('#heroTitle'));
    if (REDUCED) {
      gsap.set(['#heroTitle .w', '.hero [data-in]'], { opacity: 1, y: 0 });
      return;
    }
    gsap.to('#heroBg', { scale: 1, duration: 2.6, ease: 'power2.out' });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero .label', { y: 16, opacity: 0, duration: .7 })
      .from(words, { y: 40, opacity: 0, duration: 1, stagger: .04 }, '-=.4')
      .from('.hero__lede', { y: 20, opacity: 0, duration: .8 }, '-=.7')
      .from('.hero__cta > *', { y: 18, opacity: 0, duration: .7, stagger: .09 }, '-=.55')
      .from('.hero__notes li', { y: 12, opacity: 0, duration: .6, stagger: .06 }, '-=.5')
      .from('#heroStage', { y: 56, opacity: 0, scale: .95, duration: 1.2, ease: 'expo.out' }, '-=1.15')
      .from('.stage__chip', { scale: .4, opacity: 0, duration: .6, ease: 'back.out(2.4)' }, '-=.45')
      .from('.creds > *', { y: 22, opacity: 0, duration: .7, stagger: .07 }, '-=.65');

    gsap.to('#heroBg', {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__in', {
      opacity: .2, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: '55% top', end: 'bottom top', scrub: true }
    });
  }

  /* کج‌شدن سه‌بعدی صحنهٔ محصول با حرکت نشانگر */
  function stageTilt() {
    const stage = $('#heroStage');
    const cardEl = $('.stage__card', stage || document);
    if (!stage || !cardEl || REDUCED || !DESKTOP()) return;
    const rx = gsap.quickTo(cardEl, 'rotationX', { duration: .8, ease: 'power3' });
    const ry = gsap.quickTo(cardEl, 'rotationY', { duration: .8, ease: 'power3' });
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      rx(((e.clientY - r.top) / r.height - .5) * -7);
      ry(((e.clientX - r.left) / r.width - .5) * 9);
    });
    stage.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  /* ----------------------------- نشانگر ---------------------------- */
  function cursor() {
    if (REDUCED || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const ring = $('#cursor'), dot = $('#cursorDot'), label = $('#cursorLabel');
    if (!ring) return;
    document.body.classList.add('has-cursor');

    const rx = gsap.quickTo(ring, 'x', { duration: .5, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: .5, ease: 'power3' });
    const dx = gsap.quickTo(dot, 'x', { duration: .12, ease: 'power2' });
    const dy = gsap.quickTo(dot, 'y', { duration: .12, ease: 'power2' });

    window.addEventListener('pointermove', e => {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
      const hot = e.target.closest('a, button, [data-cursor], .gal__i, .pc');
      if (hot) {
        ring.classList.add('is-hot');
        label.textContent = hot.dataset.cursor || '';
      } else {
        ring.classList.remove('is-hot');
        label.textContent = '';
      }
    }, { passive: true });

    document.addEventListener('pointerdown', () => gsap.to(ring, { scale: .82, duration: .16 }));
    document.addEventListener('pointerup',   () => gsap.to(ring, { scale: 1, duration: .3 }));

    /* دکمه‌های مغناطیسی */
    $$('.btn, .btn-ghost').forEach(btn => {
      const mx = gsap.quickTo(btn, 'x', { duration: .5, ease: 'power3' });
      const my = gsap.quickTo(btn, 'y', { duration: .5, ease: 'power3' });
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .22);
        my((e.clientY - r.top - r.height / 2) * .3);
      });
      btn.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  /* --------------------------- نوار و داک -------------------------- */
  function chrome() {
    const bar = $('#bar'), line = $('#railProgress');
    const onScroll = () => {
      const y = window.scrollY;
      bar.classList.toggle('is-lifted', y > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      gsap.set(line, { scaleX: max > 0 ? Math.min(1, y / max) : 0 });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* بخش فعال: آخرین بخشی که از خط ۴۵٪ صفحه رد شده است */
    const links = $$('[data-spy]');
    const marks = [...new Set(links.map(l => l.getAttribute('href')))]
      .map(href => ({ href, el: $(href) }))
      .filter(m => m.el)
      .sort((a, b) => a.el.getBoundingClientRect().top - b.el.getBoundingClientRect().top);

    function spy() {
      const line = window.innerHeight * 0.45;
      let current = marks[0] ? marks[0].href : null;
      marks.forEach(m => {
        if (m.el.getBoundingClientRect().top <= line) current = m.href;
      });
      links.forEach(l => l.classList.toggle('is-on', l.getAttribute('href') === current));
    }
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  /* ------------------------------ ورودها --------------------------- */
  function reveals() {
    $$('[data-in]').forEach(el => {
      if (el.closest('.hero')) return;
      if (REDUCED) { gsap.set(el, { opacity: 1, y: 0 }); return; }
      gsap.from(el, {
        y: 34, opacity: 0, duration: 1.05, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    $$('[data-count]').forEach(el => {
      const end = Number(el.dataset.count);
      const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      const put = v => { el.textContent = pre + AZ.faNum(v) + suf; };
      if (REDUCED) { put(end); return; }
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 1.9, ease: 'power2.out', onUpdate: () => put(o.v) })
      });
    });
  }

  /* ------------------------------ بیانیه --------------------------- */
  function manifesto() {
    const el = $('#manifesto');
    if (!el) return;
    const words = splitWords(el);
    if (!words.length) return;
    if (REDUCED) { words.forEach(w => w.classList.add('is-lit')); return; }
    ScrollTrigger.create({
      trigger: el,
      start: 'top 78%',
      end: 'bottom 55%',
      scrub: true,
      onUpdate: self => {
        const n = Math.round(self.progress * words.length);
        words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
      }
    });
  }

  /* ------------------------------ مراحل ---------------------------- */
  function steps() {
    const box = $('#steps');
    if (!box) return;
    const fill = $('.steps__spine i', box);
    const rows = $$('.step', box);
    if (REDUCED) { gsap.set(fill, { scaleY: 1 }); rows.forEach(r => r.classList.add('is-on')); return; }
    ScrollTrigger.create({
      trigger: box,
      start: 'top 72%',
      end: 'bottom 72%',
      scrub: .6,
      onUpdate: self => {
        gsap.set(fill, { scaleY: self.progress });
        const n = Math.ceil(self.progress * rows.length);
        rows.forEach((r, i) => r.classList.toggle('is-on', i < n));
      }
    });
  }

  /* ------------------------------ تیکر ----------------------------- */
  function ticker() {
    const track = $('#ticker');
    if (!track || REDUCED) return;
    gsap.to(track, { xPercent: 50, duration: 38, ease: 'none', repeat: -1 });
  }

  /* ------------------------- ریل افقی کلکسیون ---------------------- */
  /* در RTL علامت scrollLeft بین موتورها فرق دارد؛ یک بار اندازه می‌گیریم */
  function scrollSign(el) {
    const keep = el.scrollLeft;
    el.scrollLeft = -12;
    const sign = el.scrollLeft < 0 ? -1 : 1;
    el.scrollLeft = keep;
    return sign;
  }

  function rail() {
    const view = $('#railView');
    const bar = $('#railBar');
    const now = $('#railNow');
    const prev = $('#railPrev');
    const next = $('#railNext');
    if (!view) return;

    const track = view.querySelector('.rail__track');
    const items = track.children.length;
    const sign = scrollSign(view);
    const maxScroll = () => Math.max(0, view.scrollWidth - view.clientWidth);

    function setHud() {
      const max = maxScroll();
      const prog = max > 0 ? Math.min(1, Math.abs(view.scrollLeft) / max) : 0;
      gsap.set(bar, { scaleX: prog });
      now.textContent = pad2(Math.min(items, Math.round(prog * (items - 1)) + 1));
      if (prev) prev.disabled = Math.abs(view.scrollLeft) < 4;
      if (next) next.disabled = Math.abs(view.scrollLeft) > max - 4;
    }

    view.onscroll = setHud;
    setHud();

    /* گام حرکت = عرض یک کارت */
    const step = () => {
      const card = track.children[0];
      return card ? card.getBoundingClientRect().width + 18 : 340;
    };
    const nudge = dir => view.scrollBy({ left: sign * dir * step(), behavior: REDUCED ? 'auto' : 'smooth' });

    if (prev && !prev.dataset.wired) { prev.dataset.wired = '1'; prev.addEventListener('click', () => nudge(-1)); }
    if (next && !next.dataset.wired) { next.dataset.wired = '1'; next.addEventListener('click', () => nudge(1)); }

    /* کشیدن با ماوس روی دسکتاپ */
    if (!view.dataset.drag && !REDUCED) {
      view.dataset.drag = '1';
      let down = false, startX = 0, startL = 0, moved = 0;
      view.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse') return;
        down = true; moved = 0;
        startX = e.clientX; startL = view.scrollLeft;
        view.style.cursor = 'grabbing';
      });
      view.addEventListener('pointermove', e => {
        if (!down) return;
        const d = e.clientX - startX;
        moved = Math.abs(d);
        if (moved > 4) view.scrollLeft = startL + d;
      });
      const up = () => { down = false; view.style.cursor = ''; };
      view.addEventListener('pointerup', up);
      view.addEventListener('pointerleave', up);
      /* اگر کاربر کشیده، کلیک روی کارت نباید فعال شود */
      view.addEventListener('click', e => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); moved = 0; } }, true);
    }

    ScrollTrigger.refresh();
  }

  /* ------------------------------ راه‌اندازی ------------------------ */
  async function start() {
    theme();
    initScroll();
    cursor();
    chrome();
    reveals();
    manifesto();
    steps();
    ticker();
    stageTilt();
    rail();

    document.addEventListener('az:rail', () => setTimeout(rail, 60));

    await veil();
    heroIn();

    window.addEventListener('load', () => ScrollTrigger.refresh());
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => { rail(); ScrollTrigger.refresh(); }, 240);
    });
  }

  return { start, goTo, rail, applyTheme };
})();
