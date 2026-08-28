/* =====================================================================
   The assistant's brain — data shapes, formulas and wording.

   This file is meant to be edited on its own. chat.js is only plumbing:
   it opens a panel, types what this file returns, and reports clicks
   back. Everything the assistant knows how to say, count or suggest is
   here, so changing a phrase, a threshold or a formula never means
   touching the interface.

   The dataset it reads comes from api/assistant.php in one reply:

     me           {u, name, title, phone, email, photo}
     today        "1405.06.06"          month  {jy, jm, label}
     totals       {invoices, customers, products, payable, qty}
     monthTotals  {invoices, payable, qty}
     bricks[]     {code, desc, unit, qty, amount, invoices,
                   monthQty, monthAmount, monthInvoices}   — qty is قالب
     people[]     {id, name, phone, invoices, payable, qty, last,
                   bricks:[{code, desc, qty, amount}]}
     months[]     {jy, jm, label, invoices, payable, qty}  — last twelve
     products[]   {code, desc, price, perM2, perCarton, perPallet}
     dupPhones[]  {phone, count, customers:[{id,name}]}
     unread       number
     reminders    {open, overdue, items:[{id,text}]}
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------
     Tuning — the numbers a person might reasonably want to change
     --------------------------------------------------------------- */
  var CONFIG = {
    listSize: 5,            // how many rows a "top …" answer shows
    quietMonth: 3,          // fewer invoices than this and the month is "quiet"
    bigCustomer: 0.25,      // a buyer past this share of turnover is "a large share"
    nameMinLength: 2        // shorter than this is not treated as a name
  };

  /* ---------------------------------------------------------------
     Text — Persian comes in several spellings of the same letter
     --------------------------------------------------------------- */
  function fold(s) {
    return String(s == null ? '' : s)
      .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
      .replace(/[ة]/g, 'ه').replace(/[‌‏‎]/g, ' ')
      .replace(/[ً-ْـ]/g, '')
      .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
      .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); })
      .replace(/[^\S\n]+/g, ' ')
      .trim().toLowerCase();
  }
  function has(t, words) {
    for (var i = 0; i < words.length; i++) if (t.indexOf(fold(words[i])) >= 0) return true;
    return false;
  }
  function n(x) { return (global.Num && Num.group) ? Num.group(x || 0) : String(x || 0); }
  function esc(s) { return (global.UI && UI.esc) ? UI.esc(s) : String(s == null ? '' : s); }

  /* Money is always rials; a turnover figure in the billions is easier
     to read once, in words, beside the exact number. */
  function rial(v) {
    v = Math.round(v || 0);
    var out = '<b class="num">' + n(v) + '</b> ریال';
    if (v >= 1e9) out += ' <i>(' + (v / 1e9).toFixed(2).replace(/\.?0+$/, '') + ' میلیارد)</i>';
    else if (v >= 1e6) out += ' <i>(' + Math.round(v / 1e6) + ' میلیون)</i>';
    return out;
  }
  function qty(v, unit) { return '<b class="num">' + n(v) + '</b> ' + esc(unit || 'قالب'); }

  /* ---------------------------------------------------------------
     Links — the assistant points, it does not paste addresses
     --------------------------------------------------------------- */
  var LINKS = {
    home:      { href: '/panel/',              label: 'داشبورد' },
    invoices:  { href: '/panel/invoices.php',  label: 'پیش‌فاکتورها' },
    customers: { href: '/panel/customers.php', label: 'مشتریان' },
    reminders: { href: '/panel/reminders.php', label: 'یادآورها' },
    products:  { href: '/panel/settings.php?t=products', label: 'محصولات و قیمت‌ها' },
    settings:  { href: '/panel/settings.php',  label: 'تنظیمات' },
    profile:   { href: '/panel/profile.php',   label: 'پروفایل من' },
    newInvoice:{ href: '/panel/invoice.php',   label: 'صدور پیش‌فاکتور' }
  };
  function link(key, extra) {
    var l = LINKS[key];
    if (!l) return null;
    return { key: key, href: extra ? l.href + extra : l.href, label: l.label };
  }
  function person(p) { return { key: 'customers', href: '/panel/customer.php?id=' + encodeURIComponent(p.id), label: p.name }; }

  /* ---------------------------------------------------------------
     Finding things by name
     --------------------------------------------------------------- */
  function findPerson(text, d) {
    var t = fold(text), best = null, bestLen = 0;
    (d.people || []).forEach(function (p) {
      var name = fold(p.name);
      if (name.length < CONFIG.nameMinLength) return;
      // the longest matching name wins, so "آقای موسوی" beats "موسوی"
      if (t.indexOf(name) >= 0 && name.length > bestLen) { best = p; bestLen = name.length; }
      var bare = name.replace(/^(اقای|خانم|جناب|سرکار)\s+/, '');
      if (bare && t.indexOf(bare) >= 0 && bare.length > bestLen) { best = p; bestLen = bare.length; }
      var digits = String(p.phone || '').replace(/\D/g, '');
      if (digits && t.replace(/\D/g, '').indexOf(digits) >= 0) { best = p; bestLen = 99; }
    });
    return best;
  }

  function findProduct(text, d) {
    var t = fold(text), best = null, bestLen = 0;
    (d.products || []).forEach(function (p) {
      var code = fold(p.code);
      if (code && t.indexOf(code) >= 0 && code.length > bestLen) { best = p; bestLen = code.length; }
      var desc = fold(p.desc);
      if (desc && desc.length > 2 && t.indexOf(desc) >= 0 && desc.length > bestLen) { best = p; bestLen = desc.length; }
    });
    return best;
  }

  function findMonth(text, d) {
    var t = fold(text);
    var hit = null;
    (d.months || []).forEach(function (m) { if (t.indexOf(fold(m.label)) >= 0) hit = m; });
    return hit;
  }

  function brickOf(code, d) {
    var f = fold(code), hit = null;
    (d.bricks || []).forEach(function (b) { if (fold(b.code) === f) hit = b; });
    return hit;
  }

  /* ---------------------------------------------------------------
     Answers
     --------------------------------------------------------------- */
  function tableOf(rows) {
    return '<table class="ct"><tbody>' + rows.map(function (r) {
      return '<tr><td>' + r[0] + '</td><td class="e">' + r[1] + '</td></tr>';
    }).join('') + '</tbody></table>';
  }

  var INTENTS = [
    /* ---- best seller, month and overall ---- */
    {
      id: 'bestseller',
      test: function (t) { return has(t, ['پرفروش', 'پر فروش', 'بیشترین فروش', 'بهترین فروش']); },
      run: function (t, d) {
        var monthly = has(t, ['ماه', 'این ماه', d.month.label]);
        var list = (d.bricks || []).slice();
        list.sort(function (a, b) { return monthly ? b.monthQty - a.monthQty : b.qty - a.qty; });
        list = list.filter(function (b) { return monthly ? b.monthQty > 0 : b.qty > 0; });
        if (!list.length) {
          return { html: monthly
            ? 'در ' + esc(d.month.label) + ' هنوز فروشی ثبت نشده است.'
            : 'هنوز هیچ آجری فروخته نشده است.' , links: [link('newInvoice')] };
        }
        var top = list[0];
        var head = monthly
          ? 'پرفروش‌ترین آجر <b>' + esc(d.month.label) + '</b>: <b>' + esc(top.desc || top.code) + '</b>'
          : 'پرفروش‌ترین آجر از ابتدا: <b>' + esc(top.desc || top.code) + '</b>';
        return {
          html: head + '<br>' +
            qty(monthly ? top.monthQty : top.qty, top.unit) + ' — ' +
            rial(monthly ? top.monthAmount : top.amount) +
            (list.length > 1 ? '<div class="ch">بقیه:</div>' + tableOf(list.slice(1, CONFIG.listSize).map(function (b) {
              return ['<span class="ltr">' + esc(b.code) + '</span> ' + esc(b.desc),
                      '<span class="num">' + n(monthly ? b.monthQty : b.qty) + '</span>'];
            })) : ''),
          links: [link('invoices'), link('products')]
        };
      }
    },

    /* ---- sales per brick type, by قالب ---- */
    {
      id: 'brick-sales',
      test: function (t) {
        return has(t, ['فروش هر', 'فروش آجر', 'جمع فروش', 'چقدر فروخت', 'چند قالب', 'تعداد قالب',
                       'فروش به تفکیک', 'هر نوع آجر', 'کدام آجر']);
      },
      run: function (t, d) {
        var monthly = has(t, ['ماه', d.month.label]);
        var p = findProduct(t, d);
        if (p) {
          var b = brickOf(p.code, d);
          if (!b) return { html: '<b>' + esc(p.desc) + '</b> هنوز در هیچ فاکتوری فروخته نشده است.',
                           links: [link('products')] };
          return {
            html: '<b>' + esc(b.desc || b.code) + '</b> <span class="ltr">' + esc(b.code) + '</span>' +
              tableOf([
                ['کل فروش', qty(b.qty, b.unit)],
                ['کل مبلغ', rial(b.amount)],
                [esc(d.month.label), qty(b.monthQty, b.unit)],
                ['مبلغ ' + esc(d.month.label), rial(b.monthAmount)],
                ['در چند فاکتور', '<b class="num">' + n(b.invoices) + '</b>']
              ]),
            links: [link('invoices'), link('products')]
          };
        }
        var list = (d.bricks || []).slice().sort(function (a, b2) {
          return monthly ? b2.monthQty - a.monthQty : b2.qty - a.qty;
        }).filter(function (b2) { return monthly ? b2.monthQty > 0 : b2.qty > 0; });
        if (!list.length) return { html: 'هنوز فروشی ثبت نشده است.', links: [link('newInvoice')] };
        return {
          html: (monthly ? 'فروش ' + esc(d.month.label) + ' به تفکیک آجر (قالب):'
                         : 'فروش کل به تفکیک آجر (قالب):') +
            tableOf(list.slice(0, CONFIG.listSize).map(function (b2) {
              return ['<span class="ltr">' + esc(b2.code) + '</span> ' + esc(b2.desc),
                      '<span class="num">' + n(monthly ? b2.monthQty : b2.qty) + '</span>'];
            })) +
            '<div class="ch">مجموع: ' + qty(monthly ? d.monthTotals.qty : d.totals.qty) + '</div>',
          links: [link('invoices')]
        };
      }
    },

    /* ---- one customer: totals, bricks, invoice count ---- */
    {
      id: 'customer',
      test: function (t, d) {
        return !!findPerson(t, d) ||
          has(t, ['مشتری', 'خریدار', 'بیشترین خرید', 'بهترین مشتری', 'پرخرید']);
      },
      run: function (t, d) {
        var p = findPerson(t, d);
        if (!p) {
          var top = (d.people || []).slice(0, CONFIG.listSize);
          if (!top.length) return { html: 'هنوز مشتری ثبت نشده است.', links: [link('customers')] };
          return {
            html: 'مشتریان بر اساس مجموع خرید:' +
              tableOf(top.map(function (x) { return [esc(x.name), '<span class="num">' + n(x.payable) + '</span>']; })) +
              '<div class="ch">نام یک مشتری را بنویسید تا جزئیاتش را بگویم.</div>',
            links: [link('customers')]
          };
        }
        var share = d.totals.payable ? p.payable / d.totals.payable : 0;
        var bricks = (p.bricks || []).slice(0, CONFIG.listSize);
        return {
          html: '<b>' + esc(p.name) + '</b>' + (p.phone ? ' <span class="ltr dim">' + esc(p.phone) + '</span>' : '') +
            tableOf([
              ['تعداد فاکتور', '<b class="num">' + n(p.invoices) + '</b>'],
              ['مجموع خرید', rial(p.payable)],
              ['مجموع قالب', qty(p.qty)],
              ['آخرین فاکتور', p.last ? (global.Jalali ? Jalali.pretty(p.last) : p.last) : '—']
            ]) +
            (bricks.length ? '<div class="ch">آجرهایی که خریده:</div>' + tableOf(bricks.map(function (b) {
              return ['<span class="ltr">' + esc(b.code) + '</span> ' + esc(b.desc),
                      '<span class="num">' + n(b.qty) + '</span>'];
            })) : '') +
            (share >= CONFIG.bigCustomer
              ? '<div class="ch warn">' + Math.round(share * 100) + '٪ از کل فروش شما از همین مشتری است.</div>' : ''),
          links: [person(p), link('newInvoice', '?customer=' + encodeURIComponent(p.id)), link('invoices')]
        };
      }
    },

    /* ---- product facts straight out of the price list ---- */
    {
      id: 'product',
      test: function (t, d) {
        return has(t, ['قیمت', 'کارتن', 'متر مربع', 'پالت', 'مشخصات کالا', 'محصول', 'کد کالا']) ||
               !!findProduct(t, d);
      },
      run: function (t, d) {
        var p = findProduct(t, d);
        if (!p) {
          return { html: 'کد یا نام کالا را بنویسید تا قیمت و بسته‌بندی‌اش را بگویم — مثلاً «قیمت AB51301».' +
            '<div class="ch">فهرست کامل <b class="num">' + n(d.totals.products) + '</b> کالا در بخش محصولات است.</div>',
            links: [link('products')] };
        }
        var b = brickOf(p.code, d);
        return {
          html: '<b>' + esc(p.desc) + '</b> <span class="ltr">' + esc(p.code) + '</span>' +
            tableOf([
              ['بهای واحد', rial(p.price)],
              ['تعداد در متر مربع', p.perM2 ? '<b class="num">' + n(p.perM2) + '</b>' : '—'],
              ['تعداد در کارتن', p.perCarton ? '<b class="num">' + n(p.perCarton) + '</b>' : '—'],
              ['تعداد در پالت', p.perPallet ? '<b class="num">' + n(p.perPallet) + '</b>' : '—'],
              ['فروش تا امروز', b ? qty(b.qty) : '—']
            ]) +
            (p.perM2 ? '<div class="ch">یعنی هر متر مربع حدود ' + rial(Math.round(p.price * p.perM2)) + '.</div>' : ''),
          links: [link('products'), link('newInvoice')]
        };
      }
    },

    /* ---- how many invoices ---- */
    {
      id: 'invoice-count',
      test: function (t) { return has(t, ['چند فاکتور', 'تعداد فاکتور', 'چندتا فاکتور']); },
      run: function (t, d) {
        var p = findPerson(t, d);
        if (p) return { html: '<b>' + esc(p.name) + '</b> تا امروز <b class="num">' + n(p.invoices) +
          '</b> فاکتور دارد، به ارزش ' + rial(p.payable) + '.', links: [person(p), link('invoices')] };
        return { html: 'در مجموع <b class="num">' + n(d.totals.invoices) + '</b> فاکتور ثبت شده؛ ' +
          '<b class="num">' + n(d.monthTotals.invoices) + '</b> تا در ' + esc(d.month.label) + '.',
          links: [link('invoices')] };
      }
    },

    /* ---- month and overall summary ---- */
    {
      id: 'summary',
      test: function (t) { return has(t, ['خلاصه', 'وضعیت', 'گزارش', 'این ماه', 'کل فروش', 'مجموع فروش', 'چطوریم']); },
      run: function (t, d) {
        var m = findMonth(t, d);
        if (m) return {
          html: '<b>' + esc(m.label) + ' ' + n(m.jy) + '</b>' + tableOf([
            ['فاکتور', '<b class="num">' + n(m.invoices) + '</b>'],
            ['مبلغ', rial(m.payable)],
            ['قالب', qty(m.qty)]
          ]), links: [link('invoices')]
        };
        var prev = (d.months || []).slice(-2)[0];
        var cur  = (d.months || []).slice(-1)[0];
        var trend = '';
        if (prev && cur && prev.payable > 0) {
          var pc = Math.round((cur.payable - prev.payable) / prev.payable * 100);
          trend = '<div class="ch' + (pc < 0 ? ' warn' : '') + '">نسبت به ' + esc(prev.label) + ' ' +
            '<b class="num">' + n(Math.abs(pc)) + '٪</b> ' + (pc >= 0 ? 'بیشتر' : 'کمتر') + '.</div>';
        }
        return {
          html: '<b>' + esc(d.month.label) + '</b> تا امروز:' + tableOf([
            ['فاکتور', '<b class="num">' + n(d.monthTotals.invoices) + '</b>'],
            ['مبلغ', rial(d.monthTotals.payable)],
            ['قالب', qty(d.monthTotals.qty)]
          ]) + trend +
          '<div class="ch">از ابتدا: <b class="num">' + n(d.totals.invoices) + '</b> فاکتور، ' +
          rial(d.totals.payable) + '، ' + qty(d.totals.qty) + '.</div>',
          links: [link('invoices'), link('home')]
        };
      }
    },

    /* ---- duplicate telephone numbers ---- */
    {
      id: 'duplicates',
      test: function (t) { return has(t, ['تکرار', 'تلفن تکراری', 'شماره تکراری', 'مشتری تکراری']); },
      run: function (t, d) {
        if (!d.dupPhones || !d.dupPhones.length) {
          return { html: 'هیچ شمارهٔ تلفنی برای بیش از یک مشتری ثبت نشده است.', links: [link('customers')] };
        }
        return {
          html: '<b class="num">' + n(d.dupPhones.length) + '</b> شماره برای بیش از یک مشتری ثبت شده:' +
            tableOf(d.dupPhones.slice(0, CONFIG.listSize).map(function (x) {
              return ['<span class="ltr">' + esc(x.phone) + '</span>',
                      esc(x.customers.map(function (c) { return c.name; }).join('، '))];
            })) +
            '<div class="ch">نام تکراری اشکالی ندارد؛ شمارهٔ تکراری معمولاً یعنی یک نفر دوبار ثبت شده.</div>',
          links: [link('customers')]
        };
      }
    },

    /* ---- make a reminder from the chat ---- */
    {
      id: 'reminder',
      test: function (t) { return has(t, ['یادآور', 'یاد آور', 'یادم بنداز', 'تسک', 'کار جدید', 'به یادم']); },
      run: function (t, d, raw) {
        var text = String(raw || '')
          .replace(/^\s*(یک\s+)?(یادآور|یاد\s*آور|تسک|کار)\s*(جدید)?\s*(بساز|اضافه کن|ثبت کن|بنویس)?\s*[:：]?\s*/i, '')
          .replace(/\s*(را\s+)?(یادم بنداز|به یادم بیاور)\s*$/i, '')
          .trim();
        if (text.length < 3) {
          return {
            html: 'متن یادآور را بنویسید — مثلاً «یادآور: تماس با انبار شمال».' +
              (d.reminders.open ? '<div class="ch">الان <b class="num">' + n(d.reminders.open) + '</b> یادآور باز دارید.</div>' : ''),
            links: [link('reminders')]
          };
        }
        return {
          html: 'یادآور «' + esc(text) + '» ثبت شود؟',
          action: { kind: 'reminder', text: text, confirm: 'ثبت کن', cancel: 'بی‌خیال' },
          links: [link('reminders')]
        };
      }
    },

    /* ---- messages ---- */
    {
      id: 'messages',
      test: function (t) { return has(t, ['پیام', 'اعلان', 'زنگوله', 'خوانده نشده']); },
      run: function (t, d) {
        return { html: d.unread
          ? '<b class="num">' + n(d.unread) + '</b> پیام خوانده‌نشده دارید. از زنگولهٔ بالای صفحه ببینیدشان.'
          : 'پیام خوانده‌نشده‌ای ندارید.', links: [link('home')] };
      }
    },

    /* ---- what can you do ---- */
    {
      id: 'help',
      test: function (t) { return has(t, ['چه کار', 'چیکار', 'کمک', 'راهنما', 'بلدی', 'می‌توانی', 'میتونی']); },
      run: function (t, d) { return { html: helpHtml(d), links: [link('home')] }; }
    }
  ];

  function helpHtml(d) {
    return 'از دادهٔ همین سایت جواب می‌دهم — بدون اینترنت و بدون سرویس بیرونی:' +
      '<ul class="cl">' +
      '<li>فروش هر آجر بر حسب قالب، کل و ماهانه</li>' +
      '<li>خرید هر مشتری به ریال و به قالب، و اینکه چه آجرهایی خریده</li>' +
      '<li>پرفروش‌ترین آجر ماه و از ابتدا</li>' +
      '<li>تعداد فاکتورهای یک نفر</li>' +
      '<li>قیمت و بسته‌بندی هر کالا از فهرست محصولات</li>' +
      '<li>ساخت یادآور، همین‌جا</li>' +
      '<li>هشدار شمارهٔ تلفن تکراری</li>' +
      '</ul>' +
      '<div class="ch">مثلاً بپرسید: «پرفروش‌ترین آجر ماه؟» یا «آقای موسوی چقدر خرید کرده؟»</div>';
  }

  /* ---------------------------------------------------------------
     Page awareness — what to open with, and what to offer
     --------------------------------------------------------------- */
  var PAGES = {
    home: {
      where: 'داشبورد',
      line: function (d) {
        return 'اینجا نمای کلی کسب‌وکار است. ' + (d.monthTotals.invoices
          ? '<b class="num">' + n(d.monthTotals.invoices) + '</b> فاکتور در ' + esc(d.month.label) + ' ثبت شده.'
          : 'در ' + esc(d.month.label) + ' هنوز فاکتوری ثبت نشده.');
      },
      chips: ['خلاصهٔ این ماه', 'پرفروش‌ترین آجر ماه', 'یادآور بساز']
    },
    invoices: {
      where: 'پیش‌فاکتورها',
      line: function (d) {
        return 'اینجا همهٔ <b class="num">' + n(d.totals.invoices) + '</b> فاکتور است. ' +
          'می‌توانم مجموع‌ها را به تفکیک آجر یا مشتری بگویم.';
      },
      chips: ['فروش کل به تفکیک آجر', 'پرفروش‌ترین آجر', 'خلاصهٔ این ماه']
    },
    customers: {
      where: 'مشتریان',
      line: function (d) {
        return '<b class="num">' + n(d.totals.customers) + '</b> مشتری ثبت شده. ' +
          'نام هرکدام را بنویسید تا خرید و آجرهایش را بگویم.' +
          (d.dupPhones.length ? ' <span class="warnline">' + n(d.dupPhones.length) +
            ' شمارهٔ تکراری هم دارید.</span>' : '');
      },
      chips: ['مشتریان پرخرید', 'شماره‌های تکراری', 'چند مشتری داریم؟']
    },
    customer: {
      where: 'پروندهٔ مشتری',
      line: function (d, ctx) {
        return ctx.customerName
          ? 'پروندهٔ <b>' + esc(ctx.customerName) + '</b> باز است — بپرسید چه خریده یا چند فاکتور دارد.'
          : 'پروندهٔ یک مشتری باز است.';
      },
      chips: function (d, ctx) {
        return ctx.customerName
          ? [ctx.customerName + ' چه آجرهایی خریده؟', ctx.customerName + ' چند فاکتور دارد؟', 'مشتریان پرخرید']
          : ['مشتریان پرخرید', 'شماره‌های تکراری'];
      }
    },
    reminders: {
      where: 'یادآورها',
      line: function (d) {
        return d.reminders.open
          ? '<b class="num">' + n(d.reminders.open) + '</b> یادآور باز دارید' +
            (d.reminders.overdue ? '، <b class="num">' + n(d.reminders.overdue) + '</b> تا بیش از یک هفته.' : '.')
          : 'یادآور بازی ندارید. می‌خواهید یکی بسازم؟';
      },
      chips: ['یادآور بساز', 'یادآورهای باز', 'خلاصهٔ این ماه']
    },
    settings: {
      where: 'تنظیمات',
      line: function (d) {
        return 'فهرست <b class="num">' + n(d.totals.products) + '</b> کالا همین‌جاست. ' +
          'قیمت یا بسته‌بندی هر کدام را بپرسید.';
      },
      chips: ['قیمت AB51301', 'گران‌ترین کالا', 'چند کالا داریم؟']
    },
    profile: {
      where: 'پروفایل',
      line: function (d) { return 'اینجا نام، عکس و راه‌های تماس شماست.'; },
      chips: ['خلاصهٔ این ماه', 'یادآور بساز']
    }
  };

  /* ---------------------------------------------------------------
     Public surface
     --------------------------------------------------------------- */
  var Brain = {
    config: CONFIG,
    links: LINKS,

    /* The first thing said, shaped by the page it was opened on. */
    greeting: function (ctx, d) {
      var page = PAGES[ctx.page] || PAGES.home;
      var hour = new Date().getHours();
      var hello = hour < 5 ? 'شب بخیر' : hour < 12 ? 'صبح بخیر' : hour < 17 ? 'ظهر بخیر'
                : hour < 20 ? 'عصر بخیر' : 'شب بخیر';
      var name = (d.me && d.me.name) ? d.me.name : '';
      var alerts = [];
      if (d.unread) alerts.push('<b class="num">' + n(d.unread) + '</b> پیام خوانده‌نشده');
      if (d.reminders && d.reminders.overdue) alerts.push('<b class="num">' + n(d.reminders.overdue) + '</b> یادآور عقب‌افتاده');
      if (d.dupPhones && d.dupPhones.length) alerts.push('<b class="num">' + n(d.dupPhones.length) + '</b> شمارهٔ تکراری');

      return {
        html: hello + (name ? '، <b>' + esc(name) + '</b>' : '') + '.<br>' +
          (typeof page.line === 'function' ? page.line(d, ctx) : '') +
          (alerts.length ? '<div class="ch warn">' + alerts.join(' · ') + '</div>' : ''),
        chips: typeof page.chips === 'function' ? page.chips(d, ctx) : (page.chips || []),
        links: [link('home')]
      };
    },

    /* One question in, one answer out. Never throws: an assistant that
       breaks the page is worse than one that says it did not follow. */
    answer: function (text, d, ctx) {
      var t = fold(text);
      if (!t) return { html: 'چیزی نپرسیدید 🙂', chips: [] };
      try {
        for (var i = 0; i < INTENTS.length; i++) {
          if (INTENTS[i].test(t, d)) {
            var r = INTENTS[i].run(t, d, text);
            if (r) { r.intent = INTENTS[i].id; return r; }
          }
        }
      } catch (e) {
        return { html: 'در محاسبهٔ این مورد به مشکل خوردم: ' + esc(e.message), chips: [] };
      }
      return {
        html: 'این را نفهمیدم. ' + helpHtml(d),
        chips: ['خلاصهٔ این ماه', 'پرفروش‌ترین آجر ماه', 'مشتریان پرخرید'],
        links: [link('home')]
      };
    },

    /* Which page the chat was opened on, from the address bar. */
    pageOf: function (path) {
      if (/\/panel\/invoices\.php/.test(path)) return 'invoices';
      if (/\/panel\/customers\.php/.test(path)) return 'customers';
      if (/\/panel\/customer\.php/.test(path)) return 'customer';
      if (/\/panel\/reminders\.php/.test(path)) return 'reminders';
      if (/\/panel\/settings\.php/.test(path)) return 'settings';
      if (/\/panel\/profile\.php/.test(path)) return 'profile';
      return 'home';
    },

    help: helpHtml,
    fold: fold
  };

  global.Brain = Brain;
})(window);
