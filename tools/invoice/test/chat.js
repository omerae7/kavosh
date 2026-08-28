/* The assistant: greets by page and by name, answers from the data,
   makes a reminder, links as icons, and never appears on the composer. */
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
const strip = s => s.replace(/\s+/g,' ').trim();
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1300);

 await p.goto(B+'/panel/'); await p.waitForTimeout(2200);
 console.log('launcher    :', await p.evaluate(()=>{
   const l=document.querySelector('.ai-launch'); if(!l) return 'MISSING';
   const r=l.getBoundingClientRect();
   return Math.round(r.width)+'x'+Math.round(r.height)+' at left '+Math.round(r.left)+
          ', bottom '+Math.round(innerHeight-r.bottom)+' | badge "'+document.getElementById('aiDot').textContent+'"';}));
 await p.click('.ai-launch'); await p.waitForTimeout(1400);
 console.log('greeting    :', strip(await p.textContent('.ai-m.bot')).slice(0,120));
 console.log('where       :', await p.textContent('#aiWhere'));
 console.log('chips       :', await p.evaluate(()=>[...document.querySelectorAll('.ai-chips button')].map(b=>b.textContent)));
 console.log('panel box   :', await p.evaluate(()=>{const r=document.querySelector('.ai').getBoundingClientRect();
   return Math.round(r.width)+'x'+Math.round(r.height)+' at left '+Math.round(r.left);}));

 async function q(text){
   await p.fill('#aiIn', text); await p.press('#aiIn','Enter'); await p.waitForTimeout(900);
   const msgs = await p.evaluate(()=>[...document.querySelectorAll('.ai-m.bot')].map(m=>m.textContent));
   const links = await p.evaluate(()=>{const all=[...document.querySelectorAll('.ai-m.bot')];
     const last=all[all.length-1]; return [...last.querySelectorAll('.ai-links a')].map(a=>a.getAttribute('href'));});
   console.log('Q:', text, '\n   ->', strip(msgs[msgs.length-1]).slice(0,130), '\n   links:', links);
 }
 await q('پرفروش‌ترین آجر ماه');
 await q('آقای موسوی چقدر خرید کرده؟');
 await q('قیمت AB51301');
 await q('چند فاکتور داریم');

 // a reminder, made from the chat
 await p.fill('#aiIn','یادآور: تماس با انبار شمال'); await p.press('#aiIn','Enter'); await p.waitForTimeout(900);
 console.log('asks back   :', strip(await p.textContent('.ai-m.bot:last-of-type')).slice(0,70));
 await p.click('.ai-act button.go'); await p.waitForTimeout(1200);
 console.log('after yes   :', strip(await p.textContent('.ai-m.bot:last-of-type')).slice(0,70));
 console.log('reminder on server:', await p.evaluate(async()=>{
   const r=await fetch('/api/reminders.php?a=list',{credentials:'same-origin'}).then(x=>x.json());
   return r.items.filter(x=>x.text.indexOf('انبار شمال')>=0).length;}));

 // context changes with the page
 await p.goto(B+'/panel/customers.php'); await p.waitForTimeout(1800);
 await p.click('.ai-launch'); await p.waitForTimeout(1300);
 console.log('on customers:', strip(await p.textContent('.ai-m.bot')).slice(0,110));
 console.log('chips there :', await p.evaluate(()=>[...document.querySelectorAll('.ai-chips button')].map(b=>b.textContent)));

 // never on the composer
 for (const u of ['/panel/invoice.php','/faktor/']) {
   await p.goto(B+u); await p.waitForTimeout(1600);
   console.log('on', u.padEnd(20), 'launcher present:', await p.evaluate(()=>!!document.querySelector('.ai-launch')));
 }
 console.log('errors      :', errs);
 await b.close();
})();
