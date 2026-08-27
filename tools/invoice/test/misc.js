const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../../invoice.html');
(async()=>{
  const browser = await chromium.launch();
  // ---- network guard: nothing must be requested besides the file itself
  const ctx = await browser.newContext({ viewport:{width:1280,height:900} });
  const requests = [];
  ctx.on('request', r => requests.push(r.url()));
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(FILE); await page.waitForTimeout(700);
  console.log('requests made:', requests);

  // ---- persistence
  await page.fill('input[placeholder="مثال: آقای یزدانی"]','خانم رضایی');
  const combos = await page.$$('.rowcard .combo input');
  await combos[0].click(); await combos[0].fill('AB42301'); await page.waitForTimeout(200);
  await (await (await page.$$('.rowcard'))[0].$('.combo-item')).click(); await page.waitForTimeout(200);
  for(const el of await (await page.$$('.rowcard'))[0].$$('input.inp')){
    const ph=await el.getAttribute('placeholder'); if(ph&&ph.startsWith('تعداد ')){ await el.fill('1764'); break; } }
  await page.waitForTimeout(400);
  const before = await page.evaluate(()=>JSON.stringify({c:window.Invoice.state().customer.name, r:window.Invoice.state().rows[0].qty}));
  await page.reload(); await page.waitForTimeout(600);
  const after = await page.evaluate(()=>JSON.stringify({c:window.Invoice.state().customer.name, r:window.Invoice.state().rows[0].qty}));
  console.log('before reload', before, '\nafter  reload', after, before===after ? 'PERSIST OK':'PERSIST FAIL');

  // ---- discount text modes
  const modes = await page.evaluate(()=>{
    const S=window.Invoice.state(); const r=S.rows[0]; const out={};
    ['special','percent','empty','custom'].forEach(m=>{ r.dtMode=m; r.dtText='پرداخت نقدی'; r.discPct=17.5;
      out[m]=window.Invoice.output.discountText(r, window.Invoice.calc.row(r)); });
    r.dtMode='special'; return out;
  });
  console.log('discount text modes:', JSON.stringify(modes));

  // ---- new invoice resets
  await page.click('#btnNew'); await page.waitForTimeout(200);
  await page.evaluate(()=>[...document.querySelectorAll('#modalFoot .btn')][0].click());
  await page.waitForTimeout(300);
  console.log('after reset:', await page.evaluate(()=>JSON.stringify({c:window.Invoice.state().customer.name, r:window.Invoice.state().rows[0].code})));
  console.log('errors', errs);
  await ctx.close();

  // ---- tablet
  const t = await browser.newContext({ ...devices['iPad (gen 7) landscape'] });
  const tp = await t.newPage(); await tp.goto(FILE); await tp.waitForTimeout(600);
  await tp.screenshot({path:'shot-tablet.png'});
  console.log('tablet scrollWidth/client:', await tp.evaluate(()=>[document.body.scrollWidth, document.documentElement.clientWidth]));
  const t2 = await browser.newContext({ ...devices['iPhone 13'] });
  const p2 = await t2.newPage(); await p2.goto(FILE); await p2.waitForTimeout(600);
  await p2.screenshot({path:'shot-iphone.png'});
  console.log('iphone scrollWidth/client:', await p2.evaluate(()=>[document.body.scrollWidth, document.documentElement.clientWidth]));
  await browser.close();
})();
