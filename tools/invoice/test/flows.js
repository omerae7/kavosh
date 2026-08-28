const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
const B='http://127.0.0.1:8899';
const log=(...a)=>console.log(...a);
async function openRow(p,i){const c=await p.$$('.rowcard');
  if(!(await c[i].getAttribute('class')).includes('open')){await c[i].$eval('.rowhead',e=>e.click());await p.waitForTimeout(260);}}
async function fillRow(p,i,code,qty){await openRow(p,i);
  const cb=await p.$$('.rowcard .combo input');
  await cb[i].click(); await cb[i].fill(code); await p.waitForTimeout(300);
  const cards=await p.$$('.rowcard'); await (await cards[i].$('.combo-item')).click(); await p.waitForTimeout(300);
  await p.evaluate(([i,q])=>{const c=document.querySelectorAll('.rowcard')[i];
    const f=[...c.querySelectorAll('.f')].find(f=>f.querySelector('label').textContent.trim().startsWith('مقدار'));
    const inp=f.querySelector('input');inp.focus();inp.value=q;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.blur();},[i,qty]);
  await p.waitForTimeout(350);}
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const errs=[]; const p=await ctx.newPage();
 p.on('pageerror',e=>errs.push('PE: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errs.push('C: '+m.text())});

 // login for panel access
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(600);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1400);

 // ---- HTML export from the web ----
 await p.goto(B+'/faktor/'); await p.waitForTimeout(1600);
 await p.fill('input[placeholder="مثال: آقای یزدانی"]','خانم صادقی');
 await p.fill('input[placeholder="09xxxxxxxxx"]','09355556677');
 await fillRow(p,0,'AB27301','2800');
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:25000}),p.click('#btnHtmlSide')]);
 const out=path.join(__dirname,'web-export.html'); await dl.saveAs(out);
 log('html export    :', fs.statSync(out).size, 'bytes | name:', dl.suggestedFilename());
 await p.waitForTimeout(1200);
 // reopening it offline must restore the invoice
 const p2=await ctx.newPage();
 await p2.goto('file://'+out); await p2.waitForTimeout(1400);
 log('export reopens :', await p2.evaluate(()=>JSON.stringify({
   n:window.Invoice.state().customer.name, q:window.Invoice.state().rows[0].qty,
   pay:window.Invoice.calc.totals().payable})));
 await p2.close();

 // ---- print path ----
 await p.click('#btnPrintSide'); await p.waitForTimeout(4500);
 log('print frame    :', await p.evaluate(()=>!!document.getElementById('printFrame')));

 // ---- server records: one row per invoice, not three ----
 const list=await p.evaluate(()=>fetch('/api/invoices.php?a=list',{credentials:'same-origin'}).then(r=>r.json()));
 log('records        :', list.items.map(x=>x.id+' '+x.customerName+' '+x.payable).join(' | '));

 // ---- PDF download from the panel ----
 await p.goto(B+'/panel/invoices.php'); await p.waitForTimeout(1300);
 const [dl2]=await Promise.all([p.waitForEvent('download',{timeout:20000}),
   p.evaluate(()=>document.querySelector('a[href^="/api/pdf.php"]').click())]);
 const pdf=path.join(__dirname,'server.pdf'); await dl2.saveAs(pdf);
 log('server pdf     :', fs.statSync(pdf).size, 'bytes | starts', fs.readFileSync(pdf).slice(0,4).toString());

 // ---- product edit propagates ----
 await p.goto(B+'/panel/settings.php'); await p.waitForTimeout(1200);
 await p.evaluate(()=>[...document.querySelectorAll('#tabs button')].find(b=>b.dataset.t==='products').click());
 await p.waitForTimeout(1200);
 await p.evaluate(()=>{const i=document.querySelector('#pt input[data-f="p"]');
   i.focus(); i.value='999999'; i.dispatchEvent(new Event('input',{bubbles:true}));});
 await p.click('#pSave'); await p.waitForTimeout(1200);
 const after=await p.evaluate(()=>fetch('/api/products.php?a=list').then(r=>r.json()).then(j=>j.items[0]));
 log('product edit   :', JSON.stringify(after));

 log('errors         :', errs);
 await b.close();
})();
