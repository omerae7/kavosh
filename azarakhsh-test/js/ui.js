/* =========================================================================
   آذرخش · رابط
   کارهای مشترکِ همهٔ صفحه‌ها: صافیِ رف، پروندهٔ سفارش، مهرِ ثبت،
   یادداشت‌های بازشو، و فرم‌ها.
   ========================================================================= */
window.AZUI = (function () {
  'use strict';

  const { $, $$, fa, faNum, toman, faFloat, byId, esc, toast, openSheet, closeSheet, Cart, isPhoneNumber, en } = AZ;

  /* --------------------------- صافیِ رفِ نمونه ------------------------ */
  function initFilters(root) {
    const box = $('#filters', root || document);
    const grid = $('#rack-grid', root || document) || $('#shopGrid', root || document);
    if (!box || !grid) return;

    const cards = () => $$('.spec', grid);
    const counts = {};
    cards().forEach(c => {
      const f = c.dataset.family;
      counts[f] = (counts[f] || 0) + 1;
    });

    box.innerHTML =
      '<span class="gauge-label">FAMILY · <i>خانواده</i></span>' +
      FAMILIES.map(f => {
        const n = f.id === 'all' ? cards().length : (counts[f.id] || 0);
        return `<button class="chip" type="button" role="button" data-family="${f.id}" aria-pressed="${f.id === 'all'}">` +
               `${esc(f.label)}<span class="chip__n">${fa(n)}</span></button>`;
      }).join('') +
      '<span class="filters__count" id="filterCount"></span>';

    const out = $('#filterCount', box);

    function apply(id) {
      let shown = 0;
      cards().forEach(c => {
        const on = id === 'all' || c.dataset.family === id;
        c.hidden = !on;
        if (on) shown++;
      });
      $$('.chip', box).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.family === id)));
      if (out) out.textContent = fa(shown) + ' کد نمایش داده می‌شود';

      let empty = $('.rack-empty', grid);
      if (!shown) {
        if (!empty) {
          empty = document.createElement('div');
          empty.className = 'rack-empty';
          empty.innerHTML = '<svg><use href="#i-empty"></use></svg>' +
            '<b>در این خانواده کدی ثبت نشده است</b>' +
            '<span class="note">صافی را روی «همه» بگذارید یا از مشاور فنی بپرسید.</span>';
          grid.appendChild(empty);
        }
        empty.hidden = false;
      } else if (empty) {
        empty.hidden = true;
      }
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }

    box.addEventListener('click', e => {
      const b = e.target.closest('.chip');
      if (!b) return;
      apply(b.dataset.family);
    });

    apply('all');
    return apply;
  }

  /* ---------------------------- مهرِ ثبت ------------------------------ */
  function stamp(card) {
    if (!card || AZMotion.REDUCED) return;
    const s = document.createElement('span');
    s.className = 'spec__stamp';
    s.textContent = 'ثبت شد';
    card.appendChild(s);
    gsap.timeline({ onComplete: () => s.remove() })
      .to(s, { opacity: 1, scale: 1, duration: .32, ease: 'back.out(2.6)' })
      .to(s, { opacity: 0, duration: .4, delay: .62, ease: 'power2.in' });
  }

  function wireAdd(root) {
    (root || document).addEventListener('click', e => {
      const b = e.target.closest('[data-add]');
      if (!b) return;
      const id = b.getAttribute('data-add');
      const p = byId(id);
      if (!p) return;
      const tone = b.getAttribute('data-tone') || p.tones[0].name;
      const qty = parseFloat(b.getAttribute('data-qty') || '1') || 1;
      Cart.add(id, tone, qty);
      stamp(b.closest('.spec'));
      b.classList.add('is-done');
      setTimeout(() => b.classList.remove('is-done'), 1100);
    });
  }

  /* -------------------------- پروندهٔ سفارش --------------------------- */
  function badge() {
    const t = Cart.totals();
    ['#fileCount', '#dockCount'].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      el.textContent = fa(t.rows);
      el.classList.toggle('is-on', t.rows > 0);
    });
  }

  function renderFile() {
    const body = $('#fileBody');
    const foot = $('#fileFoot');
    if (!body) return;
    const items = Cart.list();
    const t = Cart.totals();

    if (!items.length) {
      body.innerHTML =
        '<div class="rack-empty" style="border:0">' +
        '<svg><use href="#i-file"></use></svg>' +
        '<b>پرونده هنوز خالی است</b>' +
        '<span class="note">از رفِ نمونه‌ها یک کد را ثبت کنید یا با محاسبه‌گر متراژتان را بسنجید.</span>' +
        '<a class="btn btn--line" href="shop.html">رفتن به فروشگاه</a>' +
        '</div>';
      if (foot) foot.hidden = true;
      badge();
      return;
    }

    body.innerHTML =
      '<div class="rows" id="fileRows">' +
      items.map(it => {
        const p = byId(it.id);
        const key = Cart.keyOf(it.id, it.tone);
        const tone = (p.tones.find(x => x.name === it.tone) || p.tones[0]);
        return `
        <div class="row" data-key="${esc(key)}">
          <span class="row__chip" style="background:${esc(tone.hex)}"></span>
          <div class="row__main">
            <div class="row__ttl">${esc(p.name)}</div>
            <div class="row__sub"><span class="mono">${esc(p.code)}</span> · ${esc(it.tone)}</div>
          </div>
          <div class="row__qty">
            <button type="button" data-step="-1" aria-label="کاهش"><svg><use href="#i-minus"></use></svg></button>
            <input type="text" inputmode="decimal" value="${faFloat(it.qty)}" aria-label="مقدار به ${esc(p.unit)}">
            <button type="button" data-step="1" aria-label="افزایش"><svg><use href="#i-plus"></use></svg></button>
          </div>
          <div class="row__sum">
            <b>${faNum(p.price * it.qty)}</b>
            <span>${esc(p.unit)}</span>
          </div>
          <button class="row__x" type="button" data-remove aria-label="حذف از پرونده"><svg><use href="#i-trash"></use></svg></button>
        </div>`;
      }).join('') +
      '</div>' +
      `<button class="row__clear" type="button" id="fileClear">خالی‌کردن پرونده</button>`;

    if (foot) {
      foot.hidden = false;
      foot.innerHTML = `
        <div class="sum-row">
          <span>جمعِ درب کارخانه</span><b>${toman(t.sum)}</b>
        </div>
        <p class="note" style="margin-block-end:.9rem">هزینهٔ باربری بر اساس مقصد و تناژ در پیش‌فاکتور جداگانه می‌آید.</p>
        <form class="form" id="fileForm" novalidate>
          <div class="field">
            <label class="gauge-label fa" for="fName">نام و نام خانوادگی</label>
            <input id="fName" type="text" autocomplete="name" placeholder="مثلاً رضا کیانی">
            <span class="field__err" id="fNameErr"></span>
          </div>
          <div class="field">
            <label class="gauge-label fa" for="fPhone">شمارهٔ همراه</label>
            <input id="fPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="۰۹۱۲۰۰۰۰۰۰۰">
            <span class="field__err" id="fPhoneErr"></span>
          </div>
          <button class="btn btn--sealed" type="submit" style="width:100%;justify-content:center">
            <svg><use href="#i-check"></use></svg>ثبت درخواستِ پیش‌فاکتور
          </button>
        </form>`;
      wireFileForm();
    }
    badge();
  }

  function wireFileForm() {
    const form = $('#fileForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#fName'), phone = $('#fPhone');
      let ok = true;
      const bad = (input, errId, msg) => {
        const f = input.closest('.field');
        const err = $('#' + errId);
        if (msg) { f.classList.add('is-bad'); err.textContent = msg; ok = false; }
        else { f.classList.remove('is-bad'); err.textContent = ''; }
      };
      bad(name, 'fNameErr', name.value.trim().length < 3 ? 'نام را کامل بنویسید.' : '');
      bad(phone, 'fPhoneErr', isPhoneNumber(phone.value) ? '' : 'شماره با ۰۹ شروع شود و یازده رقم باشد.');
      if (!ok) return;

      const t = Cart.totals();
      toast('درخواست ثبت شد؛ کارشناس آذرخش تماس می‌گیرد.');
      $('#fileFoot').innerHTML =
        '<div class="rack-empty" style="border:0;padding-block:1.6rem">' +
        '<svg style="color:var(--seal)"><use href="#i-check"></use></svg>' +
        `<b>درخواست شما ثبت شد</b>` +
        `<span class="note">شمارهٔ پیگیری: <span class="mono">AZ-${fa(String(Date.now()).slice(-6))}</span> · ` +
        `${fa(t.rows)} ردیف · ${toman(t.sum)}</span>` +
        '</div>';
    });
  }

  function wireFileRows() {
    const body = $('#fileBody');
    if (!body) return;
    body.addEventListener('click', e => {
      const row = e.target.closest('.row');
      if (row) {
        const key = row.dataset.key;
        const step = e.target.closest('[data-step]');
        if (step) {
          const input = $('input', row);
          const v = parseFloat(en(input.value).replace('٫', '.')) || 1;
          Cart.setQty(key, Math.max(.5, v + Number(step.dataset.step) * .5));
          return;
        }
        if (e.target.closest('[data-remove]')) { Cart.remove(key); return; }
      }
      if (e.target.closest('#fileClear')) {
        Cart.clear();
        toast('پرونده خالی شد.');
      }
    });
    body.addEventListener('change', e => {
      const row = e.target.closest('.row');
      if (!row || e.target.tagName !== 'INPUT') return;
      const v = parseFloat(en(e.target.value).replace('٫', '.'));
      Cart.setQty(row.dataset.key, isNaN(v) ? .5 : v);
    });
  }

  /* ---------------------------- یادداشت‌ها ---------------------------- */
  function initNotes(list) {
    const box = $('#notes');
    if (!box) return;
    box.innerHTML = (list || NOTES).map((n, i) => `
      <div class="note-row${i === 0 ? ' is-open' : ''}">
        <button class="note-row__q" type="button" aria-expanded="${i === 0}" aria-controls="note-a-${i}">
          ${esc(n.q)}<span class="note-row__sign"></span>
        </button>
        <div class="note-row__a" id="note-a-${i}"><div><p>${esc(n.a)}</p></div></div>
      </div>`).join('');

    box.addEventListener('click', e => {
      const b = e.target.closest('.note-row__q');
      if (!b) return;
      const row = b.closest('.note-row');
      const open = row.classList.contains('is-open');
      $$('.note-row', box).forEach(r => {
        r.classList.remove('is-open');
        $('.note-row__q', r).setAttribute('aria-expanded', 'false');
      });
      if (!open) {
        row.classList.add('is-open');
        b.setAttribute('aria-expanded', 'true');
      }
    });
  }

  /* ------------------------------ راهبری ------------------------------ */
  function initNav() {
    const openFile = () => { renderFile(); openSheet('#fileSheet', '520px'); };
    ['#fileBtn', '#dockFile'].forEach(sel => {
      const b = $(sel);
      if (b) b.addEventListener('click', openFile);
    });
    const m = $('#menuBtn');
    if (m) m.addEventListener('click', () => openSheet('#menuSheet', '380px'));

    document.addEventListener('click', e => {
      const c = e.target.closest('[data-close]');
      if (c) { closeSheet(c.getAttribute('data-close')); return; }
      const a = e.target.closest('[data-ask]');
      if (a) { e.preventDefault(); window.AZAdvisor && AZAdvisor.open(a); }
    });

    document.addEventListener('az:cart', () => {
      badge();
      if ($('#fileSheet') && $('#fileSheet').open) renderFile();
    });
    badge();
    wireFileRows();
  }

  /* ------------------------------- شروع ------------------------------- */
  function start() {
    initNav();
    wireAdd();
    initNotes();
    initFilters();
    AZ.wireImages();
  }

  return { start, initFilters, renderFile, badge, stamp, initNotes, wireAdd };
})();

document.addEventListener('DOMContentLoaded', () => {
  AZMotion.start();
  AZUI.start();
});
