const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1300);
 await p.goto(B+'/panel/profile.php'); await p.waitForTimeout(1800);
 console.log('page      :', (await p.textContent('.pbar h1')).replace(/\s+/g,' ').trim());
 await p.fill('#fName','عمر اعرابی'); await p.fill('#fTitle','مدیر فروش');
 await p.fill('#fPhone','09121234567'); await p.fill('#fEmail','omer@brickala.ir');
 await p.click('#pForm button[type=submit]'); await p.waitForTimeout(1200);
 console.log('saved     :', await p.evaluate(async()=>{
   const r=await fetch('/api/profile.php?a=get',{credentials:'same-origin'}).then(x=>x.json());
   return JSON.stringify(r.profile);}));
 // upload a photo through the real input
 const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJUlEQVR4nGP8//8/AymAiSTVowZQxwAWZMGvX78yMjKS5AZKDQAA1DwFT3ZcvhoAAAAASUVORK5CYII=','base64');
 require('fs').writeFileSync('/tmp/av.png', png);
 await p.setInputFiles('#avFile','/tmp/av.png'); await p.waitForTimeout(1600);
 console.log('photo     :', await p.evaluate(async()=>{
   const r=await fetch('/api/profile.php?a=get',{credentials:'same-origin'}).then(x=>x.json());
   const img=await fetch('/api/profile.php?a=avatar',{credentials:'same-origin'});
   return 'stored='+r.profile.photo+' | serve='+img.status+' '+img.headers.get('content-type');}));
 await p.goto(B+'/panel/'); await p.waitForTimeout(1600);
 console.log('top bar   :', await p.evaluate(()=>{
   const av=document.querySelector('.who .av');
   return 'name="'+document.querySelector('.who .nm b').textContent+'" title="'+
     document.querySelector('.who .nm small').textContent+'" photo='+
     (getComputedStyle(av).backgroundImage.indexOf('avatar')>=0);}));
 console.log('logged out avatar :', await p.evaluate(async()=>{
   await fetch('/api/auth.php?a=logout',{method:'POST',credentials:'same-origin'});
   return (await fetch('/api/profile.php?a=avatar',{credentials:'same-origin'})).status;}));
 console.log('errors    :', errs);
 await b.close();
})();
