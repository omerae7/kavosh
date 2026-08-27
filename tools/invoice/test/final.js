const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
const FILE='file://'+path.resolve(__dirname,'../../../فاکتور شهریور 1405.html');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:2,acceptDownloads:true});
 const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('C:'+m.text())});
 const reqs=[];ctx.on('request',r=>reqs.push(r.url()));
 await p.goto(FILE);await p.waitForTimeout(700);
 console.log('icons:', await p.evaluate(()=>[...document.querySelectorAll('link[rel*="icon"]')]
   .map(l=>l.rel+' '+(l.sizes.value||'')+' '+l.href.slice(0,30)+'… ('+l.href.length+' chars)')));
 console.log('brand mark:', await p.evaluate(()=>{const i=document.querySelector('.brand-mark');
   return i.tagName+' '+i.naturalWidth+'x'+i.naturalHeight+' rendered '+Math.round(i.getBoundingClientRect().width);}));
 console.log('footer:', await p.evaluate(()=>document.querySelector('.foot').textContent.trim()));
 await p.fill('input[placeholder="مثال: آقای یزدانی"]','آقای احمد');
 await p.fill('input[placeholder="09xxxxxxxxx"]','09121112233');
 const cb=await p.$$('.rowcard .combo input');
 await cb[0].click(); await cb[0].fill('AB51301'); await p.waitForTimeout(200);
 await (await (await p.$$('.rowcard'))[0].$('.combo-item')).click(); await p.waitForTimeout(250);
 await p.evaluate(()=>{const c=document.querySelectorAll('.rowcard')[0];
   const f=[...c.querySelectorAll('.f')].find(f=>f.querySelector('label').textContent.trim().startsWith('مقدار'));
   const i=f.querySelector('input');i.focus();i.value='3724';i.dispatchEvent(new Event('input',{bubbles:true}));i.blur();});
 await p.waitForTimeout(300);
 await p.evaluate(()=>window.scrollTo(0,0));
 await p.screenshot({path:'final-desktop.png'});
 const bar=await p.$('.topbar'); await bar.screenshot({path:'final-topbar.png'});
 // html export still carries icon + logo?
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('#btnHtmlSide')]);
 await dl.saveAs(path.join(__dirname,'final-out.html'));
 const html=fs.readFileSync(path.join(__dirname,'final-out.html'),'utf8');
 console.log('export: size',html.length,'| icon links',(html.match(/rel="icon"/g)||[]).length,
   '| apple-touch',(html.match(/apple-touch-icon/g)||[]).length,'| brand img',(html.match(/class="brand-mark"/g)||[]).length);
 const p2=await ctx.newPage();
 await p2.goto('file://'+path.resolve(__dirname,'final-out.html')); await p2.waitForTimeout(700);
 console.log('reopened export ->', await p2.evaluate(()=>JSON.stringify({
   n:window.Invoice.state().customer.name, q:window.Invoice.state().rows[0].qty,
   icons:document.querySelectorAll('link[rel*="icon"]').length})));
 console.log('requests:', reqs.length, reqs.every(u=>u.startsWith('file://')) ? 'all local' : reqs);
 console.log('errors:', errs);
 // mobile
 const m=await b.newContext({...devices['iPhone 13']});
 const mp=await m.newPage(); await mp.goto(FILE); await mp.waitForTimeout(600);
 await mp.screenshot({path:'final-iphone.png'});
 console.log('mobile overflow:', await mp.evaluate(()=>[document.body.scrollWidth,document.documentElement.clientWidth]));
 await b.close();
})();
