/* The sheet must react to the visual viewport, which is what a software
   keyboard actually changes. */
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext({...devices['iPhone 13']})).newPage();
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1300);
 await p.goto(B+'/panel/'); await p.waitForTimeout(2000);
 await p.click('.ai-launch'); await p.waitForTimeout(1200);
 console.log('media     :', await p.evaluate(()=>matchMedia('(max-width:640px)').matches + ' | width ' + innerWidth));
 console.log('sheets    :', await p.evaluate(()=>[...document.styleSheets].map(s=>(s.href||'inline').split('/').pop()).join(', ')));
 console.log('chat.css  :', await p.evaluate(()=>{
   const sh=[...document.styleSheets].find(s=>(s.href||'').indexOf('chat.css')>=0);
   if (!sh) return 'NOT LOADED';
   let rules; try { rules=sh.cssRules; } catch(e){ return 'unreadable'; }
   const media=[...rules].filter(r=>r.media).map(r=>r.media.mediaText+' {'+[...r.cssRules].map(x=>x.selectorText).join(', ')+'}');
   return rules.length+' rules | media blocks: '+JSON.stringify(media);}));
 console.log('vars set  :', await p.evaluate(()=>{
   const a=document.querySelector('.ai');
   return 'kb='+a.style.getPropertyValue('--ai-kb')+' vh='+a.style.getPropertyValue('--ai-vh');}));
 // pretend the keyboard took 320px of the visual viewport
 console.log('simulated :', await p.evaluate(()=>{
   const vv=window.visualViewport, a=document.querySelector('.ai');
   Object.defineProperty(vv,'height',{value:vv.height-320,configurable:true});
   vv.dispatchEvent(new Event('resize'));
   return 'set';}));
 await p.waitForTimeout(500);   // both the lift and the resize are animated
 console.log('settled   :', await p.evaluate(()=>{
   const a=document.querySelector('.ai');
   const cs=getComputedStyle(a);
   return 'kb='+a.style.getPropertyValue('--ai-kb')+' vh='+a.style.getPropertyValue('--ai-vh')+
          ' | transform='+cs.transform+' height='+cs.height+
          ' | bottom gap '+Math.round(innerHeight-a.getBoundingClientRect().bottom)+'px';}));
 console.log('input still reachable:', await p.evaluate(()=>{
   const r=document.querySelector('#aiIn').getBoundingClientRect();
   return r.bottom <= window.visualViewport.height + 1;}));
 await b.close();
})();
