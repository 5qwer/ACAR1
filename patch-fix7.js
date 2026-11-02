/* إصلاح: استدعاء بارامتري واحد $('...') المفروض $$('...') في مسار فشل فتح الرئيسية */
const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

const OLD = `    try { console.error('فشل فتح الرئيسية: ' + (e && e.message ? e.message : e)); } catch (e2) {}
    $('.view').forEach(function (v) { v.classList.toggle('is-active', v.id === 'view-home'); });`;

const NEW = `    try { console.error('فشل فتح الرئيسية: ' + (e && e.message ? e.message : e)); } catch (e2) {}
    $$('.view').forEach(function (v) { v.classList.toggle('is-active', v.id === 'view-home'); });`;

const c = app.split(OLD).length - 1;
if (c !== 1) throw new Error('count=' + c);
/* لازم function: الاستبدال النصي بيحوّل $$ لـ $ */
app = app.replace(OLD, function () { return NEW; });
fs.writeFileSync('app.js', app);
console.log("  OK  $$('...') fallback");
