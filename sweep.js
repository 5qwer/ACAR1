/* يفتح كل شاشة في التطبيق ويقيس إن كانت فاضية */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.TARGET || 'http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
  await p.waitForTimeout(1500);
  const ids = await p.evaluate(() => Array.from(document.querySelectorAll('.view')).map(v => v.id));
  const rows = [];
  for (const id of ids) {
    const nav = id.replace(/^view-/, '');
    await p.evaluate((n) => {
      const btn = document.querySelector('[data-go="' + n + '"]');
      if (btn) btn.click();
      else { document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + n)); }
    }, nav);
    await p.waitForTimeout(180);
    const m = await p.evaluate((wid) => {
      const v = document.getElementById(wid);
      if (!v) return null;
      return { active: v.classList.contains('is-active'), h: v.offsetHeight, txt: (v.innerText || '').trim().length };
    }, id);
    rows.push({ id, ...m });
  }
  const bad = rows.filter(r => !r.active || r.h < 40 || r.txt < 15);
  rows.forEach(r => console.log(((!r.active || r.h < 40 || r.txt < 15) ? 'EMPTY ' : 'ok    ') + r.id.padEnd(26) + ' h=' + String(r.h).padStart(5) + ' نص=' + r.txt));
  if (errs.length) console.log('pageerrors:', errs.slice(0, 4));
  console.log(bad.length ? 'RESULT: ' + bad.length + ' شاشة فاضية' : 'RESULT: كل الشاشات فيها محتوى');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(3); });
