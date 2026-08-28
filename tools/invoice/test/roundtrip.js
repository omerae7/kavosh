/* HTML export → reopen → edit → re-export, end to end. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
const FILE = 'file://' + path.resolve(__dirname, '../../../فاکتور شهریور 1405.html');
const GEN1 = path.join(__dirname, 'rt-out1.html');
const GEN2 = path.join(__dirname, 'rt-out2.html');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errs = [];
  const reqs = [];
  ctx.on('request', r => reqs.push(r.url()));

  // ---- fill an invoice and export it ----
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('C:' + m.text()); });
  await p.goto(FILE); await p.waitForTimeout(700);
  await p.fill('input[placeholder="مثال: آقای یزدانی"]', 'خانم رضایی');
  await p.fill('input[placeholder="09xxxxxxxxx"]', '09121234567');
  const cb = await p.$$('.rowcard .combo input');
  await cb[0].click(); await cb[0].fill('AB42301'); await p.waitForTimeout(250);
  await (await (await p.$$('.rowcard'))[0].$('.combo-item')).click(); await p.waitForTimeout(250);
  await p.evaluate(() => {
    const c = document.querySelectorAll('.rowcard')[0];
    const set = (lbl, v) => {
      const f = [...c.querySelectorAll('.f')].find(f =>
        f.querySelector('label') && f.querySelector('label').textContent.indexOf(lbl) >= 0);
      const i = f.querySelector('input');
      i.readOnly = false;              // the money fields sit behind a pencil
      i.focus(); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.blur();
    };
    set('مقدار', '1764');
    set('پس از تخفیف', '500000');    // drives the discount
  });
  await p.waitForTimeout(400);
  const snap = await p.evaluate(() => {
    const S = window.Invoice.state();
    return JSON.stringify({
      name: S.customer.name, qty: S.rows[0].qty,
      pct: +S.rows[0].discPct.toFixed(6), payable: window.Invoice.calc.totals().payable
    });
  });
  console.log('original :', snap);
  let [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click('#btnHtmlSide')]);
  await dl.saveAs(GEN1);
  console.log('export 1 :', fs.statSync(GEN1).size, 'bytes');

  // ---- reopen it: everything must come back ----
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errs.push('gen1:' + e.message));
  await p2.goto('file://' + GEN1); await p2.waitForTimeout(700);
  const back = await p2.evaluate(() => {
    const S = window.Invoice.state();
    return JSON.stringify({
      name: S.customer.name, qty: S.rows[0].qty,
      pct: +S.rows[0].discPct.toFixed(6), payable: window.Invoice.calc.totals().payable
    });
  });
  console.log('restored :', back, back === snap ? 'MATCH' : 'MISMATCH');
  console.log('title    :', await p2.title());
  console.log('icons    :', await p2.evaluate(() => document.querySelectorAll('link[rel*="icon"]').length));

  // ---- edit and re-export: must not grow, must keep one data script ----
  await p2.fill('input[placeholder="مثال: آقای یزدانی"]', 'خانم رضایی مقدم');
  await p2.waitForTimeout(400);
  [dl] = await Promise.all([p2.waitForEvent('download', { timeout: 20000 }), p2.click('#btnHtmlSide')]);
  await dl.saveAs(GEN2);
  const s1 = fs.statSync(GEN1).size, s2 = fs.statSync(GEN2).size;
  const html2 = fs.readFileSync(GEN2, 'utf8');
  console.log('export 2 :', s2, 'bytes (delta', s2 - s1 + ')',
    '| data scripts:', (html2.match(/id="invoice-data"/g) || []).length);

  const p3 = await ctx.newPage();
  p3.on('pageerror', e => errs.push('gen2:' + e.message));
  await p3.goto('file://' + GEN2); await p3.waitForTimeout(700);
  console.log('gen2     :', await p3.evaluate(() => JSON.stringify({
    name: window.Invoice.state().customer.name,
    payable: window.Invoice.calc.totals().payable
  })));

  console.log('requests :', reqs.every(u => u.startsWith('file://')) ? 'all local (' + reqs.length + ')' : reqs);
  console.log('errors   :', errs);
  await b.close();
})();
