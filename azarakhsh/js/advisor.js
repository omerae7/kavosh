/* =========================================================================
   آذرخش · مشاور نما
   موتور گفتگوی محلی: تشخیص قصد، پیشنهاد رنگ، محاسبهٔ متراژ و افزودن به سبد.
   کاملاً آفلاین کار می‌کند و هیچ داده‌ای جایی فرستاده نمی‌شود.
   ========================================================================= */
(function () {
  'use strict';

  const { $, $$, fa, en, faNum, toman, faFloat, byId, toneImages,
          wireImages, esc, Cart, estimate, numbersIn, toast } = AZ;

  const KEY = 'azarakhsh-chat-v2';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* حافظهٔ کوتاه‌مدت گفتگو */
  const memory = { lastProducts: [], lastArea: 0, greeted: false };

  /* ---------------------- نرمال‌سازی متن فارسی ---------------------- */
  function norm(s) {
    return en(String(s || ''))
      .replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک')
      .replace(/[‌‏‎]/g, ' ')
      .replace(/[ًٌٍَُِّْ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const hits = (text, words) => words.filter(w => text.includes(w)).length;

  /* ----------------------------- دانش رنگ --------------------------- */
  const COLOUR_MAP = [
    { keys: ['سفید', 'شیری', 'کرم روشن', 'روشن'], ids: ['w220', 'y150'] },
    { keys: ['مشکی', 'سیاه', 'زغالی'],            ids: ['d620', 'g330'] },
    { keys: ['طوسی', 'خاکستری', 'دودی', 'نقره'],  ids: ['g330', 'd620'] },
    { keys: ['قرمز', 'آجری', 'نارنجی'],           ids: ['r110', 'k410'] },
    { keys: ['قهوه', 'شکلات', 'کاکائو'],          ids: ['b140', 'k410'] },
    { keys: ['زرد', 'کهربا', 'طلایی', 'خردلی'],   ids: ['y150', 'r110'] }
  ];

  const STYLE_MAP = [
    { keys: ['مدرن', 'مینیمال', 'ساده', 'امروزی', 'شیک'], ids: ['w220', 'd620', 'g330'],
      note: 'برای نمای مدرن، رنگ‌های خنثی با بند نازک بهترین نتیجه را می‌دهند.' },
    { keys: ['کلاسیک', 'سنتی', 'قدیمی', 'رومی'],          ids: ['r110', 'k410', 'b140'],
      note: 'برای حال‌وهوای کلاسیک، ته‌رنگ گرم و بند پهن‌تر پیشنهاد می‌شود.' },
    { keys: ['ویلا', 'باغ', 'جنگلی', 'شمال'],             ids: ['b140', 'k410', 'y150'],
      note: 'در فضای سبز، رنگ گرم و تیره با چوب و سنگ خیلی خوب می‌نشیند.' },
    { keys: ['برج', 'اداری', 'تجاری', 'مجتمع'],           ids: ['g330', 'w220', 'd620'],
      note: 'برای حجم‌های بزرگ، رنگ خنثی نما را آرام و یکدست نگه می‌دارد.' },
    { keys: ['بازساز', 'تعمیر', 'روکش', 'قدیمی ساز'],     ids: ['p510', 'k410'],
      note: 'در بازسازی معمولاً وزن و زمان مهم است؛ پلاک نازک هر دو را حل می‌کند.' },
    { keys: ['حیاط', 'محوطه', 'تراس', 'پیاده', 'کف'],     ids: ['f810', 'l710'],
      note: 'برای کف، ضخامت ۲۵ میلی‌متر و سطح ضدسایش لازم است.' }
  ];

  /* ------------------------- قالب پاسخ متن ------------------------- */
  const md = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');

  const list = arr => '<ul>' + arr.map(x => '<li>' + md(x) + '</li>').join('') + '</ul>';

  const priceLine = p => `${faNum(p.price)} تومان / ${p.unit}`;

  /* =========================== موتور پاسخ ========================== */
  function respond(raw) {
    const t = norm(raw);
    const nums = numbersIn(raw);

    /* --- احوال‌پرسی --- */
    if (hits(t, ['سلام', 'درود', 'وقت بخیر', 'خسته نباشید']) && t.length < 30) {
      memory.greeted = true;
      return {
        text: 'سلام، خوش آمدید 🙂\nمن مشاور نمای آذرخش هستم. می‌توانم در انتخاب رنگ، محاسبهٔ متراژ و برآورد هزینه کمکتان کنم.\nاز کجا شروع کنیم؟',
        chips: ['برای نمای مدرن چه رنگی؟', 'متراژ نمای من چقدر آجر می‌خواهد؟', 'ارزان‌ترین گزینه کدام است؟']
      };
    }

    if (hits(t, ['ممنون', 'مرسی', 'سپاس', 'لطف کرد', 'دمت گرم'])) {
      return {
        text: 'خواهش می‌کنم. اگر خواستید همین‌جا سفارش را ثبت کنید یا جعبهٔ نمونهٔ رایگان بگیرید، بگویید.',
        chips: ['نمونهٔ رایگان می‌خواهم', 'سبد سفارشم را ببین', 'شمارهٔ تماس کارخانه']
      };
    }

    /* --- محاسبهٔ متراژ: دو عدد یا بیشتر، یا واژه‌های محاسبه --- */
    const wantsCalc = hits(t, ['محاسبه', 'متراژ', 'چقدر آجر', 'چند تا', 'چند عدد', 'چند متر',
                               'مقدار', 'حساب کن', 'براورد', 'برآورد']) > 0;
    const looksLikeDims = nums.length >= 2 && nums[0] > 0.5 && nums[0] < 200 && nums[1] > 0.5 && nums[1] < 60;

    if (wantsCalc || looksLikeDims) {
      if (looksLikeDims) {
        const w = nums[0], h = nums[1];
        const target = matchProduct(t) || byId(memory.lastProducts[0]) || byId('r110');
        const est = estimate({ product: target, width: w, height: h, openings: nums[2] > 0 && nums[2] <= 80 ? nums[2] : 15 });
        memory.lastArea = est.billed;
        memory.lastProducts = [target.id];
        return {
          text: `برای دیوار **${faFloat(w)} × ${faFloat(h)} متر** با احتساب **۱۵٪ بازشو** و **۷٪ پرت اجرا**:\n` +
            list([
              `مساحت خالص: **${faFloat(est.area)} متر مربع**`,
              `تعداد آجر ${target.code}: **${faNum(est.bricks)} عدد**`,
              `تعداد پالت: **${faNum(est.pallets)}**`,
              `وزن بار: **${est.weight >= 1000 ? faFloat(est.weight / 1000) + ' تن' : faNum(est.weight) + ' کیلوگرم'}**`
            ]) +
            `<br>برآورد هزینهٔ آجر درب کارخانه: **${toman(est.price)}**\n` +
            `اگر درصد بازشوی نمای شما فرق دارد، عدد دقیق را بگویید تا دوباره حساب کنم.`,
          cards: [target.id],
          add: { id: target.id, qty: Math.round(est.billed * 2) / 2, label: `افزودن ${faFloat(est.billed)} ${target.unit} به سبد` },
          chips: ['با کد سفید حساب کن', 'بازشو ۲۵ درصد است', 'هزینهٔ باربری چقدر است؟']
        };
      }
      return {
        text: 'ابعاد دیوار را بگویید تا دقیق حساب کنم؛ مثلاً بنویسید **۱۲ در ۳** یعنی دوازده متر طول و سه متر ارتفاع.\nاگر درصد بازشو (پنجره و در) را هم بدانید، عدد سوم را اضافه کنید.',
        chips: ['۱۲ در ۳', '۲۵ در ۳٫۲ با ۲۰ درصد بازشو', 'محاسبه‌گر کامل را باز کن'],
        action: nums.length === 1 ? null : 'calc'
      };
    }

    /* --- بودجه --- */
    if (hits(t, ['بودجه', 'ارزان', 'اقتصادی', 'کم هزینه', 'مقرون'])) {
      const cheap = PRODUCTS.slice().sort((a, b) => a.price - b.price).slice(0, 3);
      memory.lastProducts = cheap.map(p => p.id);
      return {
        text: 'اگر بودجه تعیین‌کننده است، این سه گزینه بهترین نسبت قیمت به دوام را دارند:\n' +
          list(cheap.map(p => `**${p.name}** — ${priceLine(p)}`)) +
          '<br>نکته: پلاک نازک هزینهٔ اجرا را هم کم می‌کند چون داربست و ملات کمتری می‌خواهد.',
        cards: cheap.map(p => p.id),
        chips: ['تفاوت پلاک با نسوز چیست؟', 'برای این متراژ چقدر می‌شود؟', 'نمونهٔ رایگان می‌خواهم']
      };
    }

    /* --- محصول مشخص --- */
    const direct = matchProduct(t);
    if (direct && hits(t, ['قیمت', 'چند', 'مشخصات', 'درباره', 'توضیح', 'چیه', 'چطور']) > 0) {
      memory.lastProducts = [direct.id];
      return {
        text: `**${direct.name}** (${direct.code})\n${direct.story}\n` +
          list([
            `قیمت: **${priceLine(direct)}**`,
            `ابعاد: **${fa(direct.dims)} میلی‌متر**`,
            `جذب آب: **${direct.absorb}** · مقاومت: **${fa(direct.strength)}**`,
            `آماده‌سازی: **${direct.lead}**`
          ]),
        cards: [direct.id],
        add: { id: direct.id, qty: 1, label: 'افزودن به سبد' },
        chips: ['رنگ‌بندی‌اش چیست؟', 'برای متراژ من چقدر می‌شود؟', 'یک گزینهٔ دیگر پیشنهاد بده']
      };
    }

    /* --- پیشنهاد بر اساس سبک --- */
    for (const s of STYLE_MAP) {
      if (hits(t, s.keys)) {
        memory.lastProducts = s.ids;
        const items = s.ids.map(byId);
        return {
          text: `${s.note}\nاز کدهای ما این‌ها را پیشنهاد می‌کنم:\n` +
            list(items.map(p => `**${p.name}** — ${p.desc}`)),
          cards: s.ids,
          chips: ['نمونهٔ رایگان این‌ها را بفرست', 'قیمتشان چقدر است؟', 'کدام یکی دوام بیشتری دارد؟']
        };
      }
    }

    /* --- پیشنهاد بر اساس رنگ --- */
    for (const c of COLOUR_MAP) {
      if (hits(t, c.keys)) {
        memory.lastProducts = c.ids;
        const items = c.ids.map(byId);
        return {
          text: `برای این طیف رنگی این کدها را داریم:\n` +
            list(items.map(p => `**${p.name}** (${p.code}) — ${priceLine(p)}`)) +
            `<br>پیشنهاد جدی من: رنگ را از روی نمایشگر انتخاب نکنید. جعبهٔ نمونه رایگان است و در دو روز به دستتان می‌رسد.`,
          cards: c.ids,
          chips: ['نمونهٔ رایگان می‌خواهم', 'رنگ بند چه باشد؟', 'کدام برای نمای شمالی بهتر است؟']
        };
      }
    }

    /* --- پرسش‌های دانشی --- */
    const facts = [
      { keys: ['ارسال', 'باربری', 'حمل', 'پست', 'تحویل', 'کرایه', 'چند روز'], k: 'delivery',
        chips: ['هزینهٔ باربری چقدر است؟', 'به کرج هم می‌فرستید؟', 'سفارش را ثبت کنیم'] },
      { keys: ['ضمانت', 'گارانتی', 'تضمین'], k: 'warranty',
        chips: ['اگر شوره بزند چه می‌شود؟', 'برگهٔ آزمون دارید؟', 'یک رنگ پیشنهاد بده'] },
      { keys: ['نمونه', 'ببینم', 'لمس', 'حضوری'], k: 'sample',
        chips: ['سه کد پیشنهاد بده', 'چطور سفارش بدهم؟', 'شمارهٔ کارخانه'] },
      { keys: ['پرداخت', 'تسویه', 'فاکتور', 'پیش پرداخت', 'قسط', 'چک'], k: 'payment',
        chips: ['سفارش را ثبت کنیم', 'حداقل سفارش چقدر است؟'] },
      { keys: ['اجرا', 'نصب', 'ملات', 'چسب', 'بنا', 'کارگر', 'داربست'], k: 'install',
        chips: ['بند چند میلی‌متر باشد؟', 'اکیپ اجرا معرفی می‌کنید؟'] },
      { keys: ['استاندارد', 'ازمون', 'مقاومت', 'جذب اب', 'یخبندان', 'کیفیت', 'فنی'], k: 'standard',
        chips: ['تفاوت نسوز با نمای معمولی', 'برگهٔ فنی را نشانم بده'] },
      { keys: ['تفاوت', 'فرق', 'مقایسه', 'بهتره', 'کدوم بهتر'], k: 'difference',
        chips: ['برای اقلیم سرد کدام؟', 'قیمتشان چقدر فرق دارد؟'] },
      { keys: ['سفارشی', 'اختصاصی', 'رنگ خاص', 'مخصوص'], k: 'custom',
        chips: ['حداقل سفارش چقدر است؟', 'چقدر طول می‌کشد؟'] },
      { keys: ['پرت', 'اضافه بیار', 'ضایعات'], k: 'waste',
        chips: ['متراژ من را حساب کن'] },
      { keys: ['بند', 'بندکشی', 'دوغاب', 'درز'], k: 'joint',
        chips: ['رنگ بند برای آجر سفید؟', 'متراژ من را حساب کن'] }
    ];

    for (const f of facts) {
      if (hits(t, f.keys)) {
        return { text: KNOWLEDGE[f.k], chips: f.chips };
      }
    }

    /* --- قیمت کلی --- */
    if (hits(t, ['قیمت', 'هزینه', 'چنده', 'نرخ', 'گران'])) {
      const lo = PRODUCTS.reduce((a, b) => a.price < b.price ? a : b);
      const hi = PRODUCTS.reduce((a, b) => a.price > b.price ? a : b);
      return {
        text: `قیمت‌ها درب کارخانه و برای هر ${lo.unit} نمای اجراشده است و از **${faNum(lo.price)}** تا **${faNum(hi.price)} تومان** متغیر است.\n` +
          `ارزان‌ترین: **${lo.name}** · گران‌ترین: **${hi.name}**\n` +
          `اگر متراژ نما را بگویید، عدد نهایی را برایتان حساب می‌کنم.`,
        cards: [lo.id, hi.id],
        chips: ['۱۲ در ۳', 'ارزان‌ترین گزینه‌ها را نشانم بده', 'هزینهٔ باربری چقدر است؟']
      };
    }

    /* --- سبد و سفارش --- */
    if (hits(t, ['سبد', 'سفارش', 'خرید', 'ثبت کن', 'فاکتور بده'])) {
      const tot = Cart.totals();
      if (!tot.rows) {
        return {
          text: 'سبد سفارش شما هنوز خالی است. اگر بگویید چه رنگی می‌خواهید یا متراژ نما چقدر است، همین‌جا برایتان اضافه می‌کنم.',
          chips: ['برای نمای مدرن چه رنگی؟', '۱۲ در ۳', 'ارزان‌ترین گزینه']
        };
      }
      return {
        text: `در سبد شما **${fa(tot.rows)} قلم** به ارزش **${toman(tot.sum)}** ثبت شده است.\nبرای دریافت پیش‌فاکتور رسمی، سبد را باز کنید و اطلاعات تماس را وارد کنید.`,
        action: 'cart',
        chips: ['هزینهٔ باربری چقدر است؟', 'نحوهٔ پرداخت چگونه است؟']
      };
    }

    /* --- تماس --- */
    if (hits(t, ['تماس', 'شماره', 'تلفن', 'ادرس', 'کارخانه کجا', 'واتساپ', 'کارشناس'])) {
      return {
        text: 'شمارهٔ کارخانه: **۰۴۱-۳۳۸۲۱۱۴۰** (شنبه تا چهارشنبه ۸ تا ۱۷)\nهمراه واحد فروش: **۰۹۱۴ ۱۲۳ ۴۵۶۷**\nنشانی: تبریز، کیلومتر ۱۲ جادهٔ آذرشهر، شهرک صنعتی غرب.\nاگر ترجیح می‌دهید ما تماس بگیریم، فرم پایین صفحه را پر کنید.',
        action: 'contact',
        chips: ['فرم تماس را باز کن', 'نمونهٔ رایگان می‌خواهم']
      };
    }

    /* --- پاسخ پیش‌فرض --- */
    return {
      text: 'مطمئن نیستم درست متوجه شدم. می‌توانم در این موارد کمک کنم:\n' +
        list([
          'انتخاب رنگ و کد مناسب نمای شما',
          'محاسبهٔ متراژ، تعداد آجر و برآورد هزینه',
          'شرایط ارسال، ضمانت، پرداخت و اجرا'
        ]) +
        '<br>یکی از پیشنهادهای زیر را بزنید یا سوالتان را ساده‌تر بنویسید.',
      chips: ['برای نمای مدرن چه رنگی؟', '۱۲ در ۳', 'ضمانت شامل چیست؟', 'شمارهٔ تماس']
    };
  }

  function matchProduct(t) {
    for (const p of PRODUCTS) {
      if (t.includes(norm(p.code.toLowerCase())) || t.includes(norm(p.name))) return p;
    }
    for (const p of PRODUCTS) {
      if ((p.keys || []).some(k => t.includes(norm(k)))) return p;
    }
    return null;
  }

  /* ============================ رابط گفتگو ========================= */
  const feed  = () => $('#chatFeed');
  const chips = () => $('#chatChips');

  function bubbleShell(who) {
    const wrap = document.createElement('div');
    wrap.className = 'msg' + (who === 'me' ? ' msg--me' : '');
    wrap.innerHTML = who === 'me'
      ? '<div class="msg__body"></div>'
      : '<span class="msg__av"><b></b></span><div class="msg__body"></div>';
    return wrap;
  }

  function addUser(text) {
    const el = bubbleShell('me');
    el.querySelector('.msg__body').innerHTML =
      '<div class="bubble">' + esc(text) + '</div>';
    feed().appendChild(el);
    scrollDown();
    return el;
  }

  function addTyping() {
    const el = bubbleShell('bot');
    el.querySelector('.msg__body').innerHTML =
      '<div class="bubble" style="padding:0"><span class="typing"><i></i><i></i><i></i></span></div>';
    feed().appendChild(el);
    scrollDown();
    return el;
  }

  /* تایپ تدریجی: تگ‌ها اتمی و متن کلمه‌به‌کلمه اضافه می‌شود */
  function tokenize(htmlStr) {
    const out = [];
    const re = /(<[^>]+>)/g;
    let last = 0, m;
    while ((m = re.exec(htmlStr))) {
      if (m.index > last) out.push(...htmlStr.slice(last, m.index).split(/(\s+)/).filter(Boolean));
      out.push(m[0]);
      last = re.lastIndex;
    }
    if (last < htmlStr.length) out.push(...htmlStr.slice(last).split(/(\s+)/).filter(Boolean));
    return out;
  }

  function stream(target, htmlStr) {
    return new Promise(resolve => {
      if (REDUCED) { target.innerHTML = htmlStr; resolve(); return; }
      const parts = tokenize(htmlStr);
      let acc = '', i = 0;
      (function step() {
        if (i >= parts.length) { target.innerHTML = acc; resolve(); return; }
        acc += parts[i++];
        target.innerHTML = acc;
        scrollDown();
        setTimeout(step, parts[i - 1].startsWith('<') ? 0 : 14 + Math.random() * 26);
      })();
    });
  }

  function productCard(id) {
    const p = byId(id);
    if (!p) return '';
    const im = toneImages(p, p.tones[0].name);
    return `
      <button class="msg-card" type="button" data-open="${p.id}">
        <span class="msg-card__img"><img src="${im.wall}" alt="" data-slot></span>
        <span class="msg-card__txt">
          <b>${esc(p.name)}</b>
          <span>${faNum(p.price)} تومان / ${esc(p.unit)}</span>
        </span>
        <span class="msg-card__go">
          <svg width="15" height="15"><use href="#i-arrow"/></svg>
        </span>
      </button>`;
  }

  async function addBot(reply) {
    const typing = addTyping();
    await wait(REDUCED ? 60 : 520 + Math.random() * 420);
    typing.remove();

    const el = bubbleShell('bot');
    const body = el.querySelector('.msg__body');
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    body.appendChild(bubble);
    feed().appendChild(el);

    const content = reply.text.includes('<') ? reply.text : md(reply.text);
    await stream(bubble, content.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'));

    if (reply.cards && reply.cards.length) {
      const box = document.createElement('div');
      box.innerHTML = reply.cards.map(productCard).join('');
      body.appendChild(box);
      wireImages(box);
      $$('[data-open]', box).forEach(b =>
        b.addEventListener('click', () => window.AZUI.openProduct(b.dataset.open)));
    }

    if (reply.add) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm';
      btn.style.marginTop = '.6rem';
      btn.innerHTML = '<svg width="15" height="15"><use href="#i-plus"/></svg>' + esc(reply.add.label);
      btn.addEventListener('click', () => {
        Cart.add(reply.add.id, null, reply.add.qty);
        btn.disabled = true;
        btn.style.opacity = '.55';
        btn.innerHTML = '<svg width="15" height="15"><use href="#i-check"/></svg> به سبد اضافه شد';
      });
      body.appendChild(btn);
    }

    if (reply.action === 'cart') setTimeout(() => window.AZUI.openCart(), 700);
    if (reply.action === 'calc') setTimeout(() => { AZ.closeSheet('#advisorSheet'); window.AZUI.goTo('#calc'); }, 900);
    if (reply.action === 'contact') setTimeout(() => { AZ.closeSheet('#advisorSheet'); window.AZUI.goTo('#contact'); }, 900);

    setChips(reply.chips);
    scrollDown();
    save();
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));

  function setChips(items) {
    const box = chips();
    if (!box) return;
    const use = items && items.length ? items : PROMPTS.slice(0, 3);
    box.innerHTML = use.map(c => `<button class="chip" type="button">${esc(c)}</button>`).join('');
    $$('.chip', box).forEach(c => c.addEventListener('click', () => ask(c.textContent)));
  }

  function scrollDown() {
    const s = $('#chatScroll');
    if (s) s.scrollTop = s.scrollHeight;
  }

  /* ------------------------- ذخیره و بازیابی ------------------------ */
  function save() {
    try {
      const rows = $$('#chatFeed .msg').slice(-24).map(m => ({
        me: m.classList.contains('msg--me'),
        html: m.querySelector('.msg__body').innerHTML
      }));
      localStorage.setItem(KEY, JSON.stringify(rows));
    } catch (e) { /* بی‌اهمیت */ }
  }

  function restore() {
    let rows = [];
    try { rows = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { rows = []; }
    if (!rows.length) return false;
    $('#chatIntro').style.display = 'none';
    rows.forEach(r => {
      const el = bubbleShell(r.me ? 'me' : 'bot');
      el.querySelector('.msg__body').innerHTML = r.html;
      feed().appendChild(el);
    });
    wireImages(feed());
    $$('#chatFeed [data-open]').forEach(b =>
      b.addEventListener('click', () => window.AZUI.openProduct(b.dataset.open)));
    scrollDown();
    return true;
  }

  /* ------------------------------ ورودی ---------------------------- */
  let busy = false;

  async function ask(text) {
    const q = String(text || '').trim();
    if (!q || busy) return;
    busy = true;
    const intro = $('#chatIntro');
    if (intro) intro.style.display = 'none';
    addUser(q);
    save();
    const box = $('#chatInput');
    if (box) { box.value = ''; box.style.height = 'auto'; }
    syncSend();
    await addBot(respond(q));
    busy = false;
    syncSend();
  }

  function syncSend() {
    const box = $('#chatInput');
    const btn = $('#chatSend');
    if (btn && box) btn.disabled = busy || !box.value.trim();
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* */ }
    feed().innerHTML = '';
    const intro = $('#chatIntro');
    if (intro) intro.style.display = '';
    setChips(PROMPTS.slice(0, 3));
    toast('گفتگو پاک شد');
  }

  /* ------------------------------ راه‌اندازی ------------------------ */
  function init() {
    const box = $('#chatInput');
    const btn = $('#chatSend');
    if (!box) return;

    box.addEventListener('input', () => {
      box.style.height = 'auto';
      box.style.height = Math.min(108, box.scrollHeight) + 'px';
      syncSend();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(box.value); }
    });
    btn.addEventListener('click', () => ask(box.value));
    $('#chatReset').addEventListener('click', reset);

    if (!restore()) setChips(PROMPTS.slice(0, 3));
    syncSend();
  }

  async function open(question) {
    await AZ.openSheet('#advisorSheet', '520px');
    setTimeout(() => {
      if (question) ask(question);
      else if (!AZ.isPhone()) { const i = $('#chatInput'); if (i) i.focus(); }
    }, 380);
  }

  window.Advisor = { init, open, ask, reset, respond };
})();
