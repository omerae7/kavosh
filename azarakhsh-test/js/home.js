/* =========================================================================
   آذرخش · صفحهٔ نخست
   اتاقکِ نور، ایستگاه‌های خط تولید، شواهدِ کارگاهی و صدورِ شناسنامه.
   ========================================================================= */
import { mount } from './booth.js';

const { $, $$, fa, faNum, faFloat, toman, esc, byId, estimate, toast, Cart, en } = AZ;

/* ============================ اتاقکِ نور ============================= */
let booth = null;
let toneIx = 0;
let sceneIx = 0;

function paintReads(scene) {
  const t = TONES[toneIx];
  const box = $('#reads');
  if (!box) return;
  box.innerHTML = `
    <div class="reads__row"><span class="gauge-label">COLOUR TEMP</span><b>${esc(scene.kelvin)}</b></div>
    <div class="reads__row"><span class="gauge-label">INCIDENT ANGLE</span><b class="is-fa">${esc(scene.angle)}</b></div>
    <div class="reads__row"><span class="gauge-label">SPECIMEN HEX</span>
      <span class="reads__chip" style="background:${esc(t.hex)}"></span>
      <b class="ltr">${esc(t.hex.toUpperCase())}</b></div>
    <div class="reads__row"><span class="gauge-label">ROTATION</span><b id="readDeg">۰۰۰°</b></div>`;
}

function toneProduct(tone) {
  return PRODUCTS.find(p => p.slug === tone.file) || PRODUCTS[0];
}

function paintTone() {
  const t = TONES[toneIx];
  const p = toneProduct(t);
  const code = $('#boothCode');
  if (code) code.textContent = `${p.code} · ${t.name}`;
  const flat = $('#stageFlat');
  if (flat) { flat.src = `assets/products/${t.file}-single.jpg`; flat.alt = `نمونهٔ ${p.name}`; }
  const note = $('#toneNote');
  if (note) note.textContent = p.desc;
  if (booth) booth.setTone(t.hex);
  paintReads(LIGHT_SCENES[sceneIx]);
}

function initBooth() {
  const stage = $('#stage');
  if (!stage) return;

  /* کلیدهای صحنهٔ نور */
  const lights = $('#lights');
  if (lights) {
    lights.innerHTML = LIGHT_SCENES.map((s, i) => `
      <button class="lights__b" type="button" data-ix="${i}" aria-pressed="${i === 0}">
        <span>${esc(s.label)}</span><span class="gauge-label fa">${esc(s.hint)}</span>
      </button>`).join('');
    lights.addEventListener('click', e => {
      const b = e.target.closest('.lights__b');
      if (!b) return;
      sceneIx = Number(b.dataset.ix);
      $$('.lights__b', lights).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const s = LIGHT_SCENES[sceneIx];
      $('#lightNote').textContent = s.note;
      paintReads(s);
      if (booth) booth.setScene(s.id);
    });
    $('#lightNote').textContent = LIGHT_SCENES[0].note;
  }

  /* رنگ‌بندی */
  const sw = $('#swatches');
  if (sw) {
    sw.innerHTML = TONES.map((t, i) => `
      <button class="swatch" type="button" data-ix="${i}" aria-pressed="${i === 0}"
        style="background:${esc(t.hex)}" title="${esc(t.name)}" aria-label="نمونهٔ ${esc(t.name)}"></button>`).join('');
    sw.addEventListener('click', e => {
      const b = e.target.closest('.swatch');
      if (!b) return;
      toneIx = Number(b.dataset.ix);
      $$('.swatch', sw).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      paintTone();
    });
  }

  paintTone();

  /* موتور سه‌بعدی فقط بعد از رفتنِ پرده روشن می‌شود */
  const light = () => {
    booth = mount(stage, {
      hex: TONES[toneIx].hex,
      scene: LIGHT_SCENES[sceneIx].id,
      onTick: d => {
        const txt = fa(String(d).padStart(3, '0')) + '°';
        const a = $('#boothDeg'); if (a) a.textContent = txt;
        const b = $('#readDeg'); if (b) b.textContent = txt;
      }
    });
    if (!booth) {
      /* بدون WebGL: همان نمونه، عکسِ استودیویی، بدون از دست رفتنِ اطلاعات */
      const hint = $('.stage__hint');
      if (hint) hint.textContent = 'STATIC SPECIMEN';
      const deg = $('.stage__deg'); if (deg) deg.hidden = true;
    }
  };
  document.addEventListener('az:veil-done', light, { once: true });
  /* اگر پرده اصلاً نبود (ورود از لنگر) */
  setTimeout(() => { if (!booth && !$('#veil')) light(); }, 60);
}

/* ========================== ایستگاه‌های خط تولید ====================== */
function initLine() {
  const box = $('#stations');
  if (!box) return;

  box.innerHTML = LINE.map((s, i) => `
    <div class="station${i === 0 ? ' is-on' : ''}" data-ix="${i}" tabindex="0" role="button" aria-pressed="${i === 0}">
      <div class="station__pin"><span class="station__dot"></span><span class="station__no">${esc(s.no)}</span></div>
      <div>
        <div class="station__ttl">${esc(s.title)}</div>
        <div class="station__spec">${esc(s.spec)} — ${esc(s.read)}</div>
      </div>
      <div class="station__say"><span>${esc(s.note)}</span></div>
    </div>`).join('');

  let cur = -1;
  function show(i) {
    if (i === cur || !LINE[i]) return;
    cur = i;
    const s = LINE[i];
    $$('.station', box).forEach((el, ix) => {
      el.classList.toggle('is-on', ix === i);
      el.setAttribute('aria-pressed', String(ix === i));
    });
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set('#gaugeNo', 'STATION ' + String(i + 1).padStart(2, '0'));
    set('#gaugeIx', s.no + ' / ۰۶');
    set('#gaugeTtl', s.title);
    set('#gaugeNote', s.note);
    set('#gaugeSpec', s.spec);
    set('#gaugeRead', s.read);
    const bar = $('#gaugeBar');
    if (bar) bar.style.setProperty('--at', ((i + 1) / LINE.length).toFixed(3));

    if (!AZMotion.REDUCED) {
      gsap.fromTo('.gauge__face > *',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: .5, stagger: .05, ease: 'power3.out', overwrite: true });
    }
  }
  show(0);

  box.addEventListener('click', e => {
    const st = e.target.closest('.station');
    if (st) show(Number(st.dataset.ix));
  });
  box.addEventListener('keydown', e => {
    const st = e.target.closest('.station');
    if (st && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); show(Number(st.dataset.ix)); }
  });

  /* روی دسکتاپ، اسکرول خودش ایستگاه را عوض می‌کند */
  if (window.matchMedia('(min-width: 1000px)').matches && !AZMotion.REDUCED) {
    $$('.station', box).forEach((el, i) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 62%',
        end: 'bottom 62%',
        onEnter: () => show(i),
        onEnterBack: () => show(i)
      });
    });
  }
}

/* =========================== شواهدِ کارگاهی =========================== */
/* چیدمانِ برگه‌های تماس: یک قابِ بزرگ، دو باریک کنارش، سه مربع زیرِ آن */
const PLATE_SHAPE = ['lead', 'tall', 'tall', 'sq', 'sq', 'sq'];

function initPlates() {
  const box = $('#plates');
  if (!box) return;
  box.setAttribute('data-plot-group', '');
  box.innerHTML = PROJECTS.map((p, i) => {
    const code = (p.meta.split('·').pop() || '').trim();
    const meta = p.meta.split('·').slice(0, -1).join('،').trim();
    return `
    <a class="plate plate--${PLATE_SHAPE[i]}" href="shop.html">
      <img src="${esc(p.file)}" alt="${esc(p.title)} — نمای اجراشده با ${esc(code)}" loading="lazy" data-slot>
      <span class="plate__tag">
        <span>
          <span class="plate__ttl">${esc(p.title)}</span>
          <span class="plate__meta">${esc(meta)}</span>
        </span>
        <span class="plate__code">${esc(code)}</span>
      </span>
    </a>`;
  }).join('');
}

/* =========================== صدورِ شناسنامه =========================== */
function initCalc() {
  const form = $('#calc');
  if (!form) return;

  const sel = $('#calcProduct');
  sel.innerHTML = PRODUCTS.map(p =>
    `<option value="${esc(p.id)}">${esc(p.name)} — ${esc(p.code)}</option>`).join('');

  const W = $('#calcW'), H = $('#calcH'), O = $('#calcOpen'), Oout = $('#calcOpenOut');

  const num = v => {
    const n = parseFloat(en(String(v)).replace(/[^\d.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  /* نخستین اجرا فقط عددِ ازپیش‌نوشتهٔ HTML را تثبیت می‌کند؛ از دفعهٔ بعد
     عقربه حرکت می‌کند. */
  let ready = false;
  function count(el, to, fmt) {
    if (!el) return;
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (AZMotion.REDUCED || !ready) { el.textContent = fmt(to); return; }
    const o = { v: from };
    gsap.to(o, {
      v: to, duration: .55, ease: 'power2.out', overwrite: true,
      onUpdate: () => { el.textContent = fmt(o.v); }
    });
  }

  function run() {
    const p = byId(sel.value) || PRODUCTS[0];
    const r = estimate({ product: p, width: num(W.value), height: num(H.value), openings: Number(O.value) });
    if (!r) return;

    Oout.textContent = fa(O.value) + '٪';
    $('#draftName').textContent = p.name;
    $('#draftSerial').textContent = `${p.code} / BATCH ${(LAB[p.id] || {}).batch || '—'}`;
    $('#draftSwatch').style.background = p.hex;
    $('#calcHint').textContent =
      `هر ${p.unit} از این کد ${p.perLabel} آجر می‌برد و پالت ${fa(p.pallet)} ${p.unit}ی بسته می‌شود. ` +
      `زمان تحویل: ${p.lead || '۳ تا ۵ روز کاری'}.`;

    count($('#dArea'),    r.area,    v => faFloat(v, 1) + ' ' + p.unit);
    count($('#dBilled'),  r.billed,  v => faFloat(v, 1) + ' ' + p.unit);
    count($('#dBricks'),  r.bricks,  v => faNum(v) + ' عدد');
    count($('#dPallets'), r.pallets, v => faNum(v) + ' پالت');
    count($('#dWeight'),  r.weight,  v => faNum(v) + ' کیلوگرم');
    count($('#dPrice'),   r.price,   v => toman(v));

    form.dataset.pid = p.id;
    form.dataset.qty = r.billed.toFixed(1);
    ready = true;
  }

  ['input', 'change'].forEach(ev => form.addEventListener(ev, run));
  run();

  $('#draftAdd').addEventListener('click', () => {
    const p = byId(form.dataset.pid);
    const q = parseFloat(form.dataset.qty);
    if (!p || !q) return;
    Cart.add(p.id, p.tones[0].name, q, true);
    toast(`${faFloat(q, 1)} ${p.unit} از ${p.name} در پرونده ثبت شد.`);
  });
}

/* ============================== خرده‌کارها ============================ */
function initPrompts() {
  const box = $('#benchPrompts');
  if (!box) return;
  box.innerHTML = PROMPTS.map(p =>
    `<button class="bench__p" type="button" data-prompt="${esc(p)}">${esc(p)}</button>`).join('');
  box.addEventListener('click', e => {
    const b = e.target.closest('.bench__p');
    if (b && window.AZAdvisor) AZAdvisor.open(b, b.dataset.prompt);
  });
}

function initTicker() {
  const box = $('#tickerTrack');
  if (!box) return;
  const one = TICKER.map((t, i) => `<span class="ticker__i">${fa(String(i + 1).padStart(2, '0'))}<span>${esc(t)}</span></span>`).join('');
  box.innerHTML = one + one;
}

/* ================================ شروع =============================== */
initBooth();
initLine();
initPlates();
initCalc();
initPrompts();
initTicker();
