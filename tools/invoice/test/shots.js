const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const FILE='file://'+path.resolve(__dirname,'../../../فاکتور شهریور 1405.html');
async function fill(page){
  await page.fill('input[placeholder="مثال: آقای یزدانی"]','آقای یزدانی');
  await page.fill('input[placeholder="09xxxxxxxxx"]','09131724832');
  const combos = await page.$$('.rowcard .combo input');
  await combos[0].click(); await combos[0].fill('AB51301'); await page.waitForTimeout(200);
  await (await (await page.$$('.rowcard'))[0].$('.combo-item')).click(); await page.waitForTimeout(250);
  for(const el of await (await page.$$('.rowcard'))[0].$$('input.inp')){
    const ph=await el.getAttribute('placeholder'); if(ph&&ph.startsWith('تعداد ')){ await el.fill('3724'); break; } }
  await page.evaluate(()=>{const c=document.querySelectorAll('.rowcard')[0];
    const pi=c.querySelector('.disc-val input'); pi.focus(); pi.value='22'; pi.dispatchEvent(new Event('input',{bubbles:true})); pi.blur();});
  await page.waitForTimeout(350);
}
(async()=>{
 const b=await chromium.launch();
 const c1=await b.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:2});
 const p1=await c1.newPage(); await p1.goto(FILE); await p1.waitForTimeout(500); await fill(p1);
 await p1.evaluate(()=>window.scrollTo(0,0));
 await p1.screenshot({path:'final-desktop.png'});
 const c2=await b.newContext({...devices['iPhone 13']});
 const p2=await c2.newPage(); await p2.goto(FILE); await p2.waitForTimeout(500); await fill(p2);
 await p2.evaluate(()=>document.querySelectorAll('.rowcard')[0].scrollIntoView({block:'start'}));
 await p2.waitForTimeout(200);
 await p2.screenshot({path:'final-iphone.png'});
 await b.close();
})();
