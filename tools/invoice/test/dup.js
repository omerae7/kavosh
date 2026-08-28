/* A repeated telephone is never refused, and always reported. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'), B='http://127.0.0.1:8899';
const D='/home/user/kavosh/brickala-data/data';
(async()=>{
 // two customers, one number — as a restore or a hand-edit would leave it
 const cus=JSON.parse(fs.readFileSync(D+'/customers.json','utf8'));
 const twin=JSON.parse(JSON.stringify(cus[0]));
 twin.id='c-twin-test'; twin.name='آقای حسنی'; twin.key='اقای حسنی';
 cus.push(twin);
 fs.writeFileSync(D+'/customers.json', JSON.stringify(cus,null,2));
 console.log('planted    :', twin.phone, 'shared by', cus.filter(c=>c.phone===twin.phone).length, 'customers');

 const b=await chromium.launch();
 const p=await (await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1300);
 await p.goto(B+'/panel/'); await p.waitForTimeout(2300);
 console.log('assistant  :', (await p.textContent('#wAssist')).replace(/\s+/g,' ').trim().slice(0,90));
 await p.click('#bell'); await p.waitForTimeout(1400);
 console.log('drawer top :', (await p.textContent('.msg-i')).replace(/\s+/g,' ').trim().slice(0,80));
 console.log('warn style :', await p.evaluate(()=>!!document.querySelector('.msg-i.warn-src')));
 console.log('links to   :', await p.getAttribute('.msg-i.warn-src','href'));

 // remove the twin: the warning must retire itself
 const back=JSON.parse(fs.readFileSync(D+'/customers.json','utf8')).filter(c=>c.id!=='c-twin-test');
 fs.writeFileSync(D+'/customers.json', JSON.stringify(back,null,2));
 await p.reload(); await p.waitForTimeout(2300);
 console.log('after fix  :', await p.evaluate(async()=>{
   const r=await fetch('/api/messages.php?a=list',{credentials:'same-origin'}).then(x=>x.json());
   return r.items.filter(m=>m.kind==='dup').length + ' duplicate messages left';}));
 console.log('errors     :', errs);
 await b.close();
})();
