const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('console', m => { if (m.type() === 'error') console.log('  console:', m.text().slice(0, 140)); });
  p.on('pageerror', e => console.log('  pageerror:', e.message.slice(0, 140)));
  await p.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
  await p.waitForTimeout(1500);
  for (const nav of ['collection', 'partners', 'associations', 'operations', 'add-customer']) {
    console.log('--- ' + nav);
    const before = await p.evaluate(() => document.querySelectorAll('.view.is-active').length);
    await p.evaluate((n) => { const el = document.querySelector('[data-go="' + n + '"]'); if (el) el.click(); else console.log('no btn'); }, nav);
    await p.waitForTimeout(300);
    const st = await p.evaluate(() => ({
      active: Array.from(document.querySelectorAll('.view.is-active')).map(v => v.id),
      toast: Array.from(document.querySelectorAll('.toast, #toastBox, [class*=toast]')).map(t => (t.innerText || '').trim()).filter(Boolean).slice(0, 2)
    }));
    console.log('   before=' + before + ' ' + JSON.stringify(st));
    await p.goto('http://localhost:3000/', { waitUntil: 'load' });
    await p.waitForTimeout(1200);
  }
  await b.close();
})().catch(e => { console.log('FATAL', e.message); });
