const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 for (const [w,h] of [[1920,1080],[1440,900],[1280,800],[1100,800],[1024,1366],[834,1112],[430,932],[390,844]]) {
   const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:w<500,hasTouch:w<500});
   const p=await ctx.newPage(); const errs=[];
   p.on('pageerror',e=>errs.push(e.message));
   p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
   await p.goto(B+'/panel/login.php'); await p.waitForTimeout(400);
   await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1100);
   await p.goto(B+'/panel/'); await p.waitForTimeout(2100);
   const m=await p.evaluate(()=>{
     const st=document.querySelector('.stage').getBoundingClientRect();
     const t=document.querySelector('#wRecent .ptab-wrap');
     return {
       stagePct: Math.round(st.width/innerWidth*100),
       overflow: document.body.scrollWidth - document.documentElement.clientWidth,
       tableScroll: t ? t.scrollWidth - t.clientWidth : -1,
       hamburger: getComputedStyle(document.getElementById('railBtn')).display,
       foot: !!document.querySelector('.pfoot'),
       clockFirst: document.querySelector('.prow.r1').firstElementChild.querySelector('h3').textContent.trim()
     };});
   console.log(String(w).padStart(5)+'x'+h, 'stage '+m.stagePct+'%',
     '| overflow', m.overflow, '| table clip', m.tableScroll,
     '| ☰', m.hamburger, '| foot', m.foot, '|', errs.length?errs:'ok');
   await ctx.close();
 }
 await b.close();
})();
