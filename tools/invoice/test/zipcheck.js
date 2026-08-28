/* Drive the extracted ZIP the way a new install would be used. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8961';
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext({viewport:{width:1400,height:900},acceptDownloads:true})).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push('PE:'+e.message));
 p.on('console',m=>{if(m.type()==='error')errs.push('C:'+m.text())});

 await p.goto(B+'/faktor/'); await p.waitForTimeout(1800);
 console.log('composer defaults:', await p.evaluate(()=>{
   const card=h=>[...document.querySelectorAll('.card-h.foldable h2')].find(x=>x.textContent.trim()===h).closest('.card');
   const cust=card('مشخصات خریدار');
   return 'section1 folded='+card('مشخصات فاکتور').classList.contains('folded')+
          ' | buyer fields='+[...cust.querySelectorAll('.f')].filter(f=>f.offsetParent).length+
          ' | more hidden='+(cust.querySelector('.more').offsetParent===null);}));

 await p.fill('input[placeholder="مثال: آقای یزدانی"]','آقای آزمایشی');
 await p.fill('input[placeholder="09xxxxxxxxx"]','09121110000');
 const cb=await p.$$('.rowcard .combo input');
 await cb[0].click(); await cb[0].fill('AB51301'); await p.waitForTimeout(360);
 await (await p.$('.rowcard .combo-item')).click(); await p.waitForTimeout(400);
 await p.evaluate(()=>{const c=document.querySelector('.rowcard');
   const f=[...c.querySelectorAll('.f')].find(f=>f.querySelector('label').textContent.trim().startsWith('مقدار'));
   const i=f.querySelector('input'); i.focus(); i.value='1764';
   i.dispatchEvent(new Event('input',{bubbles:true})); i.blur();});
 await p.waitForTimeout(500);
 console.log('totals           :', await p.evaluate(()=>JSON.stringify(window.Invoice.calc.totals())));
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('#btnPdfSide')]);
 const fs=require('fs'); const path=await dl.path();
 console.log('pdf              :', fs.statSync(path).size+' bytes, starts',
   fs.readFileSync(path).slice(0,5).toString());
 await p.waitForTimeout(1500);

 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(600);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1600);
 await p.goto(B+'/panel/'); await p.waitForTimeout(2400);
 console.log('panel            :', await p.evaluate(()=>
   'cards='+document.querySelectorAll('.pc').length+' launcher='+!!document.querySelector('.ai-launch')));
 await p.click('.ai-launch'); await p.waitForTimeout(1500);
 console.log('assistant        :', (await p.textContent('.ai-m.bot')).replace(/\s+/g,' ').trim().slice(0,80));
 await p.fill('#aiIn','پرفروش‌ترین آجر ماه'); await p.press('#aiIn','Enter'); await p.waitForTimeout(1100);
 console.log('answer           :', (await p.evaluate(()=>[...document.querySelectorAll('.ai-m.bot')].pop().textContent)).replace(/\s+/g,' ').trim().slice(0,70));
 for (const u of ['/panel/invoices.php','/panel/customers.php','/panel/reminders.php','/panel/settings.php','/panel/profile.php','/panel/invoice.php']) {
   await p.goto(B+u); await p.waitForTimeout(1500);
 }
 console.log('errors           :', errs);
 await b.close();
})();
