const fs = require('fs');
function patch(file, pairs) {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.indexOf('\r\n') > -1;
  let s = crlf ? raw.replace(/\r\n/g, '\n') : raw;
  pairs.forEach(([o, n]) => {
    const i = s.indexOf(o);
    if (i < 0) throw new Error('NOT FOUND ' + file + ': ' + o.slice(0, 120));
    if (s.indexOf(o, i + 1) > -1) throw new Error('NOT UNIQUE ' + file + ': ' + o.slice(0, 120));
    s = s.slice(0, i) + n + s.slice(i + o.length);
  });
  fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
  console.log(file + ' patched ' + pairs.length);
}
patch('app.js', [
  [
    "    if (id === 'settings') step(function () { renderExportGrid(); refreshDriveStatus(); if (driveState.connected) loadSyncFolder(); renderNetworkToggle(); }, 'الإعدادات');",
    "    if (id === 'settings') step(function () { renderExportGrid(); refreshDriveStatus(); loadSyncFolder(); renderNetworkToggle(); }, 'الإعدادات');"
  ],
  [
    "  function loadSyncFolder() {\n    var localUrl = localFolderUrl();\n",
    "  function loadSyncFolder() {\n    var localUrl = localFolderUrl();\n    /* غير مربوط: نعرض الفولدر المحفوظ محلياً فقط — بدون طلب سيرفر (كان بيرجّع 503) */\n    if (!driveState.connected) {\n      if (localUrl) showCustomFolder(localUrl);\n      return Promise.resolve();\n    }\n"
  ]
]);
