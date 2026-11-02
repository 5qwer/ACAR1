/* اختبار طبقة الإنقاذ: لو الواجهة ما اشتغلتش تظهر رسالة بدل الشاشة الفاضية */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const htmlSrc = fs.readFileSync('dist/index.html', 'utf8');
const appSrc = fs.readFileSync('dist/app.js', 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  -> ' + extra : '')); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function boot(appJs) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', () => {});
  const html = htmlSrc.replace(
    /<script[^>]*src="export\.js"[^>]*>\s*<\/script>/,
    () => '<script></script>'
  ).replace(
    /<script[^>]*src="app\.js"[^>]*>\s*<\/script>/,
    () => '<script>' + appJs + '</script>'
  ).replace(
    /<script[^>]*src="auth-gate-addon\.js"[^>]*>\s*<\/script>/,
    () => '<script></script>'
  );
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://example.test/',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ connected: true }) });
      window.HTMLCanvasElement.prototype.getContext = function () { return null; };
      window.URL.createObjectURL = () => 'blob:test';
      window.URL.revokeObjectURL = () => {};
    },
  });
  return dom.window;
}

(async function () {
  console.log('\n[1] التطبيق شغال → الطبقة بتفضل مخفية');
  const good = boot(appSrc);
  await wait(3200);
  const gBox = good.document.getElementById('bootHelp');
  ok('الطبقة مخفية', gBox.style.display === 'none', 'display=' + gBox.style.display);
  ok('الواجهة اشتغلت فعلًا', good.document.getElementById('view-home').innerHTML.length > 200);

  console.log('\n[2] السكربت فشل → الطبقة بتظهر مع السبب');
  const bad = boot("throw new Error('boom-test');");
  await wait(3200);
  const bBox = bad.document.getElementById('bootHelp');
  const bErr = bad.document.getElementById('bootHelpErr');
  ok('الطبقة ظهرت', bBox.style.display === 'flex', 'display=' + bBox.style.display);
  ok('السبب اتكتب', /boom-test/.test(bErr.textContent), bErr.textContent);
  ok('فيه زر التحديث', !!bad.document.querySelector('[data-boot-retry="page"]'));
  ok('فيه زر مسح الكاش', !!bad.document.querySelector('[data-boot-retry="cache"]'));

  console.log('\n[3] لو ظهرت بالغلط بتخفى تاني لوحدها');
  const recovered = boot(appSrc);
  await wait(3100);                                        /* بعد أول فحص */
  recovered.document.getElementById('bootHelp').style.display = 'flex'; /* محاكاة ظهور */
  await wait(3400);                                        /* تمرق 6 ثوانٍ → الفحص التاني */
  ok('الطبقة اتخطفت بعد ما التطبيق أثبت إنه شغال',
    recovered.document.getElementById('bootHelp').style.display === 'none',
    'display=' + recovered.document.getElementById('bootHelp').style.display);

  console.log('\n==================================================');
  console.log(`  PASS: ${pass}   FAIL: ${fail}`);
  console.log('==================================================');
  process.exit(fail ? 1 : 0);
})();
