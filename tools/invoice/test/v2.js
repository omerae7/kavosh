const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
const FILE='file://'+path.resolve(__dirname,'../../../فاکتور شهریور 1405.html');
const log=(...a)=>console.log(...a);
async function openRow(p,i){const c=await p.$$('.rowcard');
  if(!(await c[i].getAttribute('class')).includes('open')){await c[i].$eval('.rowhead',e=>e.click());await p.waitForTimeout(200);}}
async function pick(p,i,q){await openRow(p,i);const cb=await p.$$('.rowcard .combo input');
  await cb[i].click();await cb[i].fill(q);await p.waitForTimeout(200);
  const c=await p.$$('.rowcard');await (await c[i].$('.combo-item')).click();await p.waitForTimeout(250);}
async function setField(p,i,labelPrefix,val){
  await p.evaluate(([i,lp,v])=>{const c=document.querySelectorAll('.rowcard')[i];
    const f=[...c.querySelectorAll('.f')].find(f=>f.querySelector('label')&&f.querySelector('label').textContent.trim().startsWith(lp));
    const inp=f.querySelector('input');inp.focus();inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.blur();},[i,labelPrefix,val]);
  await p.waitForTimeout(250);}
async function rowState(p,i){return p.evaluate(k=>{const r=window.Invoice.state().rows[k];
  return {code:r.code,desc:r.desc,unit:r.unit,grout:r.grout,qty:r.qty,price:r.price,pct:r.discPct,c:window.Invoice.calc.row(r)};},i);}

(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:2,acceptDownloads:true});
 const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('C:'+m.text())});
 await p.goto(FILE);await p.waitForTimeout(600);

 await p.fill('input[placeholder="مثال: آقای یزدانی"]','آقای احمد');
 await p.fill('input[placeholder="09xxxxxxxxx"]','09121112233');
 await p.evaluate(()=>{const i=[...document.querySelectorAll('input.inp')].find(x=>x.placeholder==='1405.01.01');
   i.focus();i.value='1405.06.04';i.dispatchEvent(new Event('input',{bubbles:true}));});
 await p.waitForTimeout(200);

 // catalogue size + pallet fix
 log('catalog:', await p.evaluate(()=>{const c=window.Invoice.catalog.all;
   return JSON.stringify({total:c.length, grout:c.filter(x=>x.grout).length,
     ab51001:c.find(x=>x.code==='AB51001'), ar81:c.find(x=>x.code==='AR81').perCarton});}));

 // row1 brick 100 m2
 await pick(p,0,'AB51301');
 const cards=await p.$$('.rowcard');
 await (await cards[0].$$('.seg button'))[0].click(); await p.waitForTimeout(150);
 await setField(p,0,'مقدار','100');
 log('R1:',JSON.stringify(await rowState(p,0)));

 // net unit price -> derives discount
 await setField(p,0,'بهای واحد پس از تخفیف','600000');
 log('R1 after netUnit=600000:',JSON.stringify(await rowState(p,0)));

 // row2 grout powder
 await pick(p,1,'C-106');
 log('R2 grout:',JSON.stringify(await rowState(p,1)));
 log('R2 assistant:\n'+await p.evaluate(()=>document.querySelectorAll('.asst-b')[1].innerText));
 // apply the suggestion
 await p.evaluate(()=>{const b=[...document.querySelectorAll('.rowcard')[1].querySelectorAll('.asst-acts .btn')]
   .find(x=>x.textContent.includes('تنظیم مقدار'));if(b)b.click();});
 await p.waitForTimeout(300);
 log('R2 after suggestion:',JSON.stringify(await rowState(p,1)));

 log('VALIDATE:',await p.evaluate(()=>JSON.stringify(window.Invoice.validate.run())));
 log('filename base:',await p.evaluate(()=>window.Invoice.output.fileBase()));
 await p.screenshot({path:'v2-desktop.png',fullPage:true});

 // --- downloads: pdf + html
 for (const [id,ext] of [['btnPdfSide','pdf'],['btnHtmlSide','html']]) {
   const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('#'+id)]);
   const fn=dl.suggestedFilename();
   await dl.saveAs(path.join(__dirname,'v2-out.'+ext));
   log('downloaded',ext,'->',JSON.stringify(fn),fs.statSync(path.join(__dirname,'v2-out.'+ext)).size,'bytes');
   await p.waitForTimeout(300);
 }
 log('ERRORS:',errs);
 await b.close();
})();
