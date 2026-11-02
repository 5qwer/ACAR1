/* اختبار الإنقاذ: الاستضافة بترجّع 502 لأول طلبات app.js — لازم التطبيق يقلع برضه */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:4174/';

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const codes = [];
  p.on('response', (r) => { if (/app\.js/.test(r.url())) codes.push(r.status()); });
  await p.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  let booted = true;
  try { await p.waitForFunction(() => !!window.__appBooted, { timeout: 20000 }); } catch (e) { booted = false; }
  const st = await p.evaluate(() => ({
    stamp: (document.querySelector('.brand__text small') || {}).textContent,
    home: (document.getElementById('view-home') || { innerHTML: '' }).innerHTML.length,
    bootHelp: (document.getElementById('bootHelp') || {}).style.display,
    active: (document.querySelector('.view.is-active') || {}).id
  }));
  console.log('app.js responses:', codes.join(','), '| booted:', booted);
  console.log('state:', JSON.stringify(st));
  const ok = booted && st.home > 3000 && /b2026\d+/.test(st.stamp || '') && st.bootHelp !== 'flex';
  console.log(ok ? 'RESULT: PASS — الإنقاذ شغّل التطبيق رغم 502' : 'RESULT: FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log('FATAL', e.message); process.exit(3); });
