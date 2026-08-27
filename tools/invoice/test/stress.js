const fs = require('fs'), path = require('path');
const E = require('../parts/engine.js');
E.init(JSON.parse(fs.readFileSync(path.join(__dirname,'../data/fontdata.json'))),
       JSON.parse(fs.readFileSync(path.join(__dirname,'../data/unimeta.json'))));
const model = {
  meta:{status:'صادر شده', date:'1405.12.29', preparedBy:'مهندس محمدی‌نژاد'},
  customer:{name:'شرکت مهندسی ساختمانی آسمان‌سازه پارسیان', phone:'021-88776655',
            province:'آذربایجان شرقی / تبریز', postal:'5166616471',
            address:'تبریز، خیابان آزادی، نبش کوچه شهید بهشتی، پلاک ۱۲۴، طبقه سوم، واحد ۹',
            nationalId:'0123456789'},
  rows:[
    {used:true, code:'AB51301', desc:'سفید 7*33', unit:'قالب', qty:999999, unitPrice:9999999,
     gross:9999989000001, final:7999991200001, discountText:'تخفیفات ویژه'},
    {used:true, code:'AB64508', desc:'زرد شاموتی 10*50 تکسچر', unit:'قالب', qty:11760, unitPrice:2400877,
     gross:28234313520, final:22587450816, discountText:'20%'},
    {used:true, code:'X-9000/AL', desc:'قهوه ای تیره آنتیک 6*28 درجه یک', unit:'کیسه', qty:12, unitPrice:250000,
     gross:3000000, final:3000000, discountText:''},
    {used:true, code:'AP112', desc:'شاموتی رندوم 7*33 ال', unit:'قالب', qty:104, unitPrice:1216040,
     gross:126468160, final:100000000, discountText:'تخفیف ویژه نمایشگاه بهاره'},
    {used:false}
  ],
  totals:{gross:10028352781681, discount:2005371130863, payable:8022981650818}
};
fs.writeFileSync(path.join(__dirname,'stress.pdf'), Buffer.from(E.render(model)));
console.log('ok');
