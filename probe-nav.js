/* من اللي بيرجّع الشاشة للرئيسية؟ بنسجّل كل تغيير على is-active مع الـstack */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:4173/';
const NAV = process.env.NAV || 'settings';

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => console.log('pageerror:', e.message.slice(0, 200)));
  await p.goto(BASE, { waitUntil: 'load', timeout: 45000 });
  await p.waitForTimeout(1800);

  await p.evaluate(() => {
    window.__log = [];
    const t0 = performance.now();
    const rec = (k, el, extra) => window.__log.push({
      k, el, t: Math.round(performance.now() - t0),
      stack: (new Error().stack || '').split('\n').slice(2, 5).join(' | ').slice(0, 300), extra
    });
    const oAdd = DOMTokenList.prototype.add, oRem = DOMTokenList.prototype.remove, oTog = DOMTokenList.prototype.toggle;
    DOMTokenList.prototype.add = function () {
      if ([].indexOf.call(arguments, 'is-active') > -1) rec('add', this.value);
      return oAdd.apply(this, arguments);
    };
    DOMTokenList.prototype.remove = function () {
      if ([].indexOf.call(arguments, 'is-active') > -1) rec('remove', this.value);
      return oRem.apply(this, arguments);
    };
    DOMTokenList.prototype.toggle = function (tok, force) {
      if (tok === 'is-active') rec('toggle:' + force, this.value);
      return oTog.apply(this, arguments);
    };
    const oc = document.getElementById('content');
    if (oc) new MutationObserver(() => {
      rec('mutation', oc.querySelector('.view.is-active') ? oc.querySelector('.view.is-active').id : 'NONE');
    }).observe(oc, { attributes: true, subtree: true, attributeFilter: ['class'] });
  });

  console.log('title before:', await p.title());
  await p.evaluate((n) => { const el = document.querySelector('[data-go="' + n + '"]'); if (el) el.click(); else console.log('NO BTN'); }, NAV);
  await p.waitForTimeout(700);
  const out = await p.evaluate(() => ({
    log: window.__log,
    title: document.title,
    active: Array.from(document.querySelectorAll('.view.is-active')).map(v => v.id),
    status: (document.getElementById('statusSection') || {}).textContent,
    hash: location.hash
  }));
  console.log('title after :', out.title, '| status:', out.status, '| hash:', JSON.stringify(out.hash));
  console.log('active now  :', out.active);
  console.log('--- log ---');
  out.log.slice(0, 60).forEach(l => console.log(String(l.t).padStart(5) + 'ms ' + l.k.padEnd(12) + String(l.el).slice(0, 60) + (l.extra ? ' ' + l.extra : '') + '\n        ' + l.stack));
  await b.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(3); });
