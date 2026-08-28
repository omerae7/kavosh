/* The exact failure: today's markup, yesterday's cached script. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1300);
 await p.goto(B+'/panel/'); await p.waitForTimeout(2500);
 console.log('toast   :', (await p.$('.toast')) ? (await p.textContent('.toast')).trim() : '(none)');
 console.log('cards filled:', await p.evaluate(()=>document.getElementById('wMonth').textContent.trim()));
 console.log('pageerrors:', errs);
 await b.close();
})();
