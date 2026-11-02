/* فحص الموقع المنشور: بصمة الإصدار + المحتوى + حارس الشاشة في الإنتاج */
const { chromium } = require('playwright');
const URL = process.env.TARGET || 'https://site-88abe32661714048a24e9bd63ac05f70.freebuff.page/';
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  let loaded = false, tries = 0;
  while (!loaded && tries < 10) {
    tries++;
    try {
      const r = await p.goto(URL + '?t=' + tries, { waitUntil: 'load', timeout: 30000 });
      if (r && r.status() === 200 && await p.evaluate(() => !!document.getElementById('content'))) loaded = true;
      else await p.waitForTimeout(2500);
    } catch (e) { await p.waitForTimeout(2500); }
  }
  console.log('tries=' + tries + ' loaded=' + loaded);
  if (!loaded) { await b.close(); process.exit(2); }
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    const a = document.querySelector('.view.is-active');
    return {
      stamp: (document.querySelector('.brand__text small') || {}).textContent || 'لا يوجد',
      home: { id: a ? a.id : 'NONE', h: a ? a.offsetHeight : 0, len: a ? a.innerHTML.length : 0 },
      booted: !!window.__appBooted,
      swCache: 'n/a'
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await p.evaluate(() => document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active')));
  await p.waitForTimeout(800);
  const healed = await p.evaluate(() => {
    const a = document.querySelector('.view.is-active');
    return { id: a ? a.id : 'NONE', h: a ? a.offsetHeight : 0 };
  });
  console.log('بعد مسح كل الشاشات المفعّلة:', JSON.stringify(healed));
  await p.screenshot({ path: 'artifacts/live-final.png' });
  const pass = info.home.len > 1000 && healed.id === 'view-home' && healed.h > 200;
  console.log(pass ? 'RESULT: PASS' : 'RESULT: FAIL');
  await b.close();
  process.exit(pass ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message); process.exit(3); });
