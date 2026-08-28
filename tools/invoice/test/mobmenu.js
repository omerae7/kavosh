/* What actually receives a tap where the rail and the drawer sit. */
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext({...devices['iPhone 13']})).newPage();
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1300);
 await p.goto(B+'/panel/'); await p.waitForTimeout(2200);

 await p.click('#railBtn'); await p.waitForTimeout(600);
 console.log('rail open :', await p.evaluate(()=>document.getElementById('rail').classList.contains('on')));
 console.log('tap lands on a rail link?', await p.evaluate(()=>{
   const a=[...document.querySelectorAll('.rail a.nav')][2];
   const r=a.getBoundingClientRect();
   const hit=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
   return (hit===a || a.contains(hit)) ? 'YES' : 'NO — ' + hit.className + ' <' + hit.tagName + '>';
 }));
 // tap the dimmed page beside the open menu — the way a thumb closes it
 await p.mouse.click(24, 300); await p.waitForTimeout(600);
 console.log('scrim closes it:', await p.evaluate(()=>!document.getElementById('rail').classList.contains('on')));

 await p.click('#bell'); await p.waitForTimeout(1500);
 console.log('drawer on :', await p.evaluate(()=>document.getElementById('msgDrawer').classList.contains('on')));
 console.log('drawer box:', await p.evaluate(()=>{const r=document.getElementById('msgDrawer').getBoundingClientRect();
   return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)})+' viewport '+innerWidth+'x'+innerHeight;}));
 console.log('tap lands on drawer?', await p.evaluate(()=>{
   const d=document.getElementById('msgDrawer'), r=d.getBoundingClientRect();
   const hit=document.elementFromPoint(r.left+r.width/2, r.top+30);
   return (hit===d || d.contains(hit)) ? 'YES' : 'NO — ' + hit.className + ' <' + hit.tagName + '>';
 }));
 console.log('close button hittable?', await p.evaluate(()=>{
   const c=document.getElementById('msgClose'); if(!c) return 'missing';
   const r=c.getBoundingClientRect();
   const hit=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
   return (hit===c || c.contains(hit)) ? 'YES' : 'NO — ' + hit.className;
 }));
 await b.close();
})();
