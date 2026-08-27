const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('C:'+m.text())});
 const reqs=[];ctx.on('request',r=>reqs.push(r.url()));
 await p.goto('file://'+path.resolve(__dirname,'v2-out.html'));
 await p.waitForTimeout(700);
 console.log('title:', await p.title());
 console.log('restored state:', await p.evaluate(()=>{const S=window.Invoice.state();
   return JSON.stringify({name:S.customer.name,date:S.meta.date,
     rows:S.rows.filter(r=>r.code).map(r=>({c:r.code,q:r.qty,u:r.unit,pct:+(r.discPct||0).toFixed(3)})),
     totals:window.Invoice.calc.totals()});}));
 console.log('requests:', reqs);
 // edit + re-export to prove it does not grow
 await p.fill('input[placeholder="مثال: آقای یزدانی"]','آقای احمد ثانی');
 await p.waitForTimeout(300);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('#btnHtmlSide')]);
 await dl.saveAs(path.join(__dirname,'v2-out2.html'));
 const s1=fs.statSync(path.join(__dirname,'v2-out.html')).size, s2=fs.statSync(path.join(__dirname,'v2-out2.html')).size;
 console.log('export sizes:', s1, '->', s2, 'delta', s2-s1);
 console.log('data scripts in re-export:', (fs.readFileSync(path.join(__dirname,'v2-out2.html'),'utf8').match(/id="invoice-data"/g)||[]).length);
 // second generation opens correctly?
 const p2=await ctx.newPage();
 await p2.goto('file://'+path.resolve(__dirname,'v2-out2.html'));
 await p2.waitForTimeout(700);
 console.log('gen2 name:', await p2.evaluate(()=>window.Invoice.state().customer.name));
 console.log('gen2 payable:', await p2.evaluate(()=>window.Invoice.calc.totals().payable));
 console.log('ERRORS:',errs);
 await b.close();
})();
