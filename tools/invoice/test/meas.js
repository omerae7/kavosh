const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext({viewport:{width:1680,height:1000}})).newPage();
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1300);
 await p.goto(B+'/panel/'); await p.waitForTimeout(2400);
 console.log(await p.evaluate(()=>{
   const out={};
   document.querySelectorAll('.prow').forEach((row,i)=>{
     out['row'+(i+1)]=[...row.children].map(c=>{
       const t=c.querySelector('.pc-h h3');
       return (t?t.textContent.trim():'?')+':'+Math.round(c.getBoundingClientRect().height);});
   });
   const w=document.querySelector('.window'), r=document.querySelector('.rail');
   out.window=Math.round(w.getBoundingClientRect().height);
   out.rail=Math.round(r.getBoundingClientRect().height);
   out.page=Math.round(document.body.scrollHeight);
   out.glass=getComputedStyle(w).backdropFilter;
   out.winBg=getComputedStyle(w).backgroundColor;
   return out;
 }));
 await b.close();
})();
