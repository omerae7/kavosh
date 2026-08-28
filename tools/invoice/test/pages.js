/* Every panel page loads, on the new shell, with no console errors. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1500,height:1000}});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push('PE: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errs.push('C: '+m.text())});
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(600);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1500);
 const pages=[['داشبورد','/panel/'],['فاکتورها','/panel/invoices.php'],['مشتریان','/panel/customers.php'],
              ['یادآورها','/panel/reminders.php'],['تنظیمات','/panel/settings.php'],['صدور','/panel/invoice.php']];
 for (const [name,url] of pages) {
   await p.goto(B+url); await p.waitForTimeout(1800);
   const info = await p.evaluate(()=>({
     rail: !!document.querySelector('.rail a.nav[aria-current="page"]') || location.pathname.indexOf('invoice.php')>=0,
     bell: !!document.getElementById('bell'),
     cards: document.querySelectorAll('.pc, .card').length,
     h: document.body.scrollWidth === document.documentElement.clientWidth
   }));
   console.log(name.padEnd(10), 'cards:'+String(info.cards).padEnd(3),
     'rail:'+(info.rail?'y':'n'), 'bell:'+(info.bell?'y':'n'), info.h?'no overflow':'OVERFLOW');
 }
 // the customer profile too
 const href=await p.evaluate(async()=>{
   const r=await fetch('/api/customers.php?a=list',{credentials:'same-origin'}).then(x=>x.json());
   return r.items.length ? '/panel/customer.php?id='+encodeURIComponent(r.items[0].id) : null;});
 if(href){ await p.goto(B+href); await p.waitForTimeout(1600);
   console.log('پروفایل    ', (await p.textContent('.pc-h h3')).trim()); }
 // settings tabs all render
 await p.goto(B+'/panel/settings.php'); await p.waitForTimeout(1500);
 for (const t of ['admins','password','products','data']) {
   await p.evaluate(k=>[...document.querySelectorAll('#tabs button')].find(b=>b.dataset.t===k).click(), t);
   await p.waitForTimeout(1100);
   const txt=(await p.textContent('#pane')).replace(/\s+/g,' ').trim();
   console.log('tab', t.padEnd(9), txt.slice(0,58));
 }
 console.log('errors:', errs);
 await b.close();
})();
