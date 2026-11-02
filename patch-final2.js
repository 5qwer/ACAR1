/* 1) شاشة الربط: لو الربط كان ناجح قبل كده والاستضافة ردّت بخطأ مؤقت، التطبيق يفتح بدل شاشة «إعادة المحاولة»
   2) مفيش طلب /api/sync/folder وانت مش مربوط (كان بيرجّع 503 ويزحم الكونسول) */
const fs = require('fs');

function patch(file, pairs) {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.indexOf('\r\n') > -1;
  let s = crlf ? raw.replace(/\r\n/g, '\n') : raw;
  pairs.forEach(([oldStr, newStr]) => {
    const i = s.indexOf(oldStr);
    if (i < 0) throw new Error('NOT FOUND in ' + file + ':\n' + oldStr.slice(0, 160));
    if (s.indexOf(oldStr, i + 1) > -1) throw new Error('NOT UNIQUE in ' + file + ':\n' + oldStr.slice(0, 160));
    s = s.slice(0, i) + newStr + s.slice(i + oldStr.length);
  });
  fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
  console.log(file + ': patched ' + pairs.length);
}

patch('index.html', [
  [
    `        .then(function (s) {
          if (s && s.connected && gate) { gate.style.display = 'none'; return; }`,
    `        .then(function (s) {
          try {
            if (s && s.connected) localStorage.setItem('app_drive_conn', '1');
            else localStorage.removeItem('app_drive_conn');
          } catch (eC) {}
          if (s && s.connected && gate) { gate.style.display = 'none'; return; }`
  ],
  [
    `        .catch(function (err) {
          gateStatusError('تعذّر التحقق من حالة الربط (' + (err && err.message ? err.message : 'خطأ') +
            ') — البيانات محفوظة، اضغط «إعادة المحاولة».');
        });`,
    `        .catch(function (err) {
          /* لو الربط كان ناجح قبل كده والاستضافة ردّت بخطأ مؤقت: منقفلش التطبيق،
             نكمل بالوضع المحفوظ ونتحقق بهدوء بعد شوية. */
          var wasConnected = false;
          try { wasConnected = localStorage.getItem('app_drive_conn') === '1'; } catch (eW) {}
          if (wasConnected && gate) {
            gate.style.display = 'none';
            var r2 = document.getElementById('gateRetry');
            if (r2) r2.style.display = 'none';
            setTimeout(checkGate, 4000);
            return;
          }
          gateStatusError('تعذّر التحقق من حالة الربط (' + (err && err.message ? err.message : 'خطأ') +
            ') — البيانات محفوظة، اضغط «إعادة المحاولة».');
        });`
  ]
]);

patch('app.js', [
  [
    `    if (id === 'settings') step(function () { renderExportGrid(); refreshDriveStatus(); loadSyncFolder(); renderNetworkToggle(); }, 'الإعدادات');`,
    `    if (id === 'settings') step(function () { renderExportGrid(); refreshDriveStatus(); if (driveState.connected) loadSyncFolder(); renderNetworkToggle(); }, 'الإعدادات');`
  ],
  [
    `    } else if (syncBox && !syncBusy && $('#syncStateText') && $('#syncStateText').textContent.indexOf('آخر رفع') !== 0) {
      syncSetState('', 'المزامنة جاهزة — تقدر ترفع نسخة أو تفحص الدرايف');
      startSyncTimers();`,
    `    } else if (syncBox && !syncBusy && $('#syncStateText') && $('#syncStateText').textContent.indexOf('آخر رفع') !== 0) {
      syncSetState('', 'المزامنة جاهزة — تقدر ترفع نسخة أو تفحص الدرايف');
      try { loadSyncFolder(); } catch (eLF) {}
      startSyncTimers();`
  ]
]);

console.log('done');
