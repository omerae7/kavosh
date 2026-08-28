/* Opening a filed invoice from the list must edit that record, not add one. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1400);

 await p.goto(B+'/panel/'); await p.waitForTimeout(2200);
 const before = await p.evaluate(async()=>(await fetch('/api/invoices.php?a=list',{credentials:'same-origin'}).then(r=>r.json())).items);
 const target = before[0];
 console.log('before  :', before.length, 'newest', target.id, target.customerName, target.payable);

 // the name cell links to the customer profile
 console.log('namelink:', await p.getAttribute('#wRecent .ptab tbody tr:first-child .nm','href'));

 await p.goto(B+'/panel/invoice.php?open='+encodeURIComponent(target.id)); await p.waitForTimeout(2600);
 console.log('loaded  :', JSON.stringify(await p.evaluate(()=>window.Invoice.state().customer.name)),
             '| docId:', await p.evaluate(()=>window.Invoice.state().docId));
 await p.fill('input[placeholder="مثال: آقای یزدانی"]','آقای موسوی ویرایش‌شده');
 await p.waitForTimeout(400);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('#btnPdfSide')]);
 await dl.saveAs('/tmp/edit.pdf'); await p.waitForTimeout(2200);
 const after = await p.evaluate(async()=>(await fetch('/api/invoices.php?a=list',{credentials:'same-origin'}).then(r=>r.json())).items);
 const same = after.find(x=>x.id===target.id);
 console.log('after   :', after.length, '| same record name:', same && same.customerName);
 console.log('verdict :', after.length===before.length && same.customerName.indexOf('ویرایش')>=0 ? 'EDIT IN PLACE' : 'PROBLEM');
 console.log('errors  :', errs);
 await b.close();
})();
