/* اختبار فلتر الفترة: تصفية الصفوف، ملخص دواخل/خوارج/رصيد، وتصدير Excel */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('JSDOM: ' + (e && e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

let html = fs.readFileSync('dist/index.html', 'utf8');
function inline(tag, file) {
  const code = fs.readFileSync('dist/' + file, 'utf8');
  html = html.replace(new RegExp('<script[^>]*src="' + tag + '"[^>]*>\\s*<\\/script>'), () => '<script>' + code + '</script>');
}
inline('export\\.js', 'export.js');
inline('app\\.js', 'app.js');
inline('auth-gate-addon\\.js', 'auth-gate-addon.js');
inline('splash\\.js', 'splash.js');
inline('app-lock\\.js', 'app-lock.js');
inline('period\\.js', 'period.js');

const LEDGER = [
  { date: '2026-10-05', type: 'in', amount: 1000, desc: 'دفعة قديمة' },
  { date: '2026-10-20', type: 'out', amount: 300, desc: 'مصروف قديم' },
  { date: '2026-11-02', type: 'in', amount: 500, desc: 'دخل نوفمبر' },
  { date: '2026-11-03', type: 'out', amount: 200, desc: 'مصروف نوفمبر' }
];

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://example.test/',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ configured: false, connected: false }) });
    window.HTMLAnchorElement.prototype.click = function () {};
    window.URL.createObjectURL = () => 'blob:test';
    window.URL.revokeObjectURL = () => {};
    /* بيئة نظيفة: بدون بيانات موردين/عملاء تجريبية حتى تبقى الحسابات معروفة */
    window.localStorage.setItem('app_suppliers', '[]');
    window.localStorage.setItem('app_customers', '[]');
    window.localStorage.setItem('app_partners', '[]');
    window.localStorage.setItem('app_associations', '[]');
    window.localStorage.setItem('app_ledger', JSON.stringify(LEDGER));
    window.localStorage.setItem('app_lock_session', '1');
    window.sessionStorage.setItem('app_splash_shown', '1');
  },
});

const { window } = dom;
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const $$ = (s) => Array.from(doc.querySelectorAll(s));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x ? '  -> ' + x : '')); } };

(async function () {
  await wait(500);
  $('[data-go="ledger"]').click();
  await wait(600);

  console.log('\n[1] شريط الفترة اتحقن');
  const bar = $('[data-period="ledger"]');
  ok('شريط الفترة موجود في الدواخل والخوارج', !!bar);
  ok('فيه من وإلى', !!(bar && bar.querySelector('[data-p-from]') && bar.querySelector('[data-p-to]')));
  ok('فيه أزرار تصدير Excel وPDF', !!(bar && bar.querySelector('[data-p-export="xlsx"]') && bar.querySelector('[data-p-export="pdf"]')));
  ok('الصفوف كلها ظاهرة قبل الفلترة', $$('#ledgerTbody tr').filter((r) => !r.hidden).length >= 4, 'rows=' + $$('#ledgerTbody tr').length);

  console.log('\n[2] فلترة نوفمبر');
  window.__period.setRange('ledger', '2026-11-01', '2026-11-30');
  await wait(200);
  const visible = $$('#ledgerTbody tr').filter((r) => !r.hidden);
  ok('الصفوف اتقلّصت لحركات نوفمبر', visible.length === 2, 'visible=' + visible.length);
  const sum = ($('#periodSum-ledger') || {}).textContent || '';
  ok('ملخص الدواخل 500', sum.indexOf('500') > -1, sum.slice(0, 120));
  ok('ملخص الخوارج 200', sum.indexOf('200') > -1, sum.slice(0, 120));
  const comp = window.__period.compute('ledger');
  ok('دواخل الفترة = 500', comp.inc === 500, 'inc=' + comp.inc);
  ok('خوارج الفترة = 200', comp.out === 200, 'out=' + comp.out);
  ok('رصيد أول الفترة = 700', comp.open === 700, 'open=' + comp.open);
  ok('الرصيد حتى نهاية الفترة = 1000', comp.close === 1000, 'close=' + comp.close);

  console.log('\n[3] كل الفترات');
  window.__period.setRange('ledger', '', '');
  await wait(200);
  ok('كل الصفوف رجعت', $$('#ledgerTbody tr').filter((r) => !r.hidden).length >= 4);

  console.log('\n[4] تصدير Excel للفترة');
  window.__period.setRange('ledger', '2026-11-01', '2026-11-30');
  await wait(150);
  const sheet = window.__period.sheetFor('ledger');
  ok('الورقة فيها رأس الجدول', Array.isArray(sheet.rows) && sheet.rows.length >= 3, 'rows=' + (sheet.rows || []).length);
  ok('الورقة فيها صفوف الفترة بس', sheet.rows.length === 1 + 2 + 6, 'rows=' + sheet.rows.length);
  const done = window.__period.exportPeriod('ledger', 'xlsx');
  await wait(300);
  ok('تصدير Excel اشتغل', done === true);

  console.log('\n[5] لا أخطاء');
  ok('مفيش أخطاء تشغيل', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log('\n========================================');
  console.log('  PASS: ' + pass + '   FAIL: ' + fail);
  console.log('========================================');
  process.exit(fail ? 1 : 0);
})();
