/* Messages must come from messages.json, not from the invoice list. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'), B='http://127.0.0.1:8899';
const DATA='/home/user/kavosh/brickala-data/data';
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));

 // file one from the public page
 await p.goto(B+'/faktor/'); await p.waitForTimeout(1600);
 await p.fill('input[placeholder="مثال: آقای یزدانی"]','آقای پیام‌تست');
 await p.fill('input[placeholder="09xxxxxxxxx"]','09121110000');
 const cb=await p.$$('.rowcard .combo input');
 await cb[0].click(); await cb[0].fill('AB51301'); await p.waitForTimeout(320);
 await (await p.$('.rowcard .combo-item')).click(); await p.waitForTimeout(320);
 await p.evaluate(()=>{const c=document.querySelector('.rowcard');
   const f=[...c.querySelectorAll('.f')].find(f=>f.querySelector('label').textContent.trim().startsWith('مقدار'));
   const i=f.querySelector('input'); i.focus(); i.value='1764';
   i.dispatchEvent(new Event('input',{bubbles:true})); i.blur();});
 await p.waitForTimeout(500);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('#btnPdfSide')]);
 await dl.saveAs('/tmp/m.pdf'); await p.waitForTimeout(1600);

 console.log('messages.json exists :', fs.existsSync(DATA+'/messages.json'));
 const m=JSON.parse(fs.readFileSync(DATA+'/messages.json','utf8'));
 console.log('records              :', m.length, '| newest:', JSON.stringify(m[0].name), m[0].kind);

 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1300);
 await p.goto(B+'/panel/'); await p.waitForTimeout(2200);
 console.log('bell badge           :', await p.textContent('#bellCount'));
 console.log('assistant says       :', (await p.textContent('#wAssist')).replace(/\s+/g,' ').trim().slice(0,52));
 await p.click('#bell'); await p.waitForTimeout(1500);
 console.log('drawer top entry     :', (await p.textContent('.msg-i')).replace(/\s+/g,' ').trim().slice(0,60));

 // re-filing the same invoice must not add a second message
 const before=m.length;
 await p.goto(B+'/panel/invoice.php?open='+encodeURIComponent(JSON.parse(fs.readFileSync(DATA+'/invoices.json','utf8'))[0].id));
 await p.waitForTimeout(2400);
 const [dl2]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('#btnPdfSide')]);
 await dl2.saveAs('/tmp/m2.pdf'); await p.waitForTimeout(1800);
 console.log('after re-file        :', JSON.parse(fs.readFileSync(DATA+'/messages.json','utf8')).length, '(was '+before+')');
 console.log('errors               :', errs);
 await b.close();
})();
