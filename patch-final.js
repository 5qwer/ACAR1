/* إصلاحات نهائية:
   1) بطاقة «التفاصيل» المكرّرة في index.html (كانت زرّين متداخلين)
   2) شاشة ربط Google: تختفي فوراً لو الدور محفوظ/بيئة موثوقة، و«إعادة المحاولة» مخفية افتراضياً
   3) زر «كل التطبيق (PDF)» كمان في قسم التفاصيل
   4) «كل التطبيق PDF» يشمل رصيد كل بضاعة، وملف Excel يشمل ورقة فهرس
*/
const fs = require('fs');

function patch(file, pairs) {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.indexOf('\r\n') > -1;
  let s = crlf ? raw.replace(/\r\n/g, '\n') : raw;
  let n = 0;
  pairs.forEach(([oldStr, newStr]) => {
    const i = s.indexOf(oldStr);
    if (i < 0) throw new Error('NOT FOUND in ' + file + ':\n' + oldStr.slice(0, 140));
    if (s.indexOf(oldStr, i + 1) > -1) throw new Error('NOT UNIQUE in ' + file + ':\n' + oldStr.slice(0, 140));
    s = s.slice(0, i) + newStr + s.slice(i + oldStr.length);
    n++;
  });
  fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
  console.log(file + ': patched ' + n);
}

/* ---------- 1) index.html ---------- */
patch('index.html', [
  /* زر التفاصيل المكرّر */
  [
    `        <button class="card card--locked" data-go="details">
        <button class="card" data-go="details">
`,
    `        <button class="card card--locked" data-go="details">
`
  ],
  /* إخفاء «إعادة المحاولة» افتراضياً */
  [
    `<button type="button" id="gateRetry" style="width:100%;margin-top:12px;padding:11px;background:transparent;border:1px solid #4f8cff;color:#9fadc2;border-radius:10px;cursor:pointer;font-weight:600;">إعادة المحاولة</button>`,
    `<button type="button" id="gateRetry" style="display:none;width:100%;margin-top:12px;padding:11px;background:transparent;border:1px solid #4f8cff;color:#9fadc2;border-radius:10px;cursor:pointer;font-weight:600;">إعادة المحاولة</button>`
  ],
  /* إقلاع سريع لشاشة الربط */
  [
    `  var gate = document.getElementById('forceAuthGate');
  if (gate) gate.style.display = 'flex';
  if (typeof fetch === 'function') {
    function gateStatusError(msg) {
      var e = document.getElementById('gateError');
      if (!e) return;
      e.style.display = 'block';
      e.textContent = msg;
    }`,
    `  var gate = document.getElementById('forceAuthGate');
  /* إقلاع سريع: لو الحساب مربوط ومحفوظ (أدمن) أو إحنا في بيئة موثوقة
     (نسخة سطح المكتب/الأندرويد) نخفي الشاشة فوراً بدون أي طلب شبكة. */
  var gateTrustedFast = false;
  try {
    var __role = JSON.parse(localStorage.getItem('app_role_cache') || 'null');
    var __trusted = (window.APP_TRUSTED_RUNTIME === true) ||
      (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    gateTrustedFast = !!__trusted || (!!__role && __role.role === 'admin');
  } catch (eFast) {}
  if (gate && !gateTrustedFast) gate.style.display = 'flex';
  if (typeof fetch === 'function') {
    function gateStatusError(msg) {
      var e = document.getElementById('gateError');
      var retryBtn = document.getElementById('gateRetry');
      if (retryBtn) retryBtn.style.display = 'block';
      if (!e) return;
      e.style.display = 'block';
      e.textContent = msg;
    }`
  ],
  /* زر كل التطبيق PDF داخل التفاصيل */
  [
    `      <div id="detailsBody"></div>`,
    `      <div class="form__actions" style="margin-top:6px">
        <button type="button" class="btn btn--ghost" data-export-all-pdf="1" title="ملف PDF واحد فيه كل بيانات التطبيق: الملخص وكل الأقسام والمخازن والإجماليات">📄 كل التطبيق (PDF) — كل البيانات في ملف واحد</button>
      </div>
      <div id="detailsBody"></div>`
  ]
]);

/* ---------- 2) app.js ---------- */
patch('app.js', [
  /* كل التطبيق PDF: يضم كمان رصيد كل بضاعة */
  [
    `      var reports = [reportAll()];
      EXPORT_SECTIONS.forEach(function (s) { reports.push(buildReport(s.key)); });`,
    `      var reports = [reportAll()];
      EXPORT_SECTIONS.forEach(function (s) { reports.push(buildReport(s.key)); });
      /* كل بيانات المخازن: رصيد كل بضاعة على حدة (مش موجودة في تقرير المخازن العادي) */
      try {
        var stItemsRep = reportStoresItems();
        if (stItemsRep && stItemsRep.rows && stItemsRep.rows.length) reports.push(stItemsRep);
      } catch (eSt) {}`
  ],
  /* زر التفاصيل يفتح نفس الملف */
  [
    `    if (t.closest('#exportAllPdf')) { exportAppPdf(); return; }`,
    `    if (t.closest('#exportAllPdf') || t.closest('[data-export-all-pdf]')) { exportAppPdf(); return; }`
  ],
  /* فهرس في بداية ملف Excel الشامل */
  [
    `    } catch (e3) {}
    return sheets;
  }`,
    `    } catch (e3) {}
    /* فهرس واضح: أسماء الأوراق وعدد صفوف كل واحدة */
    try {
      var idxRows = sheets.map(function (sh, i) {
        return [i + 1, String(sh.name || ''), Number((sh.rows || []).length)];
      });
      var idx = {
        title: 'الفهرس', subtitle: 'محتويات ملف Excel — كل قسم في ورقة مستقلة',
        columns: ['#', 'الورقة', 'عدد الصفوف'], moneyCols: [], totalRow: false,
        rows: idxRows,
        summary: [
          { label: 'عدد الأوراق', value: String(sheets.length) },
          { label: 'إجمالي الصفوف', value: String(idxRows.reduce(function (a, r) { return a + r[2]; }, 0)) }
        ]
      };
      sheets.unshift(reportToSheet(idx));
    } catch (eIdx) {}
    return sheets;
  }`
  ],
  /* تصحيح نص مقطوع في عنوان ورقة الأصناف */
  [
    `subtitle: 'كمية الدواخل والخوارج لكل صنف إجمالحصاد واضحة',`,
    `subtitle: 'كمية الدواخل والخوارج لكل صنف مع الرصيد المتبقي والحالة',`
  ]
]);

console.log('done');
