/* The payable figure must read identically in both editions. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const B='http://127.0.0.1:8899';
const OFFLINE='file://'+path.resolve('/home/user/kavosh/فاکتور شهریور 1405.html');
async function fill(p){
  const cb=await p.$$('.rowcard .combo input');
  await cb[0].click(); await cb[0].fill('AB51301'); await p.waitForTimeout(360);
  await (await p.$('.rowcard .combo-item')).click(); await p.waitForTimeout(360);
  await p.evaluate(()=>{const c=document.querySelector('.rowcard');
    const f=[...c.querySelectorAll('.f')].find(f=>f.querySelector('label').textContent.trim().startsWith('مقدار'));
    const i=f.querySelector('input'); i.focus(); i.value='1764';
    i.dispatchEvent(new Event('input',{bubbles:true})); i.blur();});
  await p.waitForTimeout(600);
}
function probe(){
  const b=document.getElementById('sPay'), row=b.closest('.sum-row.total');
  const cb=getComputedStyle(b), cr=getComputedStyle(row);
  const lab=getComputedStyle(row.querySelector('span'));
  const cur=getComputedStyle(row.querySelector('.sum-cur'));
  return {
    text: b.textContent.trim(),
    children: b.childElementCount,          // 0 = plain text, >0 = odometer reels
    font: cb.fontSize+' / '+cb.fontWeight+' / '+cb.color+' / '+cb.letterSpacing,
    row: cr.padding+' | radius '+cr.borderRadius+' | bg '+cr.backgroundColor+' | mt '+cr.marginTop,
    label: lab.fontSize+' '+lab.color,
    cur: cur.fontSize+' '+cur.color
  };
}
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1500,height:1000}});
 const out={};
 for (const [name,url] of [['offline',OFFLINE],['online',B+'/faktor/']]) {
   const p=await ctx.newPage();
   await p.goto(url); await p.waitForTimeout(1800);
   await fill(p);
   out[name]=await p.evaluate(probe);
   await p.close();
 }
 for (const k of Object.keys(out.offline)) {
   const same = String(out.offline[k])===String(out.online[k]);
   console.log((same?'  same  ':'  DIFF  ')+k.padEnd(9), '| offline:', out.offline[k]);
   if (!same) console.log(' '.repeat(20), '| online :', out.online[k]);
 }
 await b.close();
})();
