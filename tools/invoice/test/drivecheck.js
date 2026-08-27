/* Which browser capabilities a file:// page actually gets.
 *
 * Answers the "can this save straight to Google Drive?" question with
 * measurements rather than assumptions. What matters:
 *   secureContext / showDirectoryPicker / indexedDB
 *     -> a remembered save folder is possible, so a PDF can land in a
 *        Google Drive for desktop folder in one click
 *   navigator.share
 *     -> reads undefined here because headless Chromium ships no Web Share
 *        at all (undefined over https too); it says nothing about Chrome on
 *        Android, which needs a headed browser to check
 *
 * A Drive API upload is separately impossible from file://: OAuth clients
 * cannot list a null origin, so Google refuses the exchange.
 */
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const path=require('path');
const FILE='file://'+path.resolve(__dirname,'../../../فاکتور شهریور 1405.html');
const probe = () => ({
  origin: location.origin,
  secureContext: window.isSecureContext,
  showSaveFilePicker: typeof window.showSaveFilePicker,
  showDirectoryPicker: typeof window.showDirectoryPicker,
  indexedDB: typeof indexedDB,
  navigatorShare: typeof navigator.share,
  canShareFiles: (() => { try {
      const f = new File([new Blob(['x'],{type:'application/pdf'})],'a.pdf',{type:'application/pdf'});
      return navigator.canShare ? navigator.canShare({files:[f]}) : 'no canShare';
    } catch(e){ return 'err: '+e.message; } })(),
  localStorage: (()=>{ try { localStorage.setItem('_t','1'); return 'ok'; } catch(e){ return 'blocked'; } })()
});
(async()=>{
  const b=await chromium.launch();
  for (const [label, ctxOpts] of [['desktop file://', {}], ['android file://', devices['Pixel 7']]]) {
    const c=await b.newContext(ctxOpts);
    const p=await c.newPage();
    await p.goto(FILE); await p.waitForTimeout(400);
    console.log(label, JSON.stringify(await p.evaluate(probe), null, 1));
    await c.close();
  }
  // same probe over https for comparison
  const c=await b.newContext(); const p=await c.newPage();
  await p.route('**/probe', r=>r.fulfill({status:200,contentType:'text/html',body:'<body>'}));
  await p.goto('https://example.test/probe').catch(e=>console.log('https nav:', e.message.slice(0,60)));
  console.log('https origin', JSON.stringify(await p.evaluate(probe), null, 1));
  await b.close();
})();
