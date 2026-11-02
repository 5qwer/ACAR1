/* حماية نهائية: الشاشة الفاضية ما تبقاش صامتة + تحديث نسخة الكاش */
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
let sw = fs.readFileSync('sw.js', 'utf8');
let n = 0;

function rep(file, what, oldStr, newStr) {
  const target = file === 'sw' ? sw : html;
  const c = target.split(oldStr).length - 1;
  if (c !== 1) throw new Error(`[${file}] count=${c} :: ${what}`);
  if (file === 'sw') sw = sw.replace(oldStr, newStr);
  else html = html.replace(oldStr, newStr);
  n++;
  console.log('  OK  ' + what);
}

/* 1) التقاط أول خطأ من أول لحظة (قبل ما app.js يشتغل) */
rep('html', 'head error capture',
  `<link rel="stylesheet" href="styles.css" />
</head>`,
  `<link rel="stylesheet" href="styles.css" />
<script>
  /* نلتقط أول خطأ من أول لحظة عشان لو الواجهة ما اشتغلتش نعرض السبب بدل شاشة فاضية */
  window.__bootErr = null;
  window.addEventListener('error', function (e) {
    if (window.__bootErr) return;
    var f = e && e.filename ? String(e.filename).split('/').pop() : '';
    window.__bootErr = ((e && e.message) ? e.message : 'خطأ غير معروف') + (f ? ' @ ' + f + ':' + (e.lineno || 0) : '');
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    if (window.__bootErr) return;
    window.__bootErr = 'رفض وعد غير معالج: ' + ((e && e.reason && e.reason.message) ? e.reason.message : String(e.reason || ''));
  });
</script>
</head>`);

/* 2) طبقة إنقاذ: لو الواجهة فاضية بعد ثانيتين نقول للمستخدم بدل الصمت */
rep('html', 'boot help overlay',
  `<!-- ===== تنبيهات ===== -->`,
  `<!-- ===== طبقة إنقاذ: بدل الشاشة الفاضية ===== -->
<div id="bootHelp" style="display:none;position:fixed;inset:0;z-index:9999998;background:rgba(6,9,16,.92);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:20px;">
  <div style="background:linear-gradient(180deg,#151b26,#0a0e15);border:1px solid #4f8cff;border-radius:22px;padding:32px 28px;max-width:560px;width:100%;text-align:center;">
    <div style="font-size:40px;margin-bottom:8px">⚠️</div>
    <h2 style="color:#f2f6fb;margin-bottom:10px;font-size:21px">الواجهة ما اشتغلتش</h2>
    <p style="color:#9fadc2;margin-bottom:16px;font-size:14px;line-height:1.9">
      الصفحة اتفتحت لكن محتوى الأقسام ما ظهرش. غالباً المتصفح ماسك نسخة قديمة مخزّنة أو حصل خطأ أثناء التحميل.
      البيانات محفوظة وما اتأثرتش.
    </p>
    <div id="bootHelpErr" style="display:none;margin-bottom:16px;padding:12px 14px;border-radius:12px;border:1px solid #f87171;background:rgba(248,113,134,.1);color:#fecaca;font-size:12.5px;line-height:1.9;text-align:left;direction:ltr;word-break:break-word;"></div>
    <div style="display:flex;gap:10px;flex-direction:column">
      <button type="button" data-boot-retry="page" style="width:100%;padding:14px;background:linear-gradient(90deg,#4f8cff,#7aa8ff);color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:15px">تحديث الصفحة</button>
      <button type="button" data-boot-retry="cache" style="width:100%;padding:13px;background:transparent;border:1px solid #33415a;border-radius:12px;color:#9fadc2;font-weight:600;cursor:pointer;font-size:13.5px">مسح الكاش القديم ثم التحديث</button>
    </div>
  </div>
</div>

<!-- ===== تنبيهات ===== -->`);

/* 3) السكربت اللي بيقرر: الظهر ولا الإخفاء + أزرار الإنقاذ */
rep('html', 'boot watchdog script',
  `  /* تسجيل Service Worker ليعمل التطبيق مثبتاً على أندرويد/الديسكتوب بدون إنترنت */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
</script>`,
  `  /* تسجيل Service Worker ليعمل التطبيق مثبتاً على أندرويد/الديسكتوب بدون إنترنت */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  /* ---------- مراقب الإقلاع: لو الواجهة فاضية نعرض رسالة بدل الصمت ---------- */
  (function () {
    var checked = false;
    function check() {
      var box = document.getElementById('bootHelp');
      if (!box) return;
      var home = document.getElementById('view-home');
      var ready = !!(home && home.innerHTML.length > 200 && document.querySelector('.view.is-active'));
      if (ready) { box.style.display = 'none'; checked = true; return; }
      var err = document.getElementById('bootHelpErr');
      if (err) {
        if (window.__bootErr) { err.style.display = 'block'; err.textContent = 'خطأ: ' + window.__bootErr; }
        else { err.style.display = 'block'; err.textContent = 'مفيش خطأ مسجّل —غالباً نسخة قديمة مخزّنة في المتصفح.'; }
      }
      box.style.display = 'flex';
      checked = true;
    }
    setTimeout(check, 2500);
    setTimeout(check, 6000);

    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-boot-retry]') : null;
      if (!t) return;
      if (t.getAttribute('data-boot-retry') !== 'cache') { location.reload(); return; }
      t.disabled = true;
      t.textContent = 'جارِ المسح…';
      var done = function () { location.reload(); };
      var p1 = (navigator.serviceWorker && navigator.serviceWorker.getRegistrations)
        ? navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); })
        : Promise.resolve();
      var p2 = (typeof caches !== 'undefined' && caches.keys)
        ? caches.keys().then(function (k) { return Promise.all(k.map(function (c) { return caches.delete(c); })); })
        : Promise.resolve();
      Promise.all([p1, p2]).then(done).catch(done);
    });
  })();
</script>`);

/* 4) كاش جديدة — القديمة بتتمسح في activate */
(function () {
  const m = sw.match(/var CACHE = '([^']+)';/);
  if (!m) throw new Error('لم أجد سطر CACHE في sw.js');
  const next = m[1].replace(/v(\d+)$/, (a, d) => 'v' + (Number(d) + 1));
  if (next === m[1]) throw new Error('تعذّر رفع رقم النسخة من ' + m[1]);
  sw = sw.replace(m[0], "var CACHE = '" + next + "';");
  n++;
  console.log('  OK  كاش ' + m[1] + ' ← ' + next);
})();

fs.writeFileSync('index.html', html);
fs.writeFileSync('sw.js', sw);
console.log(`\nتم تطبيق ${n} تعديل`);
