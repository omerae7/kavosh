const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const B='http://127.0.0.1:8899';
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
 await p.goto(B+'/panel/login.php'); await p.waitForTimeout(500);
 await p.fill('#u','admin'); await p.fill('#p','admin'); await p.click('#go'); await p.waitForTimeout(1300);
 const d=await p.evaluate(()=>fetch('/api/assistant.php',{credentials:'same-origin'}).then(r=>r.json()));
 console.log('keys      :', Object.keys(d).join(', '));
 console.log('totals    :', JSON.stringify(d.totals));
 console.log('this month:', JSON.stringify(d.monthTotals));
 console.log('top brick :', JSON.stringify(d.bricks[0]));
 console.log('bricks    :', d.bricks.length, '| people:', d.people.length, '| products:', d.products.length);
 console.log('person 1  :', JSON.stringify({n:d.people[0].name,inv:d.people[0].invoices,pay:d.people[0].payable,qty:d.people[0].qty,bricks:d.people[0].bricks.map(x=>x.code)}));
 console.log('months    :', d.months.length, d.months.slice(-3).map(m=>m.label+':'+m.invoices).join(' '));
 console.log('me        :', d.me.name, '|', d.me.title);
 console.log('product   :', JSON.stringify(d.products[0]));
 await b.close();
})();
