const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
const B='http://127.0.0.1:8899';
const log=(...a)=>console.log(...a);
async function openRow(p,i){const c=await p.$$('.rowcard');
  if(!(await c[i].getAttribute('class')).includes('open')){await c[i].$eval('.rowhead',e=>e.click());await p.waitForTimeout(260);}}
async function fillRow(p,i,code,qty){await openRow(p,i);
  const cb=await p.$$('.rowcard .combo input');
  await cb[i].click(); await cb[i].fill(code); await p.waitForTimeout(320);
  const cards=await p.$$('.rowcard'); await (await cards[i].$('.combo-item')).click(); await p.waitForTimeout(320);
  await p.evaluate(([i,q])=>{const c=document.querySelectorAll('.rowcard')[i];
    const f=[...c.querySelectorAll('.f')].find(f=>f.querySelector('label').textContent.trim().startsWith('مقدار'));
    const inp=f.querySelector('input');inp.focus();inp.value=q;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.blur();},[i,qty]);
  await p.waitForTimeout(380);}
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1560,height:1040},deviceScaleFactor:2,acceptDownloads:true});
 const errs=[]; const p=await ctx.newPage();
 p.on('pageerror',e=>errs.push('PE: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errs.push('C: '+m.text())});

 // an invoice from the PUBLIC page becomes a message for the admin
 await p.goto(B+'/faktor/'); await p.waitForTimeout(1700);
 await p.fill('input[placeholder="مثال: آقای یزدانی"]','آقای موسوی');
 await p.fill('input[placeholder="09xxxxxxxxx"]','09120001122');
 await fillRow(p,0,'AB51301','1764');
 log('summary payable class:', await p.evaluate(()=>{const b=document.getElementById('sPay');
   const cs=getComputedStyle(b); return b.className+' | '+cs.fontSize+' | '+cs.color;}));
 await p.screenshot({path:'v3-summary.png', clip:{x:1100,y:80,width:420,height:520}});
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:25000}),p.click('#btnPdfSide')]);
 await dl.saveAs(path.join(__dirname,'v3.pdf'));
 await p.waitForTimeout(1400);

 // a fresh visit must NOT show that customer again
 await p.goto(B+'/faktor/'); await p.waitForTimeout(1700);
 log('fresh /faktor name :', JSON.stringify(await p.evaluate(()=>window.Invoice.state().customer.name)));

 // ---- panel ----
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(700);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1600);
 await p.goto(B+'/panel/'); await p.waitForTimeout(2200);
 log('bell badge         :', await p.evaluate(()=>document.getElementById('bellCount').textContent||'(none)'));
 log('assistant          :', (await p.textContent('#wAssist')).replace(/\s+/g,' ').trim().slice(0,120));
 log('date in list       :', await p.evaluate(()=>{const d=document.querySelector('#wRecent .jdate');
   return d? d.textContent.trim() : '(none)';}));
 await p.screenshot({path:'v3-panel.png', fullPage:true});

 // messages drawer marks them read
 await p.click('#bell'); await p.waitForTimeout(1400);
 log('drawer             :', (await p.textContent('#msgList')).replace(/\s+/g,' ').trim().slice(0,130));
 await p.screenshot({path:'v3-messages.png'});
 await p.keyboard.press('Escape'); await p.waitForTimeout(400);
 await p.reload(); await p.waitForTimeout(2000);
 log('badge after read   :', await p.evaluate(()=>document.getElementById('bellCount').textContent||'(cleared)'));

 // notes persist
 // a written note is locked, so unlock it first — that is the intended guard
 await p.evaluate(()=>{const e=document.querySelector('[data-note="0"] [data-act="edit"]');
   if(e && e.style.display!=='none') e.click();});
 await p.waitForTimeout(200);
 await p.evaluate(()=>{const ta=document.querySelector('[data-note="0"] .note-area');
   ta.value='سفارش پالت برای انبار شمال '+Date.now()%1000; ta.dispatchEvent(new Event('input',{bubbles:true}));});
 await p.click('[data-note="0"] [data-act="save"]'); await p.waitForTimeout(900);
 await p.reload(); await p.waitForTimeout(2000);
 log('note after reload  :', JSON.stringify(await p.evaluate(()=>document.querySelector('[data-note="0"] .note-area').value)));

 // clock reels only climb
 log('clock             :', await p.evaluate(()=>document.getElementById('wClock').dataset.odo));
 log('errors            :', errs);
 await b.close();
})();
