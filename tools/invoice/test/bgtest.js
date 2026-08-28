const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 for (const [n,vp] of [['desktop',{width:1680,height:1000}],['tablet portrait',{width:1024,height:1366}],
                       ['iPhone 13',devices['iPhone 13'].viewport],['Pixel 7',{width:412,height:915}]]) {
   const p=await (await b.newContext({viewport:vp})).newPage();
   for (const url of ['/', '/panel/login.php']) {
     await p.goto(B+url); await p.waitForTimeout(700);
     const sel = url==='/' ? '.home-bg' : '.pbg';
     console.log(n.padEnd(16), url.padEnd(19),
       (await p.evaluate(s=>getComputedStyle(document.querySelector(s)).backgroundImage, sel)).split('/').pop().replace(/["')]/g,''));
   }
   await p.context().close();
 }
 await b.close();
})();
