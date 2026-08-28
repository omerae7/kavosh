const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
(async()=>{
 const b=await chromium.launch();
 for (const [n,url] of [['offline','file://'+path.resolve('/home/user/kavosh/فاکتور شهریور 1405.html')],
                        ['online ','http://127.0.0.1:8899/faktor/']]) {
   const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
   const errs=[]; p.on('pageerror',e=>errs.push(e.message));
   await p.goto(url); await p.waitForTimeout(1800);
   await p.evaluate(()=>{const c=document.querySelector('.rowcard');
     c.querySelectorAll('.combo-foot .btn')[0].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));});
   await p.waitForTimeout(400);
   console.log(n, 'manual row:', await p.evaluate(()=>{
     const s=document.querySelector('.rowcard .spec');
     const ins=[...s.querySelectorAll('input.spec-i')];
     return 'box '+(s.classList.contains('editing')?'open':'LOCKED')+
            ' | all editable: '+ins.every(i=>!i.readOnly)+
            ' | focus on code: '+(document.activeElement===ins[0]);}), '| errors:', errs);
   await p.context().close();
 }
 await b.close();
})();
