const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const B='http://127.0.0.1:8899';
const log=(...a)=>console.log(...a);
async function openRow(p,i){
  const c=await p.$$('.rowcard');
  if(!(await c[i].getAttribute('class')).includes('open')){
    await c[i].$eval('.rowhead', e=>e.click()); await p.waitForTimeout(260);
  }
}
async function fillRow(p,i,code,qty){
  await openRow(p,i);
  const cb=await p.$$('.rowcard .combo input');
  await cb[i].click(); await cb[i].fill(code); await p.waitForTimeout(300);
  const cards=await p.$$('.rowcard');
  const item=await cards[i].$('.combo-item'); if(!item) throw new Error('no product for '+code);
  await item.click(); await p.waitForTimeout(300);
  await p.evaluate(([i,q])=>{const c=document.querySelectorAll('.rowcard')[i];
    const f=[...c.querySelectorAll('.f')].find(f=>f.querySelector('label').textContent.trim().startsWith('مقدار'));
    const inp=f.querySelector('input');inp.focus();inp.value=q;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.blur();},[i,qty]);
  await p.waitForTimeout(350);
}
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:2,acceptDownloads:true});
 const errs=[];
 const p=await ctx.newPage();
 p.on('pageerror',e=>errs.push('PE: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errs.push('C: '+m.text())});

 await p.goto(B+'/'); await p.waitForTimeout(800);
 log('landing title :', await p.title());
 log('landing footer:', (await p.textContent('.home-foot')).trim());
 await p.screenshot({path:'site-home.png'});

 await p.goto(B+'/faktor/'); await p.waitForTimeout(1600);
 log('faktor sections:', await p.evaluate(()=>[...document.querySelectorAll('.card-h h2')].map(h=>h.textContent)));
 log('has section 0 :', await p.evaluate(()=>!!document.querySelector('.sect-0')));
 await p.fill('input[placeholder="مثال: آقای یزدانی"]','آقای کریمی');
 await p.fill('input[placeholder="09xxxxxxxxx"]','09121234567');
 await p.click('.morebtn'); await p.waitForTimeout(250);   // the address block
 await p.fill('input[placeholder="مثال: قم"]','قم');
 await fillRow(p,0,'AB51301','1764');
 await fillRow(p,1,'C-106','12');
 log('totals        :', await p.evaluate(()=>JSON.stringify(window.Invoice.calc.totals())));
 await p.screenshot({path:'site-faktor.png', fullPage:true});
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:25000}),p.click('#btnPdfSide')]);
 await dl.saveAs(path.join(__dirname,'site-out.pdf'));
 await p.waitForTimeout(1500);
 log('filed chip    :', await p.evaluate(()=>{const c=document.getElementById('filedChip');
   return c && c.style.display!=='none' ? c.innerText : '(none)';}));
 log('errors        :', errs);
 await b.close();
})();
