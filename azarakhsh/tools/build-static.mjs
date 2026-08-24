/**
 * آذرخش · ساخت محتوای ثابت
 * ------------------------------------------------------------------
 * محصولات، پروژه‌ها و مقاله‌ها به‌جای تزریق با جاوااسکریپت، مستقیم داخل
 * بدنهٔ HTML نوشته می‌شوند. منبع داده همچنان یکی است:
 *
 *     js/data.js      محصولات، خانواده‌ها، رنگ‌بندی
 *     js/content.js   مقاله‌ها و پروندهٔ پروژه‌ها
 *
 * بعد از هر ویرایش در آن دو فایل، این را اجرا کنید:
 *
 *     node tools/build-static.mjs
 *
 * خروجی:
 *   · بخش‌های حصاردار داخل index.html · shop.html · 404.html · search.html
 *   · صفحهٔ مستقل برای هر محصول، پروژه و مقاله
 *
 * اسکلت مشترک (head، نوار فرمان، پابرگ، …) از index.html خوانده می‌شود،
 * پس این ابزار هیچ‌وقت طراحی را عوض نمی‌کند.
 */
import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');

/* ---------------------- بارگذاری داده‌ها ---------------------- */
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(read('js/data.js') + '\nthis.PRODUCTS=PRODUCTS;this.FAMILIES=FAMILIES;this.TONES=TONES;this.KNOWLEDGE=KNOWLEDGE;this.PROJECTS=PROJECTS;this.VOICES=VOICES;this.FAQS=FAQS;this.TICKER=TICKER;', sandbox);
vm.runInContext(read('js/content.js') + '\nthis.ARTICLES=ARTICLES;this.PROJECTS_FULL=PROJECTS_FULL;this.CATEGORIES=CATEGORIES;this.PROJECT_TYPES=PROJECT_TYPES;', sandbox);
const { PRODUCTS, FAMILIES, TONES, KNOWLEDGE, ARTICLES, PROJECTS_FULL } = sandbox;

/* ------------------------- کمک‌کارها ------------------------- */
const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const fa = v => String(v).replace(/[0-9]/g, d => FA[+d]);
const faNum = n => fa(Math.round(Number(n) || 0).toLocaleString('en-US')).replace(/,/g, '٬');
const toman = n => faNum(n) + ' تومان';
const faFloat = (n, d = 1) => {
  const v = Math.round(Number(n) * 10 ** d) / 10 ** d;
  return Number.isInteger(v) ? fa(v) : fa(v.toFixed(d)).replace('.', '٫');
};
const pad2 = n => fa(String(n).padStart(2, '0'));
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byId = id => PRODUCTS.find(p => p.id === id);

const toneImages = (p, name) => {
  const t = (p.tones || []).find(x => x.name === name);
  const slug = t ? t.file : p.slug;
  return { wall: `assets/products/${slug}-wall.jpg`, single: `assets/products/${slug}-single.jpg` };
};

const WASTE = 1.07;
const estimate = (p, area) => {
  const billed = Math.max(0, area) * WASTE;
  return {
    billed,
    bricks: Math.ceil(billed * p.per),
    pallets: Math.ceil(billed / p.pallet),
    price: Math.round(billed * p.price)
  };
};

const productHref = p => `product-${p.id}.html`;
const projectHref = pr => `project-${pr.id}.html`;
const articleHref = a => `article-${a.slug}.html`;

/* ========================= قالب کارت محصول =========================
   دقیقاً همان نشانه‌گذاری نسخهٔ قبل؛ فقط به‌جای تزریق، نوشته می‌شود. */
function card(p) {
  const im = toneImages(p, p.tones[0].name);
  const flag = p.flag
    ? `<span class="pc__flag${p.flag === 'محدود' || p.flag === 'دست‌ساز' ? ' pc__flag--quiet' : ''}">${esc(p.flag)}</span>`
    : '';
  const was = p.was ? `<s class="pc__was">${faNum(p.was)}</s>` : '';

  return `      <article class="pc" data-id="${p.id}" data-tone="${esc(p.tones[0].name)}"
               data-family="${p.family}" data-price="${p.price}" data-stock="${p.stock === 'موجود در انبار' ? '1' : '0'}"
               data-tones="${esc(p.tones.map(t => t.name).join('|'))}"
               data-search="${esc([p.name, p.code, p.familyLabel, p.desc, (p.keys || []).join(' ')].join(' ').toLowerCase())}">
        <div class="pc__media">
          <a class="pc__open" href="${productHref(p)}" aria-label="برگهٔ کامل ${esc(p.name)}"></a>
          <img class="pc__img pc__img--main" src="${im.wall}" alt="بافت ${esc(p.name)}" loading="lazy" data-slot>
          <img class="pc__img pc__img--alt" src="${im.single}" alt="تک آجر ${esc(p.name)}" loading="lazy" data-slot>
          <span class="pc__shade"></span>
          <span class="pc__sheen"></span>
          <div class="pc__top">
            <span class="pc__idx">${pad2(p.index)}</span>
            <span class="pc__code">${esc(p.code)}</span>
          </div>
          ${flag}
        </div>

        <div class="pc__body">
          <div class="pc__kicker">
            <span>${esc(p.familyLabel)}</span>
            <span class="pc__stock">
              <span class="spark${p.stock === 'موجود در انبار' ? '' : ' spark--dim'}"></span>${esc(p.stock)}
            </span>
          </div>

          <h3 class="pc__name"><a href="${productHref(p)}">${esc(p.name)}</a></h3>
          <p class="pc__desc">${esc(p.desc)}</p>

          <div class="pc__rule"></div>

          <ul class="pc__specs">
            <li><dt>ابعاد</dt><dd>${fa(p.dims)}</dd></li>
            <li><dt>جذب آب</dt><dd>${esc(p.absorb)}</dd></li>
            <li><dt>در هر ${esc(p.unit)}</dt><dd>${esc(p.perLabel)}</dd></li>
          </ul>

          <div class="pc__tones">
            <span class="pc__tones-lab">رنگ‌بندی</span>
${p.tones.map((t, i) => `            <button class="tone${i === 0 ? ' is-on' : ''}" type="button" style="background:${t.hex}" data-tone="${esc(t.name)}" aria-label="رنگ ${esc(t.name)}" title="${esc(t.name)}"></button>`).join('\n')}
          </div>

          <div class="pc__foot">
            <div>
              <span class="pc__price-lab">قیمت هر ${esc(p.unit)} ${was}</span>
              <span class="pc__price-row">
                <span class="pc__price">${faNum(p.price)}</span>
                <span class="pc__unit">تومان</span>
              </span>
            </div>
            <div class="pc__acts">
              <button class="pc__view" type="button" data-view aria-label="نمای سریع ${esc(p.name)}" data-cursor="نمای سریع">
                <svg width="17" height="17"><use href="#i-eye"/></svg>
              </button>
              <button class="pc__add" type="button" data-add>
                <svg width="15" height="15"><use href="#i-plus"/></svg>
                افزودن
              </button>
            </div>
          </div>
        </div>
      </article>`;
}

/* ------------------------- نوشتن در حصار ------------------------- */
function fence(html, name, body) {
  const open = `<!-- az:${name} -->`;
  const close = `<!-- /az:${name} -->`;
  const a = html.indexOf(open);
  const b = html.indexOf(close, a);
  if (a < 0 || b < 0) throw new Error(`حصار «${name}» پیدا نشد`);
  return html.slice(0, a + open.length) + '\n' + body + '\n' + html.slice(b);
}
const grab = (html, name) => {
  const open = `<!-- az:${name} -->`, close = `<!-- /az:${name} -->`;
  const a = html.indexOf(open), b = html.indexOf(close, a);
  if (a < 0 || b < 0) throw new Error(`حصار «${name}» در index.html نیست`);
  return html.slice(a, b + close.length);
};

export { PRODUCTS, FAMILIES, TONES, ARTICLES, PROJECTS_FULL, KNOWLEDGE };
export { fa, faNum, toman, faFloat, pad2, esc, byId, toneImages, estimate };
export { productHref, projectHref, articleHref, card, fence, grab, ROOT, read };

/* ======================= اسکلت صفحه‌های تولیدی ======================= */
const INDEX = read('index.html');
const CHROME = {
  head:    grab(INDEX, 'head'),
  sprite:  grab(INDEX, 'sprite'),
  bar:     grab(INDEX, 'bar'),
  footer:  grab(INDEX, 'footer'),
  dock:    grab(INDEX, 'dock'),
  sheets:  grab(INDEX, 'sheets'),
  overlay: grab(INDEX, 'overlay')
};

function shell({ file, title, desc, page, body, css, js, boot, content, extraBody }) {
  const scripts = [
    '<script type="module" src="js/sl.js"></script>',
    '<script src="vendor/gsap/gsap.min.js"></script>',
    '<script src="vendor/gsap/ScrollTrigger.min.js"></script>',
    '<script src="vendor/lenis/lenis.min.js"></script>',
    '<script src="js/data.js"></script>',
    content ? '<script src="js/content.js"></script>' : null,
    '<script src="js/core.js"></script>',
    '<script src="js/advisor.js"></script>',
    '<script src="js/ui.js"></script>',
    '<script src="js/motion.js"></script>',
    js ? `<script src="js/pages/${js}"></script>` : null
  ].filter(Boolean).join('\n');

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#e6dfd6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0c0b0a" media="(prefers-color-scheme: dark)">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:image" content="assets/intro/gallery-wide.jpg">
<link rel="icon" href="assets/brand/favicon.svg" type="image/svg+xml">

${CHROME.head}
<link rel="stylesheet" href="css/pages.css">
${css ? `<link rel="stylesheet" href="css/pages/${css}">` : ''}
</head>

<body data-page="${page}"${extraBody || ''}>

<div class="film" aria-hidden="true">
  <div class="film__grain"></div>
  <div class="film__vignette"></div>
</div>

<div class="rail-progress" id="railProgress"></div>

<div class="cursor" id="cursor" aria-hidden="true"><span class="cursor__label" id="cursorLabel"></span></div>
<div class="cursor-dot" id="cursorDot" aria-hidden="true"></div>

${CHROME.sprite}

${CHROME.bar}

${body}

${CHROME.footer}

${CHROME.dock}

${CHROME.sheets}

${CHROME.overlay}

${scripts}
<script>
  (function () {
    function boot() {
      AZUI.init();
      AZMotion.start();${boot ? '\n      ' + boot : ''}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  })();
</script>
</body>
</html>
`;
  writeFileSync(join(ROOT, file), html);
  return file;
}

/* =========================== برگهٔ هر محصول =========================== */
function productPage(p) {
  const im = toneImages(p, p.tones[0].name);
  const shots = [im.wall, im.single].concat(
    p.tones.filter(t => t.name !== p.tones[0].name).map(t => toneImages(p, t.name).wall));
  const was = p.was ? `<s class="pdp__was">${faNum(p.was)}</s>` : '';
  const est = estimate(p, 100);

  const rel = PRODUCTS.filter(x => x.id !== p.id && x.family === p.family).slice(0, 3);
  const related = rel.length < 3
    ? rel.concat(PRODUCTS.filter(x => x.id !== p.id && !rel.includes(x)).slice(0, 3 - rel.length))
    : rel;

  const specRows = [
    ['ابعاد', fa(p.dims) + ' میلی‌متر'],
    ['جذب آب', p.absorb],
    ['مقاومت فشاری', fa(p.strength)],
    ['تعداد در هر ' + p.unit, p.perLabel],
    ['وزن', p.weight],
    ['بسته‌بندی', p.pack],
    ['آماده‌سازی', p.lead]
  ];
  const estRows = [
    ['با ۷٪ پرت', faFloat(est.billed) + ' ' + p.unit],
    ['تعداد آجر', faNum(est.bricks) + ' عدد'],
    ['تعداد پالت', faNum(est.pallets) + (p.pallet === 1 ? ' کارتن' : ' پالت')],
    ['برآورد هزینه', toman(est.price)]
  ];
  const row = ([k, v]) => `            <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;

  const body = `<main id="top">

<section class="band pdp-band">
  <div class="shell">
    <nav class="crumbs" aria-label="مسیر">
      <a href="index.html">خانه</a><i>—</i><a href="shop.html">کلکسیون</a><i>—</i>
      <span aria-current="page">${esc(p.name)}</span>
    </nav>

    <div class="pdp">
      <div class="pdp__media">
        <div class="pdp__stage">
          <img id="pdpMain" src="${shots[0]}" alt="${esc(p.name)}" data-slot>
          <span class="pdp__label">اثر ${pad2(p.index)}</span>
        </div>
        <div class="pdp__thumbs" id="pdpThumbs">
${shots.map((src, i) => `          <button class="pdp__thumb${i === 0 ? ' is-on' : ''}" type="button" data-src="${src}" aria-label="تصویر ${fa(i + 1)}">
            <img src="${src}" alt="" data-slot>
          </button>`).join('\n')}
        </div>
      </div>

      <div class="pdp__buy" id="pdpBuy">
        <div>
          <span class="label label--bare">${esc(p.familyLabel)} · ${esc(p.code)}</span>
          <h1 class="pdp__name">${esc(p.name)}</h1>
        </div>
        <p class="pdp__tagline">${esc(p.desc)}</p>

        <div class="pdp__marks">${p.marks.map(m => `<span class="tag">${esc(m)}</span>`).join('')}</div>

        <div class="pc__tones" style="margin:0">
          <span class="pc__tones-lab">رنگ‌بندی</span>
${p.tones.map((t, i) => `          <button class="tone${i === 0 ? ' is-on' : ''}" type="button" style="background:${t.hex}" data-tone="${esc(t.name)}" title="${esc(t.name)}" aria-label="رنگ ${esc(t.name)}"></button>`).join('\n')}
        </div>

        <div class="pdp__pricebox">
          <div>
            <span class="pc__price-lab">قیمت هر ${esc(p.unit)} ${was}</span>
            <span class="pdp__price">${faNum(p.price)} <small>تومان</small></span>
          </div>
          <span class="tag"><span class="spark${p.stock === 'موجود در انبار' ? '' : ' spark--dim'}"></span>${esc(p.stock)}</span>
        </div>

        <div class="pdp__row">
          <div class="stepper">
            <button type="button" data-step="-1" aria-label="کاهش">−</button>
            <input type="number" id="pdpQty" value="1" min="0.5" step="0.5" inputmode="decimal" aria-label="مقدار">
            <button type="button" data-step="1" aria-label="افزایش">+</button>
          </div>
          <button class="btn" type="button" id="pdpAdd" style="flex:1">
            <svg width="16" height="16"><use href="#i-bag"/></svg>
            افزودن به سبد
          </button>
        </div>

        <div class="pdp__notes">
          <div class="pdp__note"><svg width="16" height="16"><use href="#i-shield"/></svg>
            <span>ضمانت کتبی ۲۵ ساله روی رنگ، شوره و پوسته‌شدن سطح</span></div>
          <div class="pdp__note"><svg width="16" height="16"><use href="#i-truck"/></svg>
            <span>آماده‌سازی ${esc(p.lead)} · ارسال رایگان بالای ۳۰۰ متر مربع</span></div>
          <div class="pdp__note"><svg width="16" height="16"><use href="#i-box"/></svg>
            <span>${esc(p.pack)}</span></div>
        </div>

        <button class="btn-ghost btn-wide" type="button" data-ask="دربارهٔ ${esc(p.name)} بیشتر بگو">
          <svg width="16" height="16"><use href="#i-spark"/></svg>
          پرسش از مشاور نما دربارهٔ این کد
        </button>
      </div>
    </div>
  </div>
</section>

<section class="band band--short">
  <div class="shell">
    <div class="with-side">
      <div>
        <span class="label label--ch"><i>۰۱</i>روایت اثر</span>
        <div class="prose" id="pdpStory" style="margin-top:1.2rem">
          <p>${esc(p.story)}</p>
          <h2>کجا خوب می‌نشیند</h2>
          <p>${esc(p.desc)} این کد در خانوادهٔ «${esc(p.familyLabel)}» قرار دارد و با تمام کدهای هم‌خانواده هم‌ابعاد است؛
             یعنی می‌توانید در یک نما ترکیبش کنید بدون اینکه بند و ردیف‌ها به هم بخورد.</p>
          <ul>${p.marks.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
          <blockquote>${esc(KNOWLEDGE.install.replace(/\*\*/g, ''))}</blockquote>
          <h2>پیش از سفارش</h2>
          <p>پیشنهاد ما این است که نمونه را از نزدیک ببینید. جعبهٔ نمونه رایگان است و ظرف ۴۸ ساعت می‌رسد؛
             کنار نمای فعلی بگذارید و در سه ساعت مختلف روز نگاهش کنید.</p>
        </div>
      </div>

      <aside class="side">
        <div class="side__box">
          <h4>برگهٔ فنی</h4>
          <dl class="spec-rows" id="pdpSpecs">
${specRows.map(row).join('\n')}
          </dl>
        </div>
        <div class="side__box noir">
          <h4>برآورد سریع متراژ</h4>
          <label class="pdp__calc">
            <span>مساحت نما (متر مربع)</span>
            <input type="number" id="pdpArea" value="100" min="1" step="1" inputmode="numeric">
          </label>
          <dl class="spec-rows" id="pdpEstimate" style="margin-top:.9rem">
${estRows.map(row).join('\n')}
          </dl>
          <button class="btn btn-wide btn-sm" type="button" id="pdpCalcAdd" style="margin-top:1rem">
            <svg width="15" height="15"><use href="#i-bag"/></svg>
            افزودن این مقدار به سبد
          </button>
        </div>
      </aside>
    </div>
  </div>
</section>

<section class="band band--short">
  <div class="shell">
    <div class="band-head band-head--split">
      <div>
        <span class="label label--ch"><i>۰۲</i>هم‌خانواده‌ها</span>
        <h2 class="h2" style="margin-top:.7rem">شاید این‌ها هم به کارتان بیاید</h2>
      </div>
      <div><a class="link-more" href="shop.html">همهٔ کلکسیون <svg width="16" height="16"><use href="#i-arrow"/></svg></a></div>
    </div>
    <div class="pgrid" id="pdpRelated">
${related.map(card).join('\n')}
    </div>
  </div>
</section>

</main>`;

  return shell({
    file: productHref(p),
    title: `${p.name} | آذرخش`,
    desc: `${p.desc} مشخصات فنی، رنگ‌بندی، قیمت درب کارخانه و برآورد متراژ ${p.name} (${p.code}).`,
    page: 'shop',
    body,
    css: 'product.css',
    js: 'product.js',
    boot: 'AZProduct.init();',
    extraBody: ` data-product="${p.id}"`
  });
}

/* =========================== پروندهٔ هر پروژه =========================== */
function projectPage(pr, idx) {
  const prev = PROJECTS_FULL[(idx - 1 + PROJECTS_FULL.length) % PROJECTS_FULL.length];
  const next = PROJECTS_FULL[(idx + 1) % PROJECTS_FULL.length];
  const row = ([k, v]) => `            <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;

  const body = `<main id="top">

<section class="prj-hero noir">
  <div class="prj-hero__bg"><img src="${pr.cover}" alt="${esc(pr.title)}" data-slot></div>
  <div class="prj-hero__scrim"></div>
  <div class="shell prj-hero__in">
    <nav class="crumbs" aria-label="مسیر">
      <a href="index.html">خانه</a><i>—</i><a href="projects.html">پروژه‌ها</a><i>—</i>
      <span aria-current="page">${esc(pr.title)}</span>
    </nav>
    <span class="label label--bare">${esc(pr.city)} · ${esc(pr.type)} · ${esc(pr.year)}</span>
    <h1 class="display">${esc(pr.title)}</h1>
    <p class="lede">${esc(pr.brief)}</p>
  </div>
</section>

<div class="stat-row">
${[[pr.area, 'متراژ نما'], [pr.year, 'سال اجرا'], [pr.duration, 'مدت اجرا'], [pr.city, 'موقعیت']]
  .map(([b, s]) => `  <div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('\n')}
</div>

<section class="band band--short">
  <div class="shell">
    <div class="with-side">
      <div class="prose">
        <h2>صورت مسئله</h2><p>${esc(pr.brief)}</p>
        <h2>چالش اجرا</h2><p>${esc(pr.challenge)}</p>
        <h2>نتیجه</h2><p>${esc(pr.result)}</p>
      </div>
      <aside class="side">
        <div class="side__box">
          <h4>شناسنامهٔ پروژه</h4>
          <dl class="spec-rows">
${[['کارفرما', pr.client], ['معمار', pr.architect], ['متراژ', pr.area],
   ['سال', pr.year], ['مدت اجرا', pr.duration], ['کاربری', pr.type]].map(row).join('\n')}
          </dl>
        </div>
        <div class="side__box">
          <h4>آجرهای استفاده‌شده</h4>
          <div class="side__list">
${pr.codes.map(c => { const p = byId(c); return p ? `            <a href="${productHref(p)}">${esc(p.name)} — ${esc(p.code)}</a>` : ''; }).filter(Boolean).join('\n')}
          </div>
        </div>
      </aside>
    </div>
  </div>
</section>

<section class="band band--short">
  <div class="shell">
    <div class="band-head"><span class="label label--ch"><i>۰۲</i>قاب‌های پروژه</span></div>
    <div class="gal" id="prjGallery">
${pr.shots.map((src, i) => `      <button class="gal__i${i === 0 ? ' gal__i--tall' : ''}" type="button" data-src="${src}" data-title="${esc(pr.title)}" data-meta="${esc(pr.city + ' · ' + pr.area)}" data-cursor="بزرگ‌نمایی">
        <img src="${src}" alt="${esc(pr.title)}" loading="lazy" data-slot>
      </button>`).join('\n')}
    </div>
  </div>
</section>

<section class="band band--short">
  <div class="shell">
    <div class="prj-quote noir" data-in>
      <svg width="26" height="26"><use href="#i-quote"/></svg>
      <p>«${esc(pr.quote)}»</p>
      <span>${esc(pr.quoteBy)}</span>
    </div>
  </div>
</section>

<section class="band band--short">
  <div class="shell">
    <div class="prj-nav">
      <a href="${projectHref(prev)}">
        <svg width="18" height="18"><use href="#i-arrow"/></svg>
        <div><span>پروژهٔ قبلی</span><b>${esc(prev.title)}</b></div>
      </a>
      <a class="is-next" href="${projectHref(next)}">
        <svg width="18" height="18"><use href="#i-arrow"/></svg>
        <div><span>پروژهٔ بعدی</span><b>${esc(next.title)}</b></div>
      </a>
    </div>
  </div>
</section>

</main>`;

  return shell({
    file: projectHref(pr),
    title: `${pr.title} | آذرخش`,
    desc: `${pr.brief} ${pr.city}، ${pr.area}، سال ${pr.year}.`,
    page: 'projects',
    body,
    css: 'project.css',
    js: 'project.js',
    boot: 'AZProject.init();',
    content: false
  });
}

/* =========================== برگهٔ هر مقاله =========================== */
const slugifyHead = s => 'h-' + String(s).trim().replace(/\s+/g, '-').replace(/[^؀-ۿ\w-]/g, '');

function articlePage(a) {
  const block = b => {
    if (b.t === 'h2') return `          <h2 id="${slugifyHead(b.v)}">${esc(b.v)}</h2>`;
    if (b.t === 'h3') return `          <h3>${esc(b.v)}</h3>`;
    if (b.t === 'ul') return `          <ul>${b.v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    if (b.t === 'quote') return `          <blockquote>${esc(b.v)}</blockquote>`;
    if (b.t === 'fig') return `          <figure><img src="${b.v}" alt="${esc(b.cap || '')}" loading="lazy" data-slot>\n            <figcaption>${esc(b.cap || '')}</figcaption></figure>`;
    return `          <p>${esc(b.v)}</p>`;
  };
  const heads = a.body.filter(b => b.t === 'h2');
  const rel = ARTICLES.filter(x => x.slug !== a.slug && x.cat === a.cat)
    .concat(ARTICLES.filter(x => x.slug !== a.slug && x.cat !== a.cat)).slice(0, 3);

  const body = `<main id="top">

<div class="read-bar" id="readBar" aria-hidden="true"></div>

<section class="art-hero noir">
  <div class="art-hero__bg"><img src="${a.cover}" alt="${esc(a.title)}" data-slot></div>
  <div class="art-hero__scrim"></div>
  <div class="shell art-hero__in">
    <nav class="crumbs" aria-label="مسیر">
      <a href="index.html">خانه</a><i>—</i><a href="blog.html">دفترچهٔ نما</a><i>—</i>
      <span aria-current="page">${esc(a.title)}</span>
    </nav>
    <span class="label label--bare">${esc(a.catLabel)}</span>
    <h1>${esc(a.title)}</h1>
    <div class="art-meta">
      <span><svg width="15" height="15"><use href="#i-user"/></svg>${esc(a.author)}</span>
      <span><svg width="15" height="15"><use href="#i-clock"/></svg>${esc(a.date)}</span>
      <span><svg width="15" height="15"><use href="#i-doc"/></svg>${fa(a.mins)} دقیقه خواندن</span>
    </div>
  </div>
</section>

<section class="band band--short">
  <div class="shell">
    <div class="with-side">
      <div>
        <p class="art-lead">${esc(a.excerpt)}</p>
        <div class="prose" id="artBody">
${a.body.map(block).join('\n')}
        </div>

        <div class="art-share">
          <span>هم‌رسانی</span>
          <button class="btn-round" type="button" id="artCopy" aria-label="کپی نشانی">
            <svg width="17" height="17"><use href="#i-link"/></svg>
          </button>
          <a class="btn-round" id="artTg" href="#" target="_blank" rel="noopener" aria-label="تلگرام">
            <svg width="17" height="17"><use href="#i-telegram"/></svg>
          </a>
          <a class="btn-round" id="artWa" href="#" target="_blank" rel="noopener" aria-label="واتساپ">
            <svg width="17" height="17"><use href="#i-whatsapp"/></svg>
          </a>
        </div>

        <div class="art-author">
          <span class="art-author__av">${esc(a.author.trim().charAt(0))}</span>
          <div><b>${esc(a.author)}</b><span>${esc(a.role)}</span></div>
        </div>
      </div>

      <aside class="side">
        <div class="side__box">
          <h4>در این مقاله</h4>
          <nav class="toc" id="artToc">
${heads.length ? heads.map(h => `            <a href="#${slugifyHead(h.v)}">${esc(h.v)}</a>`).join('\n') : '            <span class="small">این مقاله سرفصل ندارد.</span>'}
          </nav>
        </div>
        <div class="side__box noir">
          <h4>پرسشی دارید؟</h4>
          <p class="small" style="margin-bottom:1rem">مشاور نما همین‌جا جواب می‌دهد؛ رنگ پیشنهاد می‌دهد و متراژ حساب می‌کند.</p>
          <button class="btn btn-wide btn-sm" type="button" data-open-advisor>
            <svg width="15" height="15"><use href="#i-spark"/></svg>
            شروع گفتگو
          </button>
        </div>
      </aside>
    </div>
  </div>
</section>

<section class="band band--short">
  <div class="shell">
    <div class="band-head"><span class="label label--ch"><i>۰۲</i>خواندنی‌های مرتبط</span></div>
    <div class="grid-3">
${rel.map(x => `      <article class="tile post">
        <a class="tile__link" href="${articleHref(x)}" aria-label="${esc(x.title)}"></a>
        <div class="tile__media"><span class="tile__tag">${esc(x.catLabel)}</span>
          <img src="${x.cover}" alt="${esc(x.title)}" loading="lazy" data-slot></div>
        <div class="tile__body">
          <div class="tile__kicker"><b>${esc(x.date)}</b><span>·</span><span>${fa(x.mins)} دقیقه</span></div>
          <h3>${esc(x.title)}</h3>
          <p>${esc(x.excerpt)}</p>
        </div>
      </article>`).join('\n')}
    </div>
  </div>
</section>

</main>`;

  return shell({
    file: articleHref(a),
    title: `${a.title} | دفترچهٔ نما`,
    desc: a.excerpt,
    page: 'blog',
    body,
    css: 'article.css',
    js: 'article.js',
    boot: 'AZArticle.init();'
  });
}

/* ==================== بخش‌های حصاردار صفحه‌های فهرست ==================== */
function patch(file, blocks) {
  let html = read(file);
  for (const [name, body] of Object.entries(blocks)) html = fence(html, name, body);
  writeFileSync(join(ROOT, file), html);
  return file;
}

const famButtons = () => FAMILIES.map(f => {
  const n = f.id === 'all' ? PRODUCTS.length : PRODUCTS.filter(p => p.family === f.id).length;
  return `        <button class="shop__fam${f.id === 'all' ? ' is-on' : ''}" type="button" data-family="${f.id}">${esc(f.label)}<i>${fa(n)}</i></button>`;
}).join('\n');

const toneButtons = () => TONES.map(t =>
  `        <button class="shop__tone" type="button" style="background:${t.hex}" data-tone="${esc(t.name)}" title="${esc(t.name)}" aria-label="رنگ ${esc(t.name)}"></button>`).join('\n');

const chipFilters = () => FAMILIES.map(f => {
  const n = f.id === 'all' ? PRODUCTS.length : PRODUCTS.filter(p => p.family === f.id).length;
  return `      <button class="filter${f.id === 'all' ? ' is-on' : ''}" type="button" data-family="${f.id}">${esc(f.label)}<i>${fa(n)}</i></button>`;
}).join('\n');

const railItems = () => PRODUCTS.map(p =>
  `    <div class="rail__item" data-family="${p.family}">\n${card(p)}\n    </div>`).join('\n');

/* ردیف‌های جست‌وجو: محصول، پروژه، مقاله — همه در بدنهٔ صفحه */
function searchRows() {
  const rows = [];
  const push = (kind, title, text, meta, img, href) => rows.push(
    `      <div class="srch-row" data-kind="${kind}" data-search="${esc((title + ' ' + text).toLowerCase())}">
        <a class="stretch" href="${href}" aria-label="${esc(title)}"></a>
        <span class="srch-row__img"><img src="${img}" alt="" loading="lazy" data-slot></span>
        <div>
          <b data-title>${esc(title)}</b>
          <p>${esc(text.slice(0, 120))}</p>
          <div class="srch-row__meta">${esc(meta)}</div>
        </div>
      </div>`);

  PRODUCTS.forEach(p => push('product', p.name,
    [p.desc, p.code, p.familyLabel, (p.keys || []).join(' ')].join(' '),
    `${p.code} · ${faNum(p.price)} تومان`, toneImages(p, p.tones[0].name).wall, productHref(p)));

  PROJECTS_FULL.forEach(pr => push('project', pr.title,
    [pr.brief, pr.city, pr.type, pr.architect, pr.client].join(' '),
    `${pr.city} · ${pr.area} · ${pr.year}`, pr.cover, projectHref(pr)));

  ARTICLES.forEach(a => push('article', a.title,
    [a.excerpt, a.catLabel, a.author, (a.tags || []).join(' ')].join(' '),
    `${a.catLabel} · ${a.date}`, a.cover, articleHref(a)));

  const groups = [
    ['product', 'محصولات'],
    ['project', 'پروژه‌ها'],
    ['article', 'مقاله‌ها']
  ];
  return groups.map(([kind, label]) => `      <section class="srch-group" data-group="${kind}" hidden>
        <h2>${label} <i data-count>۰ نتیجه</i></h2>
${rows.filter(r => r.includes(`data-kind="${kind}"`)).join('\n')}
      </section>`).join('\n');
}


/* ------------------- صحنهٔ هیرو، پروژه‌ها و وبلاگ ------------------- */
function stageBlock() {
  const p = PRODUCTS[0];
  const im = toneImages(p, p.tones[0].name);
  return `        <div class="stage__card">
          <a class="stage__frame" href="${productHref(p)}" data-cursor="جزئیات" aria-label="برگهٔ ${esc(p.name)}">
            <img src="${im.wall}" alt="${esc(p.name)}" data-slot>
            <span class="stage__glow"></span>
          </a>
        </div>
        <div class="stage__label">
          <div class="stage__name">${esc(p.name)}</div>
          <div class="stage__meta">${esc(p.code)} · ${esc(p.familyLabel)}</div>
          <div class="stage__price">${faNum(p.price)} <small>تومان / ${esc(p.unit)}</small></div>
        </div>`;
}

const projectTypes = () => ['همه', ...new Set(PROJECTS_FULL.map(p => p.type))].map((t, i) =>
  `        <button class="chip${i === 0 ? ' is-on' : ''}" type="button" data-type="${esc(t)}">${esc(t)}</button>`).join('\n');

const projectTiles = () => PROJECTS_FULL.map(pr => {
  const codes = pr.codes.map(c => (byId(c) || {}).code).filter(Boolean).join(' · ');
  return `      <article class="tile prj-card" data-type="${esc(pr.type)}">
        <a class="tile__link" href="${projectHref(pr)}" aria-label="${esc(pr.title)}"></a>
        <div class="tile__media">
          <span class="tile__tag">${esc(pr.type)}</span>
          <img src="${pr.cover}" alt="${esc(pr.title)}" loading="lazy" data-slot>
        </div>
        <div class="tile__body">
          <div class="tile__kicker"><b>${esc(pr.city)}</b><span>·</span><span>${esc(pr.year)}</span></div>
          <h3>${esc(pr.title)}</h3>
          <p>${esc(pr.brief)}</p>
          <div class="tile__foot">
            <span class="prj-meta">
              <span><svg width="13" height="13"><use href="#i-grid"/></svg>${esc(pr.area)}</span>
            </span>
            <span class="ltr" style="font-size:.72rem">${esc(codes)}</span>
          </div>
        </div>
      </article>`;
}).join('\n');

const blogCats = () => sandbox.CATEGORIES.map((c, i) =>
  `        <button class="chip${i === 0 ? ' is-on' : ''}" type="button" data-cat="${c.id}">${esc(c.label)}</button>`).join('\n');

function featureBlock() {
  const a = ARTICLES[0];
  return `      <a class="feature__link" href="${articleHref(a)}" aria-label="${esc(a.title)}"></a>
      <div class="feature__media"><img src="${a.cover}" alt="${esc(a.title)}" data-slot></div>
      <div class="feature__body">
        <span class="label label--bare">تازه‌ترین · ${esc(a.catLabel)}</span>
        <h2>${esc(a.title)}</h2>
        <p>${esc(a.excerpt)}</p>
        <div class="feature__foot">
          <span>${esc(a.author)}</span><span>·</span><span>${esc(a.date)}</span>
          <span>·</span><span>${fa(a.mins)} دقیقه خواندن</span>
        </div>
      </div>`;
}

const postTiles = () => ARTICLES.map((a, i) => `      <article class="tile post" data-cat="${a.cat}" data-feature="${i === 0 ? '1' : '0'}"
               data-search="${esc([a.title, a.excerpt, a.catLabel, a.author, (a.tags || []).join(' ')].join(' ').toLowerCase())}">
        <a class="tile__link" href="${articleHref(a)}" aria-label="${esc(a.title)}"></a>
        <div class="tile__media">
          <span class="tile__tag">${esc(a.catLabel)}</span>
          <img src="${a.cover}" alt="${esc(a.title)}" loading="lazy" data-slot>
        </div>
        <div class="tile__body">
          <div class="tile__kicker"><b>${esc(a.date)}</b><span>·</span><span>${fa(a.mins)} دقیقه</span></div>
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.excerpt)}</p>
          <div class="tile__foot">
            <span>${esc(a.author)}</span>
            <span class="link-more">خواندن <svg width="15" height="15"><use href="#i-arrow"/></svg></span>
          </div>
        </div>
      </article>`).join('\n');


/* --------- گزینه‌های محاسبه‌گر، گالری، نظرها، پرسش‌ها و تیکر --------- */
const calcOptions = () => PRODUCTS.map(p =>
  `            <sl-option value="${p.id}">${esc(p.name)} · ${esc(p.code)}</sl-option>`).join('\n');

const galleryItems = () => sandbox.PROJECTS.map((pr, i) => {
  const mod = i === 0 ? ' gal__i--tall' : (i === 4 ? ' gal__i--wide' : '');
  return `      <button class="gal__i${mod}" type="button" data-src="${pr.file}" data-title="${esc(pr.title)}" data-meta="${esc(pr.meta)}" data-cursor="بزرگ‌نمایی">
        <img src="${pr.file}" alt="${esc(pr.title)}" loading="lazy" data-slot>
        <span class="gal__cap"><b>${esc(pr.title)}</b><span>${esc(pr.meta)}</span></span>
      </button>`;
}).join('\n');

const voiceFigures = () => sandbox.VOICES.map((v, i) => `      <figure class="voice${i === 0 ? ' is-on' : ''}">
        <p>«${esc(v.text)}»</p>
        <figcaption class="voice__who">
          <span class="voice__av">${esc(v.name.trim().charAt(0))}</span>
          <span><b>${esc(v.name)}</b><span>${esc(v.role)}</span></span>
        </figcaption>
      </figure>`).join('\n');

const voiceDots = () => sandbox.VOICES.map((_, i) =>
  `      <button type="button" class="${i === 0 ? 'is-on' : ''}" aria-label="نظر ${fa(i + 1)}"></button>`).join('\n');

const faqItems = () => sandbox.FAQS.map((f, i) => `          <sl-details ${i === 0 ? 'open ' : ''}summary="${esc(f.q)}">
            <p class="small">${esc(f.a)}</p>
          </sl-details>`).join('\n');

const tickerItems = () => {
  const row = sandbox.TICKER.map(t => `<span class="tick">${esc(t)}</span>`).join('');
  return '  ' + row + row;
};

/* =============================== اجرا =============================== */
const written = [];

written.push(patch('index.html', {
  rail: railItems(),
  filters: chipFilters(),
  stage: stageBlock(),
  calcopts: calcOptions(),
  gallery: galleryItems(),
  voices: voiceFigures(),
  voicenav: voiceDots(),
  faq: faqItems(),
  ticker: tickerItems()
}));

written.push(patch('projects.html', {
  prjtypes: projectTypes(),
  prjgrid: projectTiles()
}));

written.push(patch('blog.html', {
  blogcats: blogCats(),
  feature: featureBlock(),
  bloggrid: postTiles()
}));

written.push(patch('shop.html', {
  grid: PRODUCTS.map(card).join('\n'),
  fams: famButtons(),
  tones: toneButtons()
}));

written.push(patch('404.html', {
  picks: ['r110', 'w220', 'k410'].map(id => card(byId(id))).join('\n')
}));

written.push(patch('search.html', { rows: searchRows() }));

PRODUCTS.forEach(p => written.push(productPage(p)));
PROJECTS_FULL.forEach((pr, i) => written.push(projectPage(pr, i)));
ARTICLES.forEach(a => written.push(articlePage(a)));

/* صفحه‌های قدیمیِ پارامتری دیگر لازم نیستند */
['product.html', 'project.html', 'article.html'].forEach(f => {
  const p = join(ROOT, f);
  if (existsSync(p)) { unlinkSync(p); console.log('· حذف شد:', f); }
});

console.log(`\n${written.length} فایل ساخته یا به‌روز شد.`);
console.log(`  محصولات: ${PRODUCTS.length} · پروژه‌ها: ${PROJECTS_FULL.length} · مقاله‌ها: ${ARTICLES.length}`);
