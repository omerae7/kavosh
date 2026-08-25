/* =========================================================================
   آذرخش · شناسنامهٔ محصول
   نمونهٔ همین کد زیر سه صحنهٔ نور، انتخاب رنگ‌بندی و ثبت در پرونده.
   ========================================================================= */
import { mount } from './booth.js';

const { $, $$, fa, faFloat, esc, byId, toast, Cart, en } = AZ;

const p = byId(document.body.dataset.pid);
if (p) {
  let booth = null;
  let toneIx = 0;
  let sceneIx = 0;

  /* ---------------------------- صحنهٔ نور ---------------------------- */
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
      $('#lightNote').textContent = LIGHT_SCENES[sceneIx].note;
      if (booth) booth.setScene(LIGHT_SCENES[sceneIx].id);
    });
    $('#lightNote').textContent = LIGHT_SCENES[0].note;
  }

  /* ---------------------------- رنگ‌بندی ----------------------------- */
  const sw = $('#swatches');
  if (sw) {
    sw.innerHTML = p.tones.map((t, i) => `
      <button class="swatch" type="button" data-ix="${i}" aria-pressed="${i === 0}"
        style="background:${esc(t.hex)}" title="${esc(t.name)}" aria-label="رنگ‌بندی ${esc(t.name)}"></button>`).join('');
    sw.addEventListener('click', e => {
      const b = e.target.closest('.swatch');
      if (!b) return;
      toneIx = Number(b.dataset.ix);
      $$('.swatch', sw).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      paint();
    });
  }

  function paint() {
    const t = p.tones[toneIx];
    const code = $('#boothCode');
    if (code) code.textContent = `${p.code} · ${t.name}`;
    const flat = $('#stageFlat');
    if (flat) { flat.src = `assets/products/${t.file}-single.jpg`; flat.alt = `نمونهٔ ${p.name} در رنگ ${t.name}`; }
    const note = $('#toneNote');
    if (note) note.innerHTML = `رنگ انتخاب‌شده: ${esc(t.name)}. کدِ رنگ <span class="ltr mono">${esc(t.hex.toUpperCase())}</span> — نمونهٔ فیزیکی رایگان فرستاده می‌شود.`;
    if (booth) booth.setTone(t.hex);
  }
  paint();

  booth = mount($('#stage'), {
    hex: p.tones[0].hex,
    scene: LIGHT_SCENES[0].id,
    onTick: d => {
      const el = $('#boothDeg');
      if (el) el.textContent = fa(String(d).padStart(3, '0')) + '°';
    }
  });
  if (!booth) {
    const hint = $('.stage__hint');
    if (hint) hint.textContent = 'STATIC SPECIMEN';
    const deg = $('.stage__deg');
    if (deg) deg.hidden = true;
  }

  /* ----------------------------- مقدار ------------------------------- */
  const qty = $('#buyQty');
  const val = () => {
    const v = parseFloat(en(qty.value).replace('٫', '.'));
    return isNaN(v) || v < .5 ? .5 : Math.round(v * 2) / 2;
  };
  function setQty(v) {
    qty.value = faFloat(Math.max(.5, Math.round(v * 2) / 2));
    const note = $('#buyNote');
    if (note) {
      const n = val();
      note.textContent =
        `${faFloat(n)} ${p.unit} یعنی حدود ${fa(Math.ceil(n * p.per))} عدد آجر و ` +
        `${fa(Math.ceil(n / p.pallet))} پالت. زمان آماده‌سازی ${p.lead || '۳ تا ۵ روز کاری'}.`;
    }
  }
  const buyBox = $('.cert__buy');
  if (buyBox) {
    buyBox.addEventListener('click', e => {
      const b = e.target.closest('[data-q]');
      if (!b) return;
      setQty(val() + Number(b.dataset.q) * .5);
    });
    qty.addEventListener('change', () => setQty(val()));
  }
  setQty(1);

  const add = $('#buyAdd');
  if (add) {
    add.addEventListener('click', () => {
      Cart.add(p.id, p.tones[toneIx].name, val(), true);
      toast(`${faFloat(val())} ${p.unit} از ${p.name} (${p.tones[toneIx].name}) در پرونده ثبت شد.`);
      add.classList.add('is-done');
      setTimeout(() => add.classList.remove('is-done'), 1100);
    });
  }
}
