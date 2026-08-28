const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const B='http://127.0.0.1:8899';
const log=(...a)=>console.log(...a);
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1440,height:1020},deviceScaleFactor:2,acceptDownloads:true});
 const errs=[];
 const p=await ctx.newPage();
 p.on('pageerror',e=>errs.push('PE: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errs.push('C: '+m.text())});

 // ---- login guard ----
 await p.goto(B+'/panel/'); await p.waitForTimeout(600);
 log('unauthenticated ->', p.url().replace(B,''));
 await p.fill('#u','admin'); await p.fill('#p','wrong');
 await p.click('#go'); await p.waitForTimeout(1200);
 log('bad password   :', (await p.textContent('#err')).trim());
 await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1500);
 log('after login    :', p.url().replace(B,''));

 // ---- dashboard ----
 await p.goto(B+'/panel/'); await p.waitForTimeout(2000);
 log('clock          :', await p.textContent('#wClock'));
 log('date           :', await p.textContent('#wDate'));
 log('this month     :', await p.textContent('#wMonth'), '|', await p.textContent('#wMonthName'));
 log('invoices sub   :', await p.textContent('#wInvSub'));
 log('customers sub  :', await p.textContent('#wCusSub'));
 log('chart bars     :', await p.evaluate(()=>document.querySelectorAll('#wChart .bar').length));
 log('assistant      :', (await p.textContent('#wAssist')).replace(/\s+/g,' ').trim().slice(0,140));
 // reminder round-trip
 await p.fill('#remText','تماس با آقای کریمی برای تسویه'); await p.click('#remAdd button[type=submit]');
 await p.waitForTimeout(900);
 log('reminders      :', (await p.textContent('#wRem')).replace(/\s+/g,' ').trim().slice(0,90));
 // note round-trip
 await p.evaluate(()=>{const ta=document.querySelector('[data-note="0"] .note-area');
   ta.value='سفارش پالت اضافه برای انبار'; ta.dispatchEvent(new Event('input',{bubbles:true}));});
 await p.click('[data-note="0"] [data-act="save"]'); await p.waitForTimeout(800);
 log('note saved     :', await p.textContent('[data-note="0"] .note-saved'));
 await p.screenshot({path:'site-panel.png', fullPage:true});

 // ---- panel invoice with section 0 ----
 await p.goto(B+'/panel/invoice.php'); await p.waitForTimeout(1800);
 log('panel section0 :', await p.evaluate(()=>!!document.querySelector('.sect-0')));
 await p.click('.sect-0 .btn.pri');           // کسری بار
 await p.waitForTimeout(700);
 log('search results :', await p.evaluate(()=>document.querySelectorAll('.lookup-item').length));
 await p.click('.lookup-item'); await p.waitForTimeout(1200);
 log('picked customer:', await p.evaluate(()=>window.Invoice.state().customer.name),
     '| kind:', await p.evaluate(()=>window.Invoice.state().kind));
 log('summary        :', (await p.textContent('.lookup-summary')).replace(/\s+/g,' ').trim().slice(0,180));
 await p.screenshot({path:'site-panel-invoice.png', fullPage:true});
 // copy previous rows
 await p.evaluate(()=>{const b=[...document.querySelectorAll('.lk-box .btn')].find(x=>x.textContent.includes('کپی')); if(b) b.click();});
 await p.waitForTimeout(900);
 log('after copy     :', await p.evaluate(()=>JSON.stringify(window.Invoice.state().rows.filter(r=>r.code).map(r=>r.code))));

 // ---- lists ----
 await p.goto(B+'/panel/invoices.php'); await p.waitForTimeout(1200);
 log('invoice rows   :', await p.evaluate(()=>document.querySelectorAll('#tbl tbody tr').length));
 await p.goto(B+'/panel/customers.php'); await p.waitForTimeout(1200);
 log('customer rows  :', await p.evaluate(()=>document.querySelectorAll('#tbl tbody tr').length));
 const href=await p.evaluate(()=>{const a=document.querySelector('a[href^="/panel/customer.php"]'); return a?a.getAttribute('href'):null;});
 if(href){ await p.goto(B+href); await p.waitForTimeout(1200);
   log('profile        :', (await p.textContent('.pcard-h h2')).trim(),
       '|', (await p.textContent('.lk-stats')).replace(/\s+/g,' ').trim().slice(0,90)); }
 await p.goto(B+'/panel/settings.php'); await p.waitForTimeout(1300);
 log('settings admins:', (await p.textContent('#pane')).replace(/\s+/g,' ').trim().slice(0,110));
 await p.screenshot({path:'site-settings.png', fullPage:true});
 log('errors         :', errs);
 await b.close();
})();
