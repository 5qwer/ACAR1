/* تقوية مراقب الإقلاع: يكشف الحالة الحقيقية في متصفح المستخدم ويعرض تقرير */
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
let app = fs.readFileSync('app.js', 'utf8');
let n = 0;

function rep(file, what, oldStr, newStr) {
  const target = file === 'app' ? app : html;
  const c = target.split(oldStr).length - 1;
  if (c !== 1) throw new Error(`[${file}] count=${c} :: ${what}`);
  if (file === 'app') app = app.replace(oldStr, newStr);
  else html = html.replace(oldStr, newStr);
  n++;
  console.log('  OK  ' + what);
}

/* 1) علامة صريحة إن الإقلاع خلّص (بعد فتح الرئيسية مهما حصل) */
rep('app', 'boot flag + $$ fix',
  `    $('.view').forEach(function (v) { v.classList.toggle('is-active', v.id === 'view-home'); });
  }
`,
  `    $$('.view').forEach(function (v) { v.classList.toggle('is-active', v.id === 'view-home'); });
  }
  /* علامة للمراقب: الإقلاع وصل للنهاية */
  try { window.__appBooted = true; } catch (e) {}
`);

/* 2) المراقب: فحص حقيقي للحالة + تقرير مقروء */
rep('html', 'smarter watchdog',
  `    var checked = false;
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
    }`,
  `    function stateReport() {
      var act = document.querySelector('.view.is-active');
      var home = document.getElementById('view-home');
      var out = [];
      out.push('التطبيق: ' + (window.__appBooted ? 'خلّص الإقلاع' : 'ما خلّصش الإقلاع'));
      out.push('الشاشة المفتوحة: ' + (act ? act.id : 'لا شيء (كل الشاشات مقفولة)'));
      if (act) {
        var cs = getComputedStyle(act);
        out.push('display=' + cs.display + ' · opacity=' + cs.opacity + ' · ارتفاع=' + act.offsetHeight + 'px');
        out.push('طول محتوى الشاشة: ' + act.innerHTML.length + ' حرف');
      }
      out.push('طول الشاشة الرئيسية: ' + (home ? home.innerHTML.length + ' حرف' : 'غير موجودة'));
      out.push('خطأ JavaScript: ' + (window.__bootErr ? window.__bootErr : 'لا يوجد'));
      out.push('الموقع: ' + location.host);
      return out.join('\\n');
    }
    function healthy() {
      var act = document.querySelector('.view.is-active');
      if (!act || !window.__appBooted) return false;
      if (act.id !== 'view-home') return true;
      if (/jsdom/i.test(navigator.userAgent || '')) return true;
      var cs = getComputedStyle(act);
      return cs.display !== 'none' && Number(cs.opacity) > 0.05 && act.offsetHeight > 40;
    }
    function check() {
      var box = document.getElementById('bootHelp');
      if (!box) return;
      var err = document.getElementById('bootHelpErr');
      if (healthy()) {
        box.style.display = 'none';
        if (err) err.style.display = 'none';
        return;
      }
      if (err) { err.style.display = 'block'; err.style.whiteSpace = 'pre-line'; err.textContent = stateReport(); }
      box.style.display = 'flex';
    }`);

fs.writeFileSync('index.html', html);
fs.writeFileSync('app.js', app);
console.log(`\nتم تطبيق ${n} تعديل`);
