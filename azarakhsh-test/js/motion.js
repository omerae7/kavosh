/* =========================================================================
   آذرخش · لایهٔ حرکت
   یک ایدهٔ واحد پشت همهٔ حرکت‌های سایت: «قلمِ دستگاهِ ثبت». اول خط کشیده
   می‌شود، بعد محتوا روی خط می‌نشیند. تنها لحظهٔ نمایشیِ سایت، روشن‌شدنِ
   چراغِ اتاقکِ نور است — و آن هم فقط یک بار اتفاق می‌افتد.
   ========================================================================= */
window.AZMotion = (function () {
  'use strict';

  const { $, $$, fa } = AZ;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  gsap.registerPlugin(ScrollTrigger);
  let lenis = null;

  /* ----------------------------- اسکرول نرم -------------------------- */
  function initScroll() {
    if (REDUCED) return;
    lenis = new Lenis({
      duration: 1.05,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: .95,
      touchMultiplier: 1.7
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('sl-show', () => lenis && lenis.stop());
    document.addEventListener('sl-after-hide', () => lenis && lenis.start());
    document.addEventListener('az:lock', () => lenis && lenis.stop());
    document.addEventListener('az:unlock', () => lenis && lenis.start());
  }

  const barH = () => ($('#bar') ? $('#bar').offsetHeight + 20 : 84);

  function goTo(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - barH();
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* ------------------------------ پردهٔ ورود -------------------------
     شرط‌های نسخهٔ تأییدشده حفظ شده: دو عکس گالری، زوم آرام به‌جای درصد،
     و ردشدن با هر تماس. آنچه اضافه شده، شبکهٔ اندازه‌گیری است که همان‌جا
     روی قاب کشیده می‌شود و کاربر را از «تالار» به «میزِ آزمون» می‌برد.
     ------------------------------------------------------------------- */
  const ZOOM_END = 1.12;

  function veil() {
    const el = $('#veil');
    const plate = $('#heroPlate');
    if (!el) { fire(); return Promise.resolve(); }

    function fire() { document.dispatchEvent(new CustomEvent('az:veil-done')); }

    const finish = () => {
      el.classList.add('is-gone');
      el.style.display = 'none';
      document.body.classList.remove('is-frozen');
      ScrollTrigger.refresh();
    };

    if (REDUCED) {
      finish();
      if (plate) gsap.set(plate, { scale: 1, filter: 'blur(10px) brightness(.5)' });
      gsap.set('#heroMesh', { opacity: 1 });
      fire();
      return Promise.resolve();
    }

    document.body.classList.add('is-frozen');
    if (plate) gsap.set(plate, { scale: ZOOM_END, filter: 'blur(0px) brightness(1)' });

    return new Promise(resolve => {
      let done = false;
      const settle = () => {
        if (done) return;
        done = true;
        finish();
        lamp();
        resolve();
      };

      /* لحظهٔ نویسنده: اتاق از فوکوس می‌رود، شبکه کشیده می‌شود،
         چراغِ اتاقک بالا می‌آید و نمونه ظاهر می‌شود. */
      function lamp() {
        const tl = gsap.timeline({ onComplete: fire });
        if (plate) {
          tl.to(plate, {
            scale: 1.015,
            filter: 'blur(13px) brightness(.52)',
            duration: 1.7, ease: 'power2.inOut'
          }, 0);
        }
        tl.to('#heroMesh', { opacity: 1, duration: 1.2, ease: 'power2.out' }, .25)
          .from('.hero__file', { opacity: 0, y: 10, duration: .7, ease: 'power3.out' }, .1)
          .from('.hero h1', { opacity: 0, y: 22, filter: 'blur(8px)', duration: 1, ease: 'power3.out' }, .2)
          .from('.hero__lead', { opacity: 0, y: 14, duration: .8, ease: 'power3.out' }, .38)
          .from('.hero__acts > *', { opacity: 0, y: 12, duration: .6, stagger: .07, ease: 'power3.out' }, .5)
          .from('.hero__cap', { opacity: 0, duration: .6 }, .3)
          .from('.hero__rig', { opacity: 0, y: 18, duration: .9, ease: 'power3.out' }, .55);
      }

      const tl = gsap.timeline({ onComplete: settle });

      tl.fromTo('#veilShot',
          { scale: 1, transformOrigin: '50% 48%' },
          { scale: ZOOM_END, duration: 4.6, ease: 'power1.inOut' }, 0)
        .to('#veilGrid', { opacity: 1, duration: 1.1, ease: 'power2.out' }, .9)
        .to('#veilCross', { opacity: 1, duration: .5, ease: 'power2.out' }, 1.2)
        .fromTo('#veilCross', { rotate: -18, scale: .7 }, { rotate: 0, scale: 1, duration: 1, ease: 'power3.out' }, 1.2)
        .to('#veil .veil__mark', { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }, .35)
        .from('.veil__word', { y: 18, opacity: 0, duration: .9, ease: 'power3.out' }, .5)
        .from('.veil__line', { y: 12, opacity: 0, duration: .8, ease: 'power3.out' }, .7)
        .to('.veil__rule', { width: 'min(180px, 40vw)', duration: 1.1, ease: 'power2.inOut' }, .85)
        .to('.veil__skip', { opacity: 1, duration: .6 }, 1.7)
        .to('.veil__in, .veil__skip', { opacity: 0, y: -10, duration: .5, ease: 'power2.in' }, 2.6)
        .to('#veilGrid, #veilCross', { opacity: 0, duration: .5 }, 2.6)
        .to('#veil', { opacity: 0, duration: .9, ease: 'power2.inOut' }, 2.8)
        .set('#veil', { pointerEvents: 'none' }, 2.8);

      const skip = () => {
        if (done) return;
        tl.kill();
        gsap.to('#veil', { opacity: 0, duration: .45, ease: 'power2.inOut', onComplete: settle });
      };
      el.addEventListener('click', skip, { once: true });
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
      }, { once: true });
      window.addEventListener('wheel', skip, { once: true, passive: true });
      window.addEventListener('touchstart', skip, { once: true, passive: true });
    });
  }

  /* -------------------------------- تم ------------------------------- */
  const THEME_KEY = 'azarakhsh-test-theme';

  function applyTheme(mode, animate) {
    const root = document.documentElement;
    if (animate) {
      root.classList.add('theme-shift');
      setTimeout(() => root.classList.remove('theme-shift'), 560);
    }
    root.setAttribute('data-theme', mode);
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* حالت ناشناس */ }
    document.dispatchEvent(new CustomEvent('az:theme', { detail: mode }));
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* */ }
    /* پیش‌فرضِ سایت روشن است — آزمایشگاه در روز کار می‌کند */
    applyTheme(saved === 'dark' || saved === 'light' ? saved : 'light', false);

    const btn = $('#lamp');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    });
  }

  /* ------------------------------ نشانگر ----------------------------- */
  function cursor() {
    if (!FINE()) return;
    const el = $('#cursor');
    const label = $('#cursorLabel');
    if (!el) return;
    document.body.classList.add('has-cursor');

    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let cx = x, cy = y;

    window.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });

    gsap.ticker.add(() => {
      cx += (x - cx) * .22;
      cy += (y - cy) * .22;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    });

    const HOT = 'a, button, [data-cursor], input, select, textarea, .chip, .swatch, .station, .note-row__q';
    document.addEventListener('pointerover', e => {
      const t = e.target.closest ? e.target.closest(HOT) : null;
      if (!t) return;
      el.classList.add('is-hot');
      const txt = t.getAttribute('data-cursor');
      if (txt) { label.textContent = txt; el.classList.add('is-labelled'); }
      if (t.matches('.stage, [data-cursor="بچرخانید"]')) el.classList.add('is-grab');
    });
    document.addEventListener('pointerout', e => {
      const t = e.target.closest ? e.target.closest(HOT) : null;
      if (!t) return;
      el.classList.remove('is-hot', 'is-labelled', 'is-grab');
    });
    window.addEventListener('blur', () => el.classList.remove('is-hot', 'is-labelled', 'is-grab'));
  }

  /* ------------------------- سربرگ، نوارِ کاغذ ------------------------ */
  function chrome() {
    const bar = $('#bar');
    const dock = $('#dock');
    const tape = $('#tape');
    let last = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      if (bar) {
        bar.classList.toggle('is-set', y > 40);
        const down = y > last && y > 260;
        bar.classList.toggle('is-lifted', down);
        if (dock) dock.classList.toggle('is-lowered', down);
      }
      if (tape) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        tape.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------ آشکارسازی --------------------------
     همان قلمِ ثبت: عنصر از پایین «کشیده» می‌شود، نه اینکه محو ظاهر شود.
     ------------------------------------------------------------------- */
  function reveals() {
    if (REDUCED) return;
    const items = $$('[data-plot]').filter(el => !el.closest('.hero'));
    items.forEach(el => {
      const kind = el.getAttribute('data-plot') || 'up';
      const delay = parseFloat(el.getAttribute('data-plot-delay') || 0);
      const from =
        kind === 'rule' ? { scaleX: 0, transformOrigin: '100% 50%' } :
        kind === 'head' ? { opacity: 0, y: 26, filter: 'blur(9px)' } :
                          { opacity: 0, y: 18, clipPath: 'inset(0 0 14% 0)' };
      const to =
        kind === 'rule' ? { scaleX: 1, duration: 1, ease: 'expo.out' } :
        kind === 'head' ? { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.05, ease: 'expo.out' } :
                          { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: .95, ease: 'expo.out' };
      gsap.fromTo(el, from, {
        ...to, delay,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    /* شبکه‌ها با تأخیرِ پلکانی، نه همه با هم */
    $$('[data-plot-group]').forEach(group => {
      const kids = Array.from(group.children);
      gsap.fromTo(kids,
        { opacity: 0, y: 22, clipPath: 'inset(0 0 12% 0)' },
        {
          opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)',
          duration: .9, ease: 'expo.out', stagger: { each: .055, from: 'start' },
          scrollTrigger: { trigger: group, start: 'top 86%', once: true }
        });
    });
  }

  /* ------------------------------- نوارِ نشانه‌ها ---------------------- */
  function ticker() {
    const track = $('#tickerTrack');
    if (!track || REDUCED) return;
    const total = track.scrollWidth / 2;
    if (!total) return;
    gsap.to(track, {
      x: total, duration: total / 34, ease: 'none', repeat: -1,
      modifiers: { x: v => (parseFloat(v) % total) + 'px' }
    });
  }

  /* ------------------------------- شروع ------------------------------ */
  function start() {
    initTheme();
    initScroll();
    chrome();
    cursor();

    /* لنگرهای درون‌صفحه‌ای با اسکرول نرم */
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"], [data-goto]');
      if (!a) return;
      const id = a.getAttribute('data-goto') || a.getAttribute('href');
      if (!id || id === '#' || !$(id)) return;
      e.preventDefault();
      goTo(id);
    });

    veil().then(() => {
      reveals();
      ticker();
      ScrollTrigger.refresh();
    });
  }

  return { start, goTo, applyTheme, reveals, ticker, ZOOM_END, REDUCED };
})();
