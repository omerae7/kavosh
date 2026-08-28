/* Sections fold, the spec box stays locked until the pencil, and the
   three money fields do not take a keystroke unasked — in both editions. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const TARGETS=[['offline','file://'+path.resolve('/home/user/kavosh/فاکتور شهریور 1405.html')],
               ['online ','http://127.0.0.1:8899/faktor/']];
(async()=>{
 const b=await chromium.launch();
 for (const [name,url] of TARGETS) {
   const ctx=await b.newContext({viewport:{width:1500,height:1000}});
   const p=await ctx.newPage(); const errs=[];
   p.on('pageerror',e=>errs.push(e.message));
   p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
   await p.goto(url); await p.waitForTimeout(1800);

   // fill a row so the summaries have something to say
   await p.fill('input[placeholder="مثال: آقای یزدانی"]','آقای موسوی');
   await p.fill('input[placeholder="09xxxxxxxxx"]','09120001122');
   const cb=await p.$$('.rowcard .combo input');
   await cb[0].click(); await cb[0].fill('AB51301'); await p.waitForTimeout(340);
   await (await p.$('.rowcard .combo-item')).click(); await p.waitForTimeout(400);

   const r = await p.evaluate(()=>{
     const card=document.querySelector('.rowcard');
     const spec=card.querySelector('.spec');
     const ins=[...spec.querySelectorAll('input.spec-i')];
     const money=['بهای واحد','پس از تخفیف','مبلغ کل'].map(()=>null);
     const guarded=[...card.querySelectorAll('.f.guarded')];
     return {
       specCells: ins.length,
       specLabels: [...spec.querySelectorAll('.spec-l')].map(x=>x.textContent),
       specLocked: ins.every(i=>i.readOnly),
       specFull: Math.round(spec.getBoundingClientRect().width) ===
                 Math.round(card.querySelector('.rowsection').getBoundingClientRect().width),
       guardedFields: guarded.length,
       guardedLocked: guarded.every(f=>f.querySelector('.inp').readOnly),
       pens: card.querySelectorAll('.pen').length,
       packGridGone: !card.querySelector('.grid.g3 label')
     };
   });
   console.log(name, 'spec:', r.specCells, 'cells', JSON.stringify(r.specLabels));
   console.log(name, 'spec locked:', r.specLocked, '| full width:', r.specFull,
               '| guarded fields:', r.guardedFields, 'all locked:', r.guardedLocked, '| pencils:', r.pens);

   // the pencil opens the spec box
   await p.click('.rowcard >> nth=0 >> .spec-h .pen'); await p.waitForTimeout(300);
   console.log(name, 'after pencil  :', await p.evaluate(()=>{
     const c=document.querySelector('.rowcard');
     const ins=[...c.querySelectorAll('input.spec-i')];
     return (ins.every(i=>!i.readOnly) ? 'editable' : 'STILL LOCKED') +
            ' | other rows still locked: ' +
            [...document.querySelectorAll('.rowcard')].slice(1)
              .every(r=>[...r.querySelectorAll('input.spec-i')].every(i=>i.readOnly));
   }));

   // the money pencil opens just that one
   await p.click('.rowcard >> nth=0 >> .f.guarded >> nth=0 >> .pen'); await p.waitForTimeout(300);
   console.log(name, 'money pencil  :', await p.evaluate(()=>{
     const f=document.querySelector('.rowcard .f.guarded');
     return f.querySelector('.inp').readOnly ? 'STILL LOCKED' : 'editable, focus='+(document.activeElement===f.querySelector('.inp'));
   }));

   // folding
   const pick = t => `.card-h.foldable:has(h2:text-is("${t}"))`;
   for (const t of ['مشخصات فاکتور','مشخصات خریدار']) {
     const before = await p.evaluate(h=>{const c=[...document.querySelectorAll('.card-h.foldable h2')]
       .find(x=>x.textContent.trim()===h).closest('.card'); return c.querySelector('.card-b').offsetHeight;}, t);
     await p.click(pick(t)); await p.waitForTimeout(350);
     console.log(name, 'fold', t.padEnd(14), await p.evaluate(h=>{
       const c=[...document.querySelectorAll('.card-h.foldable h2')].find(x=>x.textContent.trim()===h).closest('.card');
       return (c.classList.contains('folded')?'folded':'OPEN') + ' | body ' + c.querySelector('.card-b').offsetHeight +
              'px | summary "' + c.querySelector('.fold-sum').textContent + '"';
     }, t), '(was ' + before + 'px)');
     await p.click(pick(t)); await p.waitForTimeout(300);
     console.log(name, 'unfold', t.padEnd(12), await p.evaluate(h=>{
       const c=[...document.querySelectorAll('.card-h.foldable h2')].find(x=>x.textContent.trim()===h).closest('.card');
       return c.querySelector('.card-b').offsetHeight + 'px';}, t));
   }
   console.log(name, 'errors        :', errs);
   await ctx.close();
 }
 await b.close();
})();
