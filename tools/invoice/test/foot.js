const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 for (const [w,h,page] of [[1680,1000,'/panel/'],[1680,1000,'/panel/settings.php'],
                           [1024,1366,'/panel/'],[390,844,'/panel/']]) {
   const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:w<500,hasTouch:w<500});
   const p=await ctx.newPage();
   await p.goto(B+'/panel/login.php'); await p.waitForTimeout(400);
   await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1100);
   await p.goto(B+page); await p.waitForTimeout(2000);
   console.log(String(w)+'x'+h, page.padEnd(21), await p.evaluate(()=>{
     const f=document.querySelector('.pfoot').getBoundingClientRect();
     const w=document.querySelector('.window').getBoundingClientRect();
     return 'window ends '+Math.round(w.bottom)+' | footer '+Math.round(f.top)+'–'+Math.round(f.bottom)+
            ' | page '+Math.round(document.body.scrollHeight)+
            ' | gap under window '+Math.round(f.top-w.bottom);
   }));
   await ctx.close();
 }
 await b.close();
})();
