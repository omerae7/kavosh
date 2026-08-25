/* =========================================================================
   آذرخش · سازندهٔ صفحه‌های ایستا
   محصولات با JS به صفحه تزریق نمی‌شوند؛ همین ابزار آن‌ها را درونِ بدنهٔ
   HTML می‌نویسد. اجرا:  node tools/build.mjs
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => { fs.writeFileSync(path.join(ROOT, f), s); console.log('  ·', f); };

/* --------------------- خواندن داده‌ها با vm --------------------- */
const ctx = vm.createContext({ window: {}, document: { addEventListener() {} }, console });
/* اعلان‌های const به شیء سراسری نمی‌نشینند، پس صریح برمی‌گردانند */
const NAMES = ['PRODUCTS', 'TONES', 'FAMILIES', 'PROJECTS', 'LAB', 'LINE', 'NOTES', 'KNOWLEDGE', 'VOICES', 'TICKER', 'LIGHT_SCENES'];
const bag = vm.runInContext(
  read('js/data.js') + '\n' + read('js/content.js') + '\n' + read('js/lab.js') +
  '\n({' + NAMES.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') + '})',
  ctx);
const { PRODUCTS, TONES, FAMILIES, PROJECTS, LAB, LINE, NOTES, KNOWLEDGE } = bag;

const FA = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
const fa = v => String(v).replace(/[0-9]/g, d => FA[+d]);
const faNum = n => fa(Math.round(Number(n) || 0).toLocaleString('en-US')).replace(/,/g, '٬');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* شمارهٔ کوتاهِ سه عددِ اصلیِ هر برگه */
function reads(p) {
  return [
    { k: 'جذب آب', v: p.absorb },
    { k: 'مقاومت', v: p.strength.replace(' kg/cm²', '') },
    { k: 'وزن', v: (p.weight.match(/[۰-۹]+/) || ['—'])[0] + ' <span class="mono">kg</span>' }
  ];
}

/* ============================ برگهٔ نمونه ============================ */
function card(p, opts = {}) {
  const r = reads(p);
  const flag = p.flag
    ? `<span class="spec__flag spec__flag--fa">${esc(p.flag)}</span>`
    : '';
  const href = `product-${p.id}.html`;
  return `
        <article class="spec" data-family="${esc(p.family)}" data-id="${esc(p.id)}"
                 data-price="${p.price}" data-name="${esc(p.name)}" style="--warm:${esc(p.hex)}">
          <span class="spec__tab"></span>
          <a class="spec__frame" href="${href}" aria-label="شناسنامهٔ کامل ${esc(p.name)}">
            <img class="spec__shot spec__shot--wall" src="${esc(p.img)}" alt="نمای اجراشده با ${esc(p.name)}" loading="lazy" data-slot>
            <img class="spec__shot spec__shot--unit" src="${esc(p.imgAlt)}" alt="" loading="lazy" aria-hidden="true">
            <span class="spec__scale"><span class="spec__ticks"></span><span class="spec__mm">${esc(p.dims.replace(/×/g, '·'))} mm</span></span>
            ${flag}
          </a>
          <div class="spec__body">
            <div class="spec__id">
              <span class="spec__code">${esc(p.code)}</span>
              <span class="spec__fam">${esc(p.familyLabel)}</span>
            </div>
            <h3 class="spec__name"><a href="${href}">${esc(p.name)}</a></h3>
            <p class="spec__desc">${esc(p.desc)}</p>
            <div class="spec__reads">
              ${r.map(x => `<div class="spec__read"><b>${x.v}</b><span class="gauge-label fa">${esc(x.k)}</span></div>`).join('\n              ')}
            </div>
            <div class="spec__tones">
              ${p.tones.map(t => `<span class="spec__tone" style="background:${esc(t.hex)}" title="${esc(t.name)}"></span>`).join('')}
              <span class="gauge-label fa">${fa(p.tones.length)} رنگ</span>
            </div>
          </div>
          <div class="spec__foot">
            <div class="spec__price">
              <b>${faNum(p.price)}</b>
              <span>تومان / ${esc(p.unit)}${p.was ? ` · <s>${faNum(p.was)}</s>` : ''}</span>
            </div>
            ${opts.compare ? `<button class="spec__cmp" type="button" data-cmp="${esc(p.id)}" aria-pressed="false" title="افزودن به میز مقایسه"><svg><use href="#i-scale"></use></svg></button>` : ''}
            <button class="spec__add" type="button" data-add="${esc(p.id)}">
              <svg><use href="#i-plus"></use></svg>ثبت
            </button>
          </div>
        </article>`;
}

/* ------------------------- کارِ روی حصارها ------------------------- */
function fence(html, name, body) {
  const re = new RegExp(`(<!-- az:${name} -->)([\\s\\S]*?)(<!-- /az:${name} -->)`);
  if (!re.test(html)) throw new Error('حصار پیدا نشد: ' + name);
  return html.replace(re, (_, a, __, c) => `${a}\n${body}\n        ${c}`);
}
function grab(html, name) {
  const re = new RegExp(`<!-- az:${name} -->[\\s\\S]*?<!-- /az:${name} -->`);
  const m = html.match(re);
  if (!m) throw new Error('حصار پیدا نشد: ' + name);
  return m[0];
}
function put(html, name, block) {
  const re = new RegExp(`<!-- az:${name} -->[\\s\\S]*?<!-- /az:${name} -->`);
  return html.replace(re, () => block);
}

/* ============================ صفحهٔ نخست ============================
   محاسبه‌گر با مقدارهای پیش‌فرضِ همان فرم در HTML نوشته می‌شود تا صفحه
   حتی پیش از اجرای JS یک برگهٔ کامل باشد. */
const WASTE = 1.07;
function draft(p, width, height, openings) {
  const area = width * height * (1 - openings / 100);
  const billed = area * WASTE;
  const f1 = v => {
    const x = Math.round(v * 10) / 10;
    return Number.isInteger(x) ? fa(x) : fa(x.toFixed(1)).replace('.', '٫');
  };
  return [
    ['مساحتِ خالصِ نما', 'dArea',    f1(area) + ' ' + p.unit],
    ['با پرتِ اجرا (۷٪)', 'dBilled',  f1(billed) + ' ' + p.unit],
    ['تعدادِ آجر',       'dBricks',  faNum(Math.ceil(billed * p.per)) + ' عدد'],
    ['پالت',            'dPallets', faNum(Math.ceil(billed / p.pallet)) + ' پالت'],
    ['وزنِ تقریبیِ بار',  'dWeight',  faNum(billed * p.kg) + ' کیلوگرم'],
    ['مبلغ درب کارخانه', 'dPrice',   faNum(Math.round(billed * p.price)) + ' تومان']
  ];
}

let index = read('index.html');
index = fence(index, 'rack', PRODUCTS.map(p => card(p)).join('\n'));

const first = PRODUCTS[0];
index = fence(index, 'draft-head',
  `          <div class="draft__ttl" id="draftName">${esc(first.name)}</div>\n` +
  `          <span class="draft__serial" id="draftSerial">${esc(first.code)} / BATCH ${esc((LAB[first.id] || {}).batch || '—')}</span>`);
index = fence(index, 'draft',
  draft(first, 12, 3.5, 15).map(([k, id, v], i) =>
    `        <div class="draft__row${i === 5 ? ' draft__row--sum' : ''}"><span>${esc(k)}</span><b id="${id}">${esc(v)}</b></div>`
  ).join('\n'));

write('index.html', index);

/* بلوک‌های مشترک از صفحهٔ نخست برداشته می‌شوند */
const SHARED = ['head', 'sprite', 'bar', 'foot', 'dock', 'sheets', 'advisor', 'foot-scripts'];
const blocks = Object.fromEntries(SHARED.map(n => [n, grab(index, n)]));

function shell({ title, desc, page, css, js, body, current, attrs }) {
  let head = blocks.head
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/(<meta name="description" content=")[\s\S]*?(">)/, `$1${esc(desc)}$2`);
  let bar = blocks.bar;
  if (current) {
    bar = bar.replace(`href="${current}"`, `href="${current}" aria-current="page"`);
  }
  let dock = blocks.dock.replace(/ aria-current="page"/g, '');
  if (current === 'shop.html') dock = dock.replace('href="shop.html"', 'href="shop.html" aria-current="page"');
  else if (current === 'index.html') dock = dock.replace('href="index.html"', 'href="index.html" aria-current="page"');

  return `<!doctype html>
<html lang="fa" dir="rtl" data-theme="light">
<head>
${head}
<title>${esc(title)}</title>
${css.map(c => `<link rel="stylesheet" href="css/${c}">`).join('\n')}
</head>

<body data-page="${page}"${attrs || ''}>

<div class="film" aria-hidden="true"><div class="film__grain"></div></div>
<div class="tape" id="tape" aria-hidden="true"></div>
<div class="cursor" id="cursor" aria-hidden="true"><span class="cursor__ring"></span><span class="cursor__label" id="cursorLabel"></span></div>

${blocks.sprite}

${bar}

${body}

${blocks.foot}

${dock}

${blocks.sheets}

${blocks.advisor}

<div class="toast" id="toast" role="status" aria-live="polite">
  <span class="toast__seal"></span><span id="toastText"></span>
</div>

${blocks['foot-scripts']}
${js.map(f => `<script${f.mod ? ' type="module"' : ''} src="js/${f.src}"></script>`).join('\n')}
</body>
</html>
`;
}

/* ============================== فروشگاه ============================== */
const shopBody = `<main>
<section class="act shell" id="shopTop">
  <nav class="crumb" aria-label="مسیر">
    <a href="index.html">صفحهٔ نخست</a><span>/</span><b>فروشگاه</b>
  </nav>

  <div class="act__head" data-plot="head">
    <div>
      <div class="act__no"><b>RACK</b><i>همهٔ کدهای فعال</i></div>
      <h1 class="act__ttl">رفِ کاملِ نمونه‌ها</h1>
    </div>
    <p class="act__say">
      ${fa(PRODUCTS.length)} کدِ فعالِ خط تولید. هر برگه به شناسنامهٔ کاملِ همان پارت وصل است.
      تا سه کد را روی میزِ مقایسه بگذارید و عددهایشان را کنار هم ببینید.
    </p>
  </div>

  <div class="filters" id="filters" role="group" aria-label="صافیِ خانواده"></div>

  <div class="shopbar">
    <div class="field field__sel shopbar__sort">
      <label class="gauge-label fa" for="shopSort">ترتیب</label>
      <select id="shopSort">
        <option value="index">ترتیبِ خط تولید</option>
        <option value="price-asc">قیمت: کم به زیاد</option>
        <option value="price-desc">قیمت: زیاد به کم</option>
        <option value="name">نام کد</option>
      </select>
    </div>
    <p class="note shopbar__note">قیمت‌ها درب کارخانهٔ تبریز و برای هر واحدِ اجراشده است.</p>
  </div>

  <div class="rack" id="shopGrid" data-plot-group>
${PRODUCTS.map(p => card(p, { compare: true })).join('\n')}
  </div>
</section>

<div class="cmp" id="cmp" hidden aria-live="polite">
  <div class="cmp__in shell">
    <div class="cmp__top">
      <span class="gauge-label">COMPARISON BENCH · <i>میزِ مقایسه</i></span>
      <button class="cmp__clear" type="button" id="cmpClear">پاک‌کردن میز</button>
    </div>
    <div class="cmp__grid" id="cmpGrid"></div>
  </div>
</div>
</main>`;

write('shop.html', shell({
  title: 'فروشگاه · آذرخش',
  desc: 'رفِ کاملِ نمونه‌های آذرخش — ده کد آجر نمای نسوز، پلاک نازک، دست‌ساز و قطعات ویژه، با عددهای آزمونِ هر پارت.',
  page: 'shop',
  current: 'shop.html',
  css: ['shop.css'],
  js: [{ src: 'shop.js' }],
  body: shopBody
}));

/* ============================ صفحهٔ محصول ============================ */
function productPage(p) {
  const lab = LAB[p.id] || { batch: '—', mine: '—', kiln: '—', tests: [] };
  const kin = PRODUCTS.filter(x => x.id !== p.id && x.family === p.family).slice(0, 3);
  const more = kin.length ? kin : PRODUCTS.filter(x => x.id !== p.id).slice(0, 3);

  const specs = [
    ['ابعاد', '<span class="ltr">' + fa(p.dims) + '</span> میلی‌متر'],
    ['جذب آب', esc(p.absorb)],
    ['مقاومت فشاری', '<span class="ltr">' + fa(p.strength) + '</span>'],
    ['وزن', esc(p.weight)],
    ['بسته‌بندی', esc(p.pack)],
    ['تعداد در هر ' + p.unit, esc(p.perLabel)],
    ['زمان آماده‌سازی', esc(p.lead || '۳ تا ۵ روز کاری')],
    ['موجودی', esc(p.stock || 'موجود در انبار')]
  ];

  return `<main>
<section class="act act--tight shell">
  <nav class="crumb" aria-label="مسیر">
    <a href="index.html">صفحهٔ نخست</a><span>/</span>
    <a href="shop.html">فروشگاه</a><span>/</span><b>${esc(p.name)}</b>
  </nav>

  <div class="cert" style="--warm:${esc(p.hex)}">
    <!-- ستون چپ: نمونه زیر نور -->
    <div class="cert__view">
      <div class="cert__booth night">
        <div class="hero__cap">
          <span class="gauge-label">SPECIMEN UNDER TEST</span>
          <b id="boothCode">${esc(p.code)} · ${esc(p.tones[0].name)}</b>
        </div>
        <div class="stage" id="stage" data-cursor="بچرخانید">
          <canvas class="stage__gl" id="stageGl" aria-hidden="true"></canvas>
          <div class="stage__flat"><img src="${esc(p.imgAlt)}" alt="نمونهٔ ${esc(p.name)}" id="stageFlat"></div>
          <div class="stage__pool"></div>
          <div class="stage__deg mono">ROT <b id="boothDeg">۰۰۰°</b></div>
          <div class="stage__hint"><span class="only-fine">DRAG TO ROTATE</span><span class="only-touch">SWIPE TO ROTATE</span></div>
        </div>
        <div class="lights" id="lights" role="group" aria-label="انتخاب صحنهٔ نور"></div>
        <p class="rig__note" id="lightNote"></p>
      </div>

      <div class="cert__shots">
        <figure class="cert__shot">
          <img src="${esc(p.img)}" alt="نمای اجراشده با ${esc(p.name)}" loading="lazy" data-slot>
          <figcaption class="gauge-label fa">نمای اجراشده</figcaption>
        </figure>
        <figure class="cert__shot">
          <img src="${esc(p.imgAlt)}" alt="تکِ آجر ${esc(p.name)}" loading="lazy" data-slot>
          <figcaption class="gauge-label fa">تکِ نمونه</figcaption>
        </figure>
      </div>
    </div>

    <!-- ستون راست: شناسنامه -->
    <div class="cert__file">
      <div class="cert__stamp">
        <span class="gauge-label">BATCH <span class="ltr">${esc(lab.batch)}</span></span>
        <span class="cert__ok"><svg><use href="#i-check"></use></svg>تأییدِ آزمایشگاه</span>
      </div>

      <div class="cert__id">
        <span class="spec__code">${esc(p.code)}</span>
        <span class="spec__fam">${esc(p.familyLabel)}</span>
      </div>
      <h1 class="cert__name">${esc(p.name)}</h1>
      <p class="cert__desc">${esc(p.story)}</p>

      <div class="cert__price">
        <b>${faNum(p.price)}</b>
        <span>تومان / ${esc(p.unit)} · درب کارخانه</span>
        ${p.was ? `<s>${faNum(p.was)}</s>` : ''}
      </div>

      <div class="cert__tones">
        <span class="gauge-label fa">رنگ‌بندیِ این کد</span>
        <div class="swatches" id="swatches" role="group" aria-label="انتخاب رنگ نمونه"></div>
        <p class="rig__note" id="toneNote" style="color:var(--ink-3)"></p>
      </div>

      <div class="cert__buy">
        <div class="row__qty">
          <button type="button" data-q="-1" aria-label="کاهش"><svg><use href="#i-minus"></use></svg></button>
          <input id="buyQty" type="text" inputmode="decimal" value="۱" aria-label="مقدار به ${esc(p.unit)}">
          <button type="button" data-q="1" aria-label="افزایش"><svg><use href="#i-plus"></use></svg></button>
        </div>
        <button class="btn btn--ink" type="button" id="buyAdd" style="flex:1 1 auto;justify-content:center">
          <svg><use href="#i-plus"></use></svg>ثبت در پرونده
        </button>
      </div>
      <p class="note" id="buyNote"></p>

      <ul class="cert__marks">
        ${p.marks.map(m => `<li><svg><use href="#i-check"></use></svg>${esc(m)}</li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</section>

<section class="act act--tight shell">
  <div class="act__head" data-plot="head">
    <div>
      <div class="act__no"><b>TEST SHEET</b><i>برگهٔ آزمونِ پارت</i> <span class="ltr">${esc(lab.batch)}</span></div>
      <h2 class="act__ttl" style="font-size:clamp(1.4rem,1.05rem+1.6vw,2.2rem)">عددهایی که خودمان اندازه گرفتیم</h2>
    </div>
    <p class="act__say">
      نمونهٔ ده‌عددیِ همین پارت در آزمایشگاه کارخانه آزمایش شده است.
      برگهٔ اصلی با شمارهٔ پارت همراهِ بار تحویل می‌شود.
    </p>
  </div>

  <div class="tests" data-plot-group>
    ${lab.tests.map(t => `
    <div class="test${t.ok ? '' : ' is-note'}">
      <span class="gauge-label fa">${esc(t.k)}</span>
      <b>${esc(t.v)}</b>
      <span class="test__lim">${esc(t.lim)}</span>
      <span class="test__mark">${t.ok ? '<svg><use href="#i-check"></use></svg>در محدوده' : 'ویژگیِ محصول'}</span>
    </div>`).join('')}
  </div>

  <div class="origin">
    <div class="origin__cell"><span class="gauge-label fa">مبدأ خاک</span><b>${esc(lab.mine)}</b></div>
    <div class="origin__cell"><span class="gauge-label fa">برنامهٔ پخت</span><b>${esc(lab.kiln)}</b></div>
    <div class="origin__cell"><span class="gauge-label fa">شمارهٔ پارت</span><b class="mono ltr">${esc(lab.batch)}</b></div>
  </div>
</section>

<section class="act act--tight shell">
  <div class="act__head" data-plot="head">
    <div>
      <div class="act__no"><b>SPECIFICATION</b><i>مشخصاتِ فنی</i></div>
      <h2 class="act__ttl" style="font-size:clamp(1.4rem,1.05rem+1.6vw,2.2rem)">جدولِ مشخصات</h2>
    </div>
  </div>
  <div class="specs">
    ${specs.map(([k, v]) => `<div class="specs__row"><span>${esc(k)}</span><b>${v}</b></div>`).join('\n    ')}
  </div>
</section>

<section class="act act--tight shell">
  <div class="act__head" data-plot="head">
    <div>
      <div class="act__no"><b>NEIGHBOURING CODES</b><i>کدهای هم‌خانواده</i></div>
      <h2 class="act__ttl" style="font-size:clamp(1.4rem,1.05rem+1.6vw,2.2rem)">کنارِ همین برگه در رف</h2>
    </div>
  </div>
  <div class="rack" data-plot-group>
${more.map(x => card(x)).join('\n')}
  </div>
</section>
</main>`;
}

console.log('ساخت صفحه‌های محصول:');
for (const p of PRODUCTS) {
  write(`product-${p.id}.html`, shell({
    title: `${p.name} · ${p.code} · آذرخش`,
    desc: `${p.name} (${p.code}) — ${p.desc} جذب آب ${p.absorb}، مقاومت ${p.strength}. شناسنامهٔ پارت و برگهٔ آزمون.`,
    page: 'product',
    css: ['product.css'],
    attrs: ` data-pid="${p.id}"`,
    js: [{ src: 'product.js', mod: true }],
    body: productPage(p)
  }));
}

console.log('\nساخته شد: index.html · shop.html · ' + PRODUCTS.length + ' صفحهٔ محصول');
