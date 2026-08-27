const fs = require('fs');
const path = require('path');
const E = require('../parts/engine.js');
const fontData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/fontdata.json')));
const uni = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/unimeta.json')));
E.init(fontData, uni);

const model = {
  meta: { status: 'پیش نویس', date: '1405.05.24', preparedBy: '' },
  customer: { name: 'آقای یزدانی', phone: '09131724832', province: '', postal: '', address: '', nationalId: '' },
  rows: [
    { used: true, code: 'ab51301', desc: 'سفید 7*33', qty: 10584, unit: 'قالب',
      unitPrice: 568334, gross: 6015247056, discountText: 'تخفیفات ویژه', final: 4570000000 },
    {}, {}, {}, {}
  ],
  totals: { gross: 6015247056, discount: 1445247056, payable: 4570000000 }
};
const bytes = E.render(model);
fs.writeFileSync(path.join(__dirname, 'out.pdf'), Buffer.from(bytes));
console.log('wrote', bytes.length, 'bytes');
