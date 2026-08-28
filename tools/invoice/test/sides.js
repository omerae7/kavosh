/* Which edge each thing sits on. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 // --- spec cells, both editions ---
 for (const [n,url] of [['offline','file://'+path.resolve('/home/user/kavosh/فاکتور شهریور 1405.html')],
                        ['online ',B+'/faktor/']]) {
   const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
   await p.goto(url); await p.waitForTimeout(1800);
   const cb=await p.$$('.rowcard .combo input');
   await cb[0].click(); await cb[0].fill('AB51301'); await p.waitForTimeout(360);
   await (await p.$('.rowcard .combo-item')).click(); await p.waitForTimeout(400);
   console.log(n, await p.evaluate(()=>{
     const cells=[...document.querySelector('.rowcard .spec').querySelectorAll('.spec-c')];
     return cells.slice(0,3).map(c=>{
       const lab=c.querySelector('.spec-l').textContent;
       const inp=c.querySelector('input');
       return lab+' = "'+inp.value+'" ['+getComputedStyle(inp).textAlign+']';
     }).join('  |  ');
   }));
   await p.context().close();
 }
 // --- chat sides ---
 const p=await (await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1300);
 await p.goto(B+'/panel/'); await p.waitForTimeout(2000);
 await p.click('.ai-launch'); await p.waitForTimeout(1300);
 await p.fill('#aiIn','خلاصهٔ این ماه'); await p.press('#aiIn','Enter'); await p.waitForTimeout(1200);
 console.log('chat:', await p.evaluate(()=>{
   const box=document.querySelector('.ai-b').getBoundingClientRect();
   const me=document.querySelector('.ai-m.me').getBoundingClientRect();
   const bot=[...document.querySelectorAll('.ai-m.bot')].pop().getBoundingClientRect();
   const side=r=>(r.left-box.left) < (box.right-r.right) ? 'LEFT' : 'RIGHT';
   const f=document.querySelector('.ai-f').getBoundingClientRect();
   const btn=document.querySelector('.ai-f button').getBoundingClientRect();
   return 'my message: '+side(me)+' | assistant: '+side(bot)+
          ' | send button: '+((btn.left-f.left)<(f.right-btn.right)?'LEFT':'RIGHT');}));
 await p.screenshot({path:'chat-sides.png',clip:(await p.evaluate(()=>{const r=document.querySelector('.ai').getBoundingClientRect();
   return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};}))});
 await b.close();
})();
