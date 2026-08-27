const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
const FILE = 'file://' + path.resolve(__dirname, '../../../فاکتور شهریور 1405.html');
const log = (...a) => console.log(...a);

async function openRow(page, i){
  const c = await page.$$('.rowcard');
  if(!(await c[i].getAttribute('class')).includes('open')){ await c[i].$eval('.rowhead', e=>e.click()); await page.waitForTimeout(200);} }
async function inRow(page, i, ph){
  const c = await page.$$('.rowcard');
  for(const el of await c[i].$$('input.inp')){ const p = await el.getAttribute('placeholder'); if(p && p.startsWith(ph)) return el; }
  return null; }
async function pick(page,i,q){ await openRow(page,i);
  const combos = await page.$$('.rowcard .combo input');
  await combos[i].click(); await combos[i].fill(q); await page.waitForTimeout(180);
  const c = await page.$$('.rowcard'); await (await c[i].$('.combo-item')).click(); await page.waitForTimeout(220); }
async function setQty(page,i,v){ await openRow(page,i);
  const el = await inRow(page,i,'تعداد ') || await inRow(page,i,'متراژ');
  await el.click(); await el.fill(String(v)); await page.waitForTimeout(220); }
async function rowState(page,i){ return page.evaluate(k=>{const r=window.Invoice.state().rows[k];
  return {qty:r.qty,area:r.area,price:r.price,ref:r.refPrice,pct:r.discPct,fx:r.finalExact,ack:r.ackCarton,mode:r.mode,dt:r.dtMode,
          calc:window.Invoice.calc.row(r), print:window.Invoice.output.discountText(r,window.Invoice.calc.row(r))};},i); }

(async()=>{
  const browser = await chromium.launch();
  const errs=[];
  const ctx = await browser.newContext({viewport:{width:1400,height:1000},deviceScaleFactor:2,acceptDownloads:true});
  const page = await ctx.newPage();
  page.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text());});
  page.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  await page.goto(FILE); await page.waitForTimeout(400);

  await page.fill('input[placeholder="مثال: آقای یزدانی"]','آقای یزدانی');
  await page.fill('input[placeholder="09xxxxxxxxx"]','09131724832');
  await page.fill('input[placeholder="مثال: قم"]','قم / قم');
  await page.$$eval('input.inp', els=>{ }); // noop

  // ---- ROW 1: catalog + area mode 100 m2 ----
  await pick(page,0,'AB51301');
  const cards = await page.$$('.rowcard');
  await (await cards[0].$$('.seg button'))[0].click();  // متر مربع
  await page.waitForTimeout(200);
  await setQty(page,0,'100');
  log('R1 area100 ->', JSON.stringify(await rowState(page,0)));
  log('R1 assistant:\n'+await page.evaluate(()=>document.querySelectorAll('.asst-b')[0].innerText));

  // discount 20% via slider input
  const pct0 = await cards[0].$('.disc-val input');
  await pct0.fill('20'); await pct0.dispatchEvent('input'); await page.waitForTimeout(200);
  log('R1 pct20 ->', JSON.stringify((await rowState(page,0)).calc));

  // final-amount override -> effective pct
  const fin0 = (await cards[0].$$('input.inp')).slice(-1)[0];
  const finals = await cards[0].$$('.rowsection input.inp');
  log('final field count', finals.length);
  await page.evaluate(()=>{
    const c=document.querySelectorAll('.rowcard')[0];
    const labs=[...c.querySelectorAll('.f')].filter(f=>f.querySelector('label') && f.querySelector('label').textContent.includes('مبلغ کل'));
    const inp=labs[0].querySelector('input');
    inp.focus(); inp.value='2,300,000,000';
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    inp.blur();
  });
  await page.waitForTimeout(250);
  log('R1 finalOverride ->', JSON.stringify(await rowState(page,0)));

  // ---- ROW 2: catalog, brick qty exact carton ----
  await pick(page,1,'AB27301');
  await setQty(page,1,'2800');
  log('R2 ->', JSON.stringify(await rowState(page,1)));
  log('R2 assistant:\n'+await page.evaluate(()=>document.querySelectorAll('.asst-b')[1].innerText));

  // ---- ROW 3: manual product ----
  await openRow(page,2);
  await page.evaluate(()=>{
    const c=document.querySelectorAll('.rowcard')[2];
    c.querySelectorAll('.combo-foot .btn')[0].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
  });
  await page.waitForTimeout(250);
  await page.evaluate(()=>{
    const c=document.querySelectorAll('.rowcard')[2];
    const set=(lbl,val)=>{const f=[...c.querySelectorAll('.f')].find(f=>f.querySelector('label')&&f.querySelector('label').textContent.trim().startsWith(lbl));
      const i=f.querySelector('input'); i.focus(); i.value=val; i.dispatchEvent(new Event('input',{bubbles:true})); i.blur();};
    set('کد کالا','X-900'); set('شرح کالا','ملات ویژه نما'); set('واحد','کیسه');
    set('بهای واحد','1250000'); set('تعداد در کارتن','12'); set('مقدار','40');
  });
  await page.waitForTimeout(300);
  log('R3 manual ->', JSON.stringify(await rowState(page,2)));
  log('R3 assistant:\n'+await page.evaluate(()=>document.querySelectorAll('.asst-b')[2].innerText));

  // discount text modes on row 2
  await page.evaluate(()=>{
    const c=document.querySelectorAll('.rowcard')[1];
    const sel=c.querySelector('select.inp'); sel.value='percent'; sel.dispatchEvent(new Event('change',{bubbles:true}));
    const pi=c.querySelector('.disc-val input'); pi.focus(); pi.value='21.35'; pi.dispatchEvent(new Event('input',{bubbles:true})); pi.blur();
  });
  await page.waitForTimeout(250);
  log('R2 percent-mode print text ->', JSON.stringify(await rowState(page,1)));

  log('TOTALS ->', await page.evaluate(()=>JSON.stringify(window.Invoice.calc.totals())));
  log('VALIDATE ->', await page.evaluate(()=>JSON.stringify(window.Invoice.validate.run())));
  await page.screenshot({path:'shot-desktop-full.png', fullPage:true});

  // acknowledge the carton warning on row 3
  await page.evaluate(()=>{
    const b=[...document.querySelectorAll('.rowcard')[2].querySelectorAll('.asst-acts .btn')]
      .find(x=>x.textContent.includes('تأیید همین مقدار'));
    b.click();
  });
  await page.waitForTimeout(250);
  log('VALIDATE after ack ->', await page.evaluate(()=>JSON.stringify(window.Invoice.validate.run())));
  await page.screenshot({path:'shot-desktop-full.png', fullPage:true});

  // ---- PDF ----
  const [dl] = await Promise.all([
    page.waitForEvent('download', {timeout:15000}),
    page.click('#btnPdfTop')
  ]).catch(async e=>{ log('download flow note:', e.message); return [null]; });
  if (dl) { await dl.saveAs(path.join(__dirname,'app-out.pdf')); log('downloaded as', dl.suggestedFilename()); }
  else {
    // maybe a modal blocked it
    log('modal:', await page.evaluate(()=>document.getElementById('modal').classList.contains('on') ? document.getElementById('modalBody').innerText : 'none'));
  }
  log('ERRORS:', errs);
  await browser.close();
})();
