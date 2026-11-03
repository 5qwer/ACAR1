/* ============================================================
   period.js — فلتر فترة «من / إلى» لكل خاصية + ملخص الفترة + تصدير
   ------------------------------------------------------------
   • يشتغل على الجدول نفسه: يخفي الصفوف خارج الفترة بدون أي تعديل في app.js.
   • يعرض: دواخل الفترة، خوارج الفترة، الصافي، رصيد أول الفترة،
     والرصيد التراكمي حتى نهاية الفترة، وعدد الحركات.
   • تصدير الفترة Excel وPDF وتنزيل على الجهاز.
   ============================================================ */
(function () {
  'use strict';

  var TARGETS = [
    { id: 'ledger', label: 'الدواخل والخوارج', view: 'view-ledger', tbody: 'ledgerTbody', anchor: 'ledgerSummary' },
    { id: 'stores', label: 'المخازن', view: 'view-stores', tbody: 'storeTbody', anchor: 'storeSummary' }
  ];

  var KEY = 'app_period_';
  var AR_NUM = '٠١٢٣٤٥٦٧٨٩';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function state(id) {
    try {
      var v = JSON.parse(localStorage.getItem(KEY + id) || 'null');
      if (v && typeof v === 'object') return { from: v.from || '', to: v.to || '' };
    } catch (e) {}
    return { from: '', to: '' };
  }
  function saveState(id, st) {
    try { localStorage.setItem(KEY + id, JSON.stringify(st)); } catch (e) {}
  }

  function digits(t) {
    return String(t == null ? '' : t).replace(/[٠-٩]/g, function (d) { return String(AR_NUM.indexOf(d)); });
  }

  /* dd/mm/yyyy أو yyyy-mm-dd → yyyy-mm-dd */
  function isoFrom(text) {
    var t = digits(text);
    var m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = t.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})/);
    if (!m) return '';
    return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }

  function amountOf(text) {
    var t = digits(text).replace(/[^\d.,-]/g, '');
    var m = t.match(/-?\d[\d,]*\.?\d*/);
    if (!m) return 0;
    return Math.abs(Number(String(m[0]).replace(/,/g, '')) || 0);
  }

  function rowInfo(tr) {
    var cells = tr.children || [];
    var date = '', amount = 0, dir = '';
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i], cls = String(c.className || ''), txt = c.textContent || '';
      if (!date) { var d = isoFrom(txt); if (d) date = d; }
      if (cls.indexOf('amount') > -1) {
        var n = amountOf(txt);
        if (n) {
          amount = n;
          dir = cls.indexOf('neg') > -1 ? 'out' : (cls.indexOf('pos') > -1 ? 'in' : '');
        }
      }
    }
    if (!dir) {
      if (/مرتجع/.test(tr.textContent)) dir = 'in';
      else if (/خوارج|خرج/.test(tr.textContent)) dir = 'out';
      else if (/دواخل|دخل/.test(tr.textContent)) dir = 'in';
    }
    return { date: date, amount: amount, dir: dir || 'in', tr: tr };
  }

  function rowsOf(t) {
    var tb = document.getElementById(t.tbody);
    if (!tb) return [];
    return $$('tr', tb).filter(function (tr) {
      return tr.children && tr.children.length > 2 && !tr.querySelector('[colspan]');
    }).map(rowInfo);
  }

  function inRange(date, st) {
    if (!st.from && !st.to) return true;
    if (!date) return false;
    if (st.from && date < st.from) return false;
    if (st.to && date > st.to) return false;
    return true;
  }

  function compute(id) {
    var t = TARGETS.filter(function (x) { return x.id === id; })[0];
    var st = state(id);
    var all = rowsOf(t);
    var res = { inc: 0, out: 0, count: 0, open: 0, close: 0, st: st, all: all };
    all.forEach(function (r) {
      var delta = r.dir === 'out' ? -r.amount : r.amount;
      if (st.from && r.date && r.date < st.from) { res.open += delta; return; }
      if (!inRange(r.date, st)) return;
      if (r.dir === 'out') res.out += r.amount; else res.inc += r.amount;
      res.count++;
    });
    res.close = res.open + res.inc - res.out;
    return res;
  }

  function money(n) {
    var v = Math.round(Number(n) || 0);
    return v.toLocaleString('en-US');
  }

  function rangeLabel(st) {
    if (!st.from && !st.to) return 'كل الفترات';
    var f = st.from ? st.from.split('-').reverse().join('/') : 'البداية';
    var t = st.to ? st.to.split('-').reverse().join('/') : 'النهاية';
    return 'من ' + f + ' إلى ' + t;
  }

  function barHTML(t, st, res) {
    return '' +
      '<div class="period-bar" data-period="' + t.id + '">' +
        '<div class="period-bar__row">' +
          '<label class="field"><span>من تاريخ</span><input type="date" data-p-from="' + t.id + '" value="' + (st.from || '') + '" /></label>' +
          '<label class="field"><span>إلى تاريخ</span><input type="date" data-p-to="' + t.id + '" value="' + (st.to || '') + '" /></label>' +
          '<div class="form__actions" style="margin:0;align-self:flex-end">' +
            '<button type="button" class="btn btn--ghost btn--sm" data-p-quick="month" data-p-id="' + t.id + '">هذا الشهر</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-p-quick="last" data-p-id="' + t.id + '">الشهر الماضي</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-p-quick="all" data-p-id="' + t.id + '">الكل</button>' +
            '<button type="button" class="btn btn--primary btn--sm" data-p-export="xlsx" data-p-id="' + t.id + '">Excel</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-p-export="pdf" data-p-id="' + t.id + '">PDF</button>' +
          '</div>' +
        '</div>' +
        '<div class="period-bar__sum" id="periodSum-' + t.id + '">' + sumHTML(t, res) + '</div>' +
      '</div>';
  }

  function sumHTML(t, res) {
    return '<span class="period-chip period-chip--in">دواخل: <b>' + money(res.inc) + '</b></span>' +
      '<span class="period-chip period-chip--out">خوارج: <b>' + money(res.out) + '</b></span>' +
      '<span class="period-chip period-chip--net">الصافي: <b>' + money(res.inc - res.out) + '</b></span>' +
      '<span class="period-chip">رصيد أول الفترة: <b>' + money(res.open) + '</b></span>' +
      '<span class="period-chip period-chip--net">الرصيد حتى نهاية الفترة: <b>' + money(res.close) + '</b></span>' +
      '<span class="period-chip">' + res.count + ' حركة · ' + rangeLabel(res.st) + '</span>';
  }

  function inject(t) {
    var view = document.getElementById(t.view);
    if (!view) return;
    if (view.querySelector('[data-period="' + t.id + '"]')) return;
    var holder = document.createElement('div');
    holder.innerHTML = barHTML(t, state(t.id), compute(t.id));
    var host = document.getElementById(t.anchor);
    if (host && host.parentNode) host.parentNode.insertBefore(holder.firstChild, host.nextSibling);
    else view.insertBefore(holder.firstChild, view.firstChild);
  }

  function apply(id) {
    var t = TARGETS.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var st = state(id);
    rowsOf(t).forEach(function (r) { r.tr.hidden = !inRange(r.date, st); });
    var box = document.getElementById('periodSum-' + id);
    if (box) box.innerHTML = sumHTML(t, compute(id));
  }

  function setRange(id, from, to) {
    saveState(id, { from: from || '', to: to || '' });
    var bar = document.querySelector('[data-period="' + id + '"]');
    if (bar) {
      var f = bar.querySelector('[data-p-from]'), tt = bar.querySelector('[data-p-to]');
      if (f) f.value = from || '';
      if (tt) tt.value = to || '';
    }
    apply(id);
  }

  function quick(id, kind) {
    var now = new Date();
    var pad = function (n) { return ('0' + n).slice(-2); };
    var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    if (kind === 'all') return setRange(id, '', '');
    if (kind === 'month') {
      return setRange(id, iso(new Date(now.getFullYear(), now.getMonth(), 1)),
        iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    }
    if (kind === 'last') {
      return setRange(id, iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        iso(new Date(now.getFullYear(), now.getMonth(), 0)));
    }
  }

  /* ---------- التصدير ---------- */
  function visibleRows(id) {
    var t = TARGETS.filter(function (x) { return x.id === id; })[0];
    var st = state(id);
    return rowsOf(t).filter(function (r) { return inRange(r.date, st); });
  }

  function tableHead(id) {
    var t = TARGETS.filter(function (x) { return x.id === id; })[0];
    var tb = document.getElementById(t.tbody);
    var table = tb && tb.closest ? tb.closest('table') : null;
    var ths = table ? $$('thead th', table) : [];
    return ths.map(function (th) { return (th.textContent || '').trim(); });
  }

  function sheetFor(id) {
    var t = TARGETS.filter(function (x) { return x.id === id; })[0];
    var rows = visibleRows(id).map(function (r) {
      return $$('td', r.tr).map(function (td) { return (td.textContent || '').trim(); });
    });
    var res = compute(id);
    var body = [tableHead(id)].concat(rows);
    body.push(['دواخل الفترة', money(res.inc)]);
    body.push(['خوارج الفترة', money(res.out)]);
    body.push(['الصافي', money(res.inc - res.out)]);
    body.push(['رصيد أول الفترة', money(res.open)]);
    body.push(['الرصيد حتى نهاية الفترة', money(res.close)]);
    body.push(['عدد الحركات', String(res.count)]);
    return { name: t.label, title: t.label, subtitle: rangeLabel(res.st), rows: body };
  }

  function reportFor(id) {
    var t = TARGETS.filter(function (x) { return x.id === id; })[0];
    var res = compute(id);
    var rows = visibleRows(id).map(function (r) {
      return $$('td', r.tr).map(function (td) { return (td.textContent || '').trim(); });
    });
    return {
      title: t.label + ' — تقرير فترة',
      subtitle: rangeLabel(res.st),
      columns: tableHead(id),
      rows: rows,
      moneyCols: [],
      totalRow: false,
      summary: [
        { label: 'دواخل الفترة', value: money(res.inc) },
        { label: 'خوارج الفترة', value: money(res.out) },
        { label: 'الصافي', value: money(res.inc - res.out) },
        { label: 'رصيد أول الفترة', value: money(res.open) },
        { label: 'الرصيد حتى نهاية الفترة', value: money(res.close) }
      ]
    };
  }

  function toastMsg(msg, isErr) {
    try { if (typeof window.toast === 'function') window.toast(msg, !!isErr); } catch (e) {}
  }

  function doExportPeriod(id, kind) {
    try {
      if (typeof ExportKit === 'undefined') { toastMsg('محرك التصدير غير محمّل', true); return false; }
      var stamp = rangeLabel(state(id)).replace(/[^\d]+/g, '-').replace(/^-|-$/g, '') || 'all';
      if (kind === 'xlsx') {
        var bytes = ExportKit.buildXlsx([sheetFor(id)]);
        var fname = 'nizam-' + id + '-period-' + stamp + '.xlsx';
        if (!ExportKit.downloadBytes || !ExportKit.downloadBytes(bytes, fname, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
          toastMsg('تعذّر تنزيل ملف Excel', true); return false;
        }
        toastMsg('تم تنزيل تقرير الفترة Excel ✓');
        return true;
      }
      if (!ExportKit.hasCanvas()) { toastMsg('تصدير PDF يحتاج متصفحاً حقيقياً', true); return false; }
      var pdf = ExportKit.reportToPdf(reportFor(id));
      if (!pdf) { toastMsg('تعذّر إنشاء ملف PDF', true); return false; }
      ExportKit.downloadBytes(pdf, 'nizam-' + id + '-period-' + stamp + '.pdf', 'application/pdf');
      toastMsg('تم تنزيل تقرير الفترة PDF ✓');
      return true;
    } catch (e) {
      toastMsg('خطأ في تصدير الفترة: ' + (e && e.message ? e.message : e), true);
      return false;
    }
  }

  /* ---------- الأحداث ---------- */
  document.addEventListener('change', function (e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-p-from');
    var t = e.target.getAttribute && e.target.getAttribute('data-p-to');
    if (!f && !t) return;
    var id = f || t;
    var bar = e.target.closest('.period-bar');
    var from = bar.querySelector('[data-p-from]').value;
    var to = bar.querySelector('[data-p-to]').value;
    setRange(id, from, to);
  });

  document.addEventListener('click', function (e) {
    var q = e.target.closest && e.target.closest('[data-p-quick]');
    if (q) { quick(q.getAttribute('data-p-id'), q.getAttribute('data-p-quick')); return; }
    var x = e.target.closest && e.target.closest('[data-p-export]');
    if (x) { doExportPeriod(x.getAttribute('data-p-id'), x.getAttribute('data-p-export')); }
  });

  function boot() {
    var visible = TARGETS.filter(function (t) {
      var v = document.getElementById(t.view);
      return v && (v.classList.contains('is-active') || v.offsetParent !== null);
    });
    var list = visible.length ? visible : TARGETS;
    list.forEach(function (t) {
      try { inject(t); apply(t.id); } catch (e) {}
    });
  }

  function watch() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-go]');
      if (b) setTimeout(boot, 120);
    }, true);
    TARGETS.forEach(function (t) {
      var tb = document.getElementById(t.tbody);
      if (!tb || !window.MutationObserver) return;
      try {
        new MutationObserver(function () { try { apply(t.id); } catch (e) {} })
          .observe(tb, { childList: true, subtree: false });
      } catch (e) {}
    });
  }

  var CSS =
    '.period-bar{margin:0 0 14px;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(255,255,255,.03)}' +
    '.period-bar__row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}' +
    '.period-bar__row .field{min-width:150px;flex:0 1 180px}' +
    '.period-bar__sum{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}' +
    '.period-chip{font-size:.78rem;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:var(--muted,#94a3b8)}' +
    '.period-chip b{color:#e2e8f0}' +
    '.period-chip--in{border-color:rgba(52,211,153,.35)}.period-chip--in b{color:#6ee7b7}' +
    '.period-chip--out{border-color:rgba(248,113,113,.35)}.period-chip--out b{color:#fca5a5}' +
    '.period-chip--net{border-color:rgba(56,189,248,.35)}.period-chip--net b{color:#7dd3fc}';

  function start() {
    try {
      var st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
    try { boot(); } catch (e) {}
    try { watch(); } catch (e) {}
    [600, 1500, 3000].forEach(function (ms) { setTimeout(function () { try { boot(); } catch (e) {} }, ms); });
  }

  window.__period = {
    targets: TARGETS,
    setRange: setRange,
    apply: apply,
    compute: compute,
    sheetFor: sheetFor,
    reportFor: reportFor,
    exportPeriod: doExportPeriod,
    boot: boot
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
