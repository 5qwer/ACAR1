/* فحص الموقع الحي بتحميل السكربتات كملفات منفصلة زي المتصفح بالضبط */
const { JSDOM, VirtualConsole } = require('jsdom');

const url = process.argv[2] || 'https://site-88abe32661714048a24e9bd63ac05f70.freebuff.page/';

const logs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => logs.push('JSDOM: ' + (e && (e.stack || e.message) ? (e.stack || e.message) : e)));
vc.on('error', (...a) => logs.push('console.error: ' + a.join(' ')));
vc.on('warn', (...a) => logs.push('console.warn: ' + a.join(' ')));
vc.on('log', (...a) => logs.push('log: ' + a.join(' ')));

JSDOM.fromURL(url, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
}).then((dom) => {
  const w = dom.window;
  w.addEventListener('error', (ev) => logs.push('window.error: ' + (ev.message || '') + ' @' + (ev.filename || '') + ':' + (ev.lineno || '')));
  setTimeout(() => {
    const d = w.document;
    const views = Array.from(d.querySelectorAll('.view'));
    const info = {
      ExportKit: typeof w.ExportKit,
      syncApi: typeof w.syncApi,
      isViewerMode: typeof w.isViewerMode,
      views: views.length,
      active: views.filter((v) => v.classList.contains('is-active')).map((v) => v.id),
      homeLen: d.getElementById('view-home') ? d.getElementById('view-home').innerHTML.length : -1,
      contentLen: d.getElementById('content') ? d.getElementById('content').innerHTML.length : -1,
      customersRows: d.querySelectorAll('#customersTbody tr').length,
      collectRows: d.querySelectorAll('#collectTbody tr').length,
      scriptSrcs: Array.from(d.scripts).map((s) => (s.src ? s.src.replace(/^https?:\/\/[^/]+/, '') : 'inline:' + s.textContent.length))
    };
    console.log(JSON.stringify(info, null, 2));
    console.log('--- logs (' + logs.length + ') ---');
    console.log(logs.slice(0, 40).join('\n') || '(none)');
    process.exit(0);
  }, 6000);
}).catch((e) => { console.error('FATAL', e && e.message ? e.message : e); process.exit(1); });
