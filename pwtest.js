const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const p = await b.newPage();
  await p.setContent('<h1>hi</h1>');
  console.log('TITLE_OK', await p.textContent('h1'));
  await b.close();
})().catch(e => { console.log('ERR', e.message.split('\n').slice(0,6).join(' | ')); process.exit(1); });
