/* How the composer looks the first time someone opens it. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const B='http://127.0.0.1:8899';
const OFF='file://'+path.resolve('/home/user/kavosh/فاکتور شهریور 1405.html');
async function probe(p){
 return p.evaluate(()=>{
   const card = h => [...document.querySelectorAll('.card-h.foldable h2')]
     .find(x=>x.textContent.trim()===h).closest('.card');
   const meta = card('مشخصات فاکتور'), cust = card('مشخصات خریدار');
   const vis = el => el && el.offsetParent !== null;
   const fieldNames = root => [...root.querySelectorAll('.f')]
     .filter(f=>vis(f)).map(f=>f.querySelector('label').textContent.trim().split('(')[0].trim());
   return {
     metaFolded: meta.classList.contains('folded'),
     metaSummary: meta.querySelector('.fold-sum').textContent,
     custFolded: cust.classList.contains('folded'),
     custVisible: fieldNames(cust),
     moreShown: vis(cust.querySelector('.more')),
     moreLabel: cust.querySelector('.morebtn span').textContent
   };});
}
(async()=>{
 const b=await chromium.launch();
 for (const [n,url] of [['offline',OFF],['online ',B+'/faktor/']]) {
   const ctx=await b.newContext({viewport:{width:1400,height:900}});
   const p=await ctx.newPage(); const errs=[];
   p.on('pageerror',e=>errs.push(e.message));
   p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
   await p.goto(url); await p.waitForTimeout(1800);
   const a=await probe(p);
   console.log(n,'fresh   : section1 folded='+a.metaFolded+' summary="'+a.metaSummary+'"');
   console.log(n,'          section2 folded='+a.custFolded+' fields='+JSON.stringify(a.custVisible)+
                 ' more='+a.moreShown+' btn="'+a.moreLabel+'"');

   await p.click('.morebtn'); await p.waitForTimeout(350);
   const c=await probe(p);
   console.log(n,'more    : fields='+JSON.stringify(c.custVisible)+' btn="'+c.moreLabel+'"');

   // the choice survives a reload, and section 1 still opens on request
   await p.reload(); await p.waitForTimeout(1800);
   const d=await probe(p);
   console.log(n,'reload  : more still open='+d.moreShown+' | section1 folded='+d.metaFolded);
   await p.click('.card-h.foldable'); await p.waitForTimeout(300);
   console.log(n,'open s1 :', await p.evaluate(()=>{
     const c=[...document.querySelectorAll('.card-h.foldable h2')].find(x=>x.textContent.trim()==='مشخصات فاکتور').closest('.card');
     return 'body '+c.querySelector('.card-b').offsetHeight+'px';}), '| errors:', errs);
   await ctx.close();
 }
 await b.close();
})();
