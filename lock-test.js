/* اختبار قفل دخول التطبيق: إنشاء حساب، دخول، استرجاع 2468، تغيير كلمة المرور */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('JSDOM: ' + (e && e.stack ? e.stack : e)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

let html = fs.readFileSync('dist/index.html', 'utf8');
const app = fs.readFileSync('dist/app.js', 'utf8');
const exp = fs.readFileSync('dist/export.js', 'utf8');
const gate = fs.readFileSync('dist/auth-gate-addon.js', 'utf8');
const lock = fs.readFileSync('dist/app-lock.js', 'utf8');
html = html
  .replace(/<script[^>]*src="export\.js"[^>]*>\s*<\/script>/, () => '<script>' + exp + '</script>')
  .replace(/<script[^>]*src="app\.js"[^>]*>\s*<\/script>/, () => '<script>' + app + '</script>')
  .replace(/<script[^>]*src="auth-gate-addon\.js"[^>]*>\s*<\/script>/, () => '<script>' + gate + '</script>')
  .replace(/<script[^>]*src="app-lock\.js"[^>]*>\s*<\/script>/, () => '<script>' + lock + '</script>');

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
  },
});

const { window } = dom;
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
};
const click = (el) => el && el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const typeIn = (sel, val) => { const el = $(sel); if (el) el.value = val; return !!el; };
const rec = () => JSON.parse(window.localStorage.getItem('app_lock') || 'null');

(async function () {
  await wait(400);

  console.log('\n[1] أول تشغيل: شاشة إنشاء حساب');
  ok('شاشة القفل ظهرت', !!$('#appLock'));
  ok('العنوان إنشاء حساب', ($('#appLock') || {}).textContent.indexOf('إنشاء حساب') > -1);
  ok('فيها اسم وكلمة مرور وتأكيد', !!$('#alName') && !!$('#alPass') && !!$('#alPass2'));
  ok('مفيش حساب محفوظ لسه', !rec());

  console.log('\n[2] تحقق المدخلات');
  typeIn('#alName', 'محمود');
  typeIn('#alPass', '1234');
  typeIn('#alPass2', '9999');
  click($('#alGo'));
  await wait(120);
  ok('اختلاف التأكيد اترفض', !rec() && $('#alErr') && !$('#alErr').hidden, $('#alErr') && $('#alErr').textContent);

  typeIn('#alName', 'محمود');
  typeIn('#alPass', '12');
  typeIn('#alPass2', '12');
  click($('#alGo'));
  await wait(120);
  ok('كلمة مرور قصيرة اترفضت', !rec());

  console.log('\n[3] إنشاء الحساب');
  typeIn('#alName', 'محمود');
  typeIn('#alPass', '1234');
  typeIn('#alPass2', '1234');
  click($('#alGo'));
  await wait(400);
  const r1 = rec();
  ok('الحساب اتحفظ', !!r1 && !!r1.hash);
  ok('الاسم اتحفظ', r1 && r1.name === 'محمود');
  ok('كلمة المرور مش نص صريح', r1 && String(r1.hash).indexOf('1234') === -1, r1 && r1.hash);
  ok('في salt', r1 && !!r1.salt);
  ok('الشاشة اتقفلت بعد الإنشاء', !$('#appLock'));

  console.log('\n[4] الدخول');
  window.__appLock.lock();
  await wait(200);
  ok('شاشة الدخول ظهرت', !!$('#appLock') && $('#appLock').textContent.indexOf('الدخول للتطبيق') > -1);
  typeIn('#alPass', 'غلط');
  click($('#alGo'));
  await wait(300);
  ok('كلمة مرور غلط اترفضت', !!$('#appLock') && ($('#alErr').textContent || '').indexOf('غير صحيحة') > -1, $('#alErr').textContent);
  typeIn('#alPass', '1234');
  click($('#alGo'));
  await wait(400);
  ok('كلمة المرور الصح فتحت التطبيق', !$('#appLock'));

  console.log('\n[5] نسيت كلمة المرور → مفتاح 2468');
  window.__appLock.lock();
  await wait(200);
  click($('#alForgot'));
  await wait(200);
  ok('شاشة الاسترجاع ظهرت', !!$('#alMaster'));
  typeIn('#alMaster', '1111');
  typeIn('#alPass', '5678');
  typeIn('#alPass2', '5678');
  click($('#alGo'));
  await wait(300);
  ok('مفتاح استرجاع غلط اترفض', !!$('#appLock') && rec().hash === r1.hash);
  typeIn('#alMaster', '2468');
  typeIn('#alPass', '5678');
  typeIn('#alPass2', '5678');
  click($('#alGo'));
  await wait(400);
  ok('مفتاح 2468 عيّن كلمة جديدة', !$('#appLock') && rec().hash !== r1.hash);
  window.__appLock.lock();
  await wait(200);
  typeIn('#alPass', '5678');
  click($('#alGo'));
  await wait(400);
  ok('الدخول بكلمة المرور الجديدة نجح', !$('#appLock'));

  console.log('\n[6] تغيير كلمة المرور من الإعدادات');
  click($('[data-go="settings"]'));
  await wait(300);
  ok('لوحة كلمة مرور التطبيق ظهرت', !!$('#appPwdPanel'));
  typeIn('#appPwdOld', 'خطأ');
  typeIn('#appPwdNew', '9876');
  typeIn('#appPwdNew2', '9876');
  click($('#appPwdSave'));
  await wait(400);
  ok('كلمة المرور الحالية الغلط اترفضت', ($('#appPwdErr').textContent || '').indexOf('غير صحيحة') > -1, $('#appPwdErr').textContent);
  typeIn('#appPwdOld', '5678');
  typeIn('#appPwdNew', '9876');
  typeIn('#appPwdNew2', '9876');
  const before = rec().hash;
  click($('#appPwdSave'));
  await wait(500);
  ok('اتغيرت من الإعدادات', rec().hash !== before);
  ok('الحقول اتفضّت بعد التغيير', ($('#appPwdOld') || {}).value === '');
  window.__appLock.lock();
  await wait(200);
  typeIn('#alPass', '9876');
  click($('#alGo'));
  await wait(400);
  ok('الدخول بكلمة المرور الجديدة من الإعدادات نجح', !$('#appLock'));

  console.log('\n[7] زر القفل الآن + لا أخطاء');
  click($('[data-go="settings"]'));
  await wait(250);
  click($('#appPwdLock'));
  await wait(250);
  ok('زر «قفل التطبيق الآن» شغال', !!$('#appLock'));
  ok('لا أخطاء تشغيل', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log('\n========================================');
  console.log('  PASS: ' + pass + '   FAIL: ' + fail);
  console.log('========================================');
  process.exit(fail ? 1 : 0);
})();
