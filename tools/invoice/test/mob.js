const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 for (const d of ['iPhone 13','Pixel 7']) {
   const ctx=await b.newContext({...devices[d]});
   const p=await ctx.newPage();
   const errs=[]; p.on('pageerror',e=>errs.push(e.message));
   for (const [name,url] of [['home','/'],['faktor','/faktor/'],['login','/panel/login.php']]) {
     await p.goto(B+url); await p.waitForTimeout(1500);
     const ov=await p.evaluate(()=>[document.body.scrollWidth, document.documentElement.clientWidth]);
     console.log(d, name.padEnd(7), ov[0]===ov[1] ? 'no overflow' : 'OVERFLOW '+ov.join('/'));
     if (d==='iPhone 13') await p.screenshot({path:'mob-'+name+'.png'});
   }
   // panel needs a session
   await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1600);
   await p.goto(B+'/panel/'); await p.waitForTimeout(1800);
   const ov=await p.evaluate(()=>[document.body.scrollWidth, document.documentElement.clientWidth]);
   console.log(d, 'panel  ', ov[0]===ov[1] ? 'no overflow' : 'OVERFLOW '+ov.join('/'));
   if (d==='iPhone 13') await p.screenshot({path:'mob-panel.png', fullPage:true});
   console.log(d, 'errors :', errs);
   await ctx.close();
 }
 await b.close();
})();
