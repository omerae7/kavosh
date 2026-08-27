const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../../فاکتور شهریور 1405.html');
(async()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], acceptDownloads:true });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(FILE); await page.waitForTimeout(500);
  await page.fill('input[placeholder="مثال: آقای یزدانی"]','آقای یزدانی');
  await page.screenshot({path:'shot-mobile-1.png'});
  // open row 1 combo
  const combos = await page.$$('.rowcard .combo input');
  await combos[0].click(); await combos[0].fill('سفید 7'); await page.waitForTimeout(250);
  await page.screenshot({path:'shot-mobile-combo.png'});
  const cards = await page.$$('.rowcard');
  await (await cards[0].$('.combo-item')).click(); await page.waitForTimeout(250);
  // qty
  for(const el of await cards[0].$$('input.inp')){ const ph=await el.getAttribute('placeholder'); if(ph&&ph.startsWith('تعداد ')){ await el.fill('3700'); break; } }
  await page.waitForTimeout(300);
  await page.screenshot({path:'shot-mobile-row.png', fullPage:true});
  console.log('viewport', page.viewportSize());
  console.log('body scrollWidth vs clientWidth:', await page.evaluate(()=>[document.body.scrollWidth, document.documentElement.clientWidth]));
  console.log('errors', errs);
  await browser.close();
})();
