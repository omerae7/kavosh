/* The clock reel must never run backwards: 9 -> 0 climbs onto a spare 0
   at the end of the strip and only then snaps home with the transition
   off. This records the animation target and the settled position for
   each step, so a downward animation would stand out. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8899/panel/login.php');
  await p.waitForTimeout(500);
  const steps = await p.evaluate(async () => {
    const host = document.createElement('div');
    host.style.fontSize = '20px';
    document.body.appendChild(host);
    const read = () => {
      const reel = host.querySelector('.odo-d i');
      const m = /translateY\((-?[\d.]+)em\)/.exec(reel.style.transform || 'translateY(0em)');
      return m ? parseFloat(m[1]) : 0;
    };
    const out = [];
    Odo.set(host, '7');
    await new Promise(r => setTimeout(r, 650));
    for (const v of ['8', '9', '0', '1', '2']) {
      const from = read();
      Odo.set(host, v);
      const target = read();
      await new Promise(r => setTimeout(r, 650));
      out.push({ show: v, from: from, target: target, settled: read() });
    }
    return out;
  });
  let bad = 0;
  steps.forEach(function (s) {
    if (s.target > s.from) { bad++; console.log('  DOWNWARD:', JSON.stringify(s)); }
  });
  console.log(JSON.stringify(steps, null, 0));
  console.log('direction:', bad ? bad + ' downward move(s)' : 'always upward');
  await b.close();
})();
