/* فحص حقيقي في متصفح: بيقول هل السكربت خلّص وفين الشاشة الفاضية */
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'https://site-88abe32661714048a24e9bd63ac05f70.freebuff.page/';
  const out = process.argv[3] || 'artifacts/live.png';

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const logs = [];
  page.on('console', (m) => logs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message + '\n' + (e.stack || '')));
  page.on('requestfailed', (r) => logs.push('[reqfail] ' + r.url() + ' :: ' + ((r.failure() || {}).errorText || '')));

  const resp = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2500);

  const info = await page.evaluate(() => {
    const views = Array.from(document.querySelectorAll('.view'));
    const home = document.getElementById('view-home');
    const content = document.getElementById('content');
    const disp = (el) => (el ? getComputedStyle(el).display + '/' + getComputedStyle(el).visibility : 'missing');
    return {
      ExportKit: typeof window.ExportKit,
      syncApi: typeof window.syncApi,          /* بيتحدد في آخر الـ IIFE */
      isViewerMode: typeof window.isViewerMode,
      viewsCount: views.length,
      activeViews: views.filter((v) => v.classList.contains('is-active')).map((v) => v.id),
      viewDisplay: views.slice(0, 6).map((v) => v.id + '=' + disp(v)),
      homeLen: home ? home.innerHTML.length : -1,
      homeDisplay: disp(home),
      contentLen: content ? content.innerHTML.length : -1,
      contentChildren: content ? content.children.length : -1,
      contentBox: content ? JSON.stringify(content.getBoundingClientRect()) : 'missing',
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 500),
      scripts: Array.from(document.scripts).map((s) => (s.src ? s.src.split('/').pop() : 'inline:' + s.textContent.length))
    };
  });

  console.log('HTTP ' + (resp ? resp.status() : '?'));
  console.log(JSON.stringify(info, null, 2));
  console.log('--- console / errors (' + logs.length + ') ---');
  console.log(logs.join('\n') || '(none)');

  require('fs').mkdirSync(require('path').dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  console.log('screenshot -> ' + out);
  await browser.close();
})().catch((e) => { console.error('FATAL', e && e.message ? e.message : e); process.exit(1); });
