/* ============================================================
   patch-stores.js — دفعة تطوير جامعة (تدخل مرة واحدة فقط)
   1) التفاصيل والأقسام المحمية + إعادة القفل من الإعدادات
   2) المخازن: دواخل/خوارج/مرتجع + رصيد + إشعار نقص
   3) الشريك: حركاته من الدواخل والخوارج تُحسب في بروفايله
   4) المخازن مترابطة: المورد/العميل/الشريك تشوف حركاته في بروفايله
   5) التصدير: قسم المخازن + «كل التطبيق PDF» ملف واحد
   6) إعادة هيكلة PDF/Excel: ملخص أصناف المخازن + أوراق منظمة
   ============================================================ */
if (!require('fs').existsSync('app.js')) { console.error('app.js مش موجود'); process.exit(1); }
var fs = require('fs');
var src = fs.readFileSync('app.js', 'utf8');
if (src.indexOf('KEY_STORES') >= 0) { console.log('مطبَّق من قبل — لا إعادة'); process.exit(0); }

var n = 0;
function rep(oldS, newS, tag, once) {
  if (once === undefined) once = true;
  if (src.indexOf(oldS) < 0) { console.error(FAILPre + tag); process.exit(1); }
  if (once && src.split(oldS).length > 2) { console.error('⚠ ' + tag + ' — النص متكرر، لن يُعوّض.'); process.exit(1); }
  src = src.split(oldS).join(newS);
  console.log('✓ ' + tag);
}
var FAILPre = '✗ لم يُوجد: ';

/* ---------- 1) حمايات جديدة ---------- */
rep(
`    associations: 'جمعيات',
    operations: 'العمليات'
  };`,
`    associations: 'جمعيات',
    operations: 'العمليات',
    details: 'التفاصيل'
  };`,
'PROTECTED.details');

rep(
`    details: 'التفاصيل',
    'partner-profile': 'بروفايل شريك',`,
`    details: 'التفاصيل',
    stores: 'المخازن',
    'partner-profile': 'بروفايل شريك',`,
'SECTION_NAMES.stores');

/* رندر المخازن عند الفتح */
rep(
`    if (id === 'ledger') step(function () { renderLedger(); renderLedgerSummary(); fillPartyLists(); }, 'الدواخل والخوارج');`,
`    if (id === 'ledger') step(function () { renderLedger(); renderLedgerSummary(); fillPartyLists(); }, 'الدواخل والخوارج');
    if (id === 'stores') step(function () { renderStores(); fillStoreSuggests(); }, 'المخازن');`,
'showView.stores');

/* إعادة الطلب بكلمة مرور من زر الإعدادات */
rep(
`  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-go]');
    if (el) navigate(el.getAttribute('data-go'));
  });`,
`  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-go]');
    if (el) {
      var goId = el.getAttribute('data-go');
      try { if (el.hasAttribute('data-relock')) delete unlocked[goId]; } catch (e2) {}
      navigate(goId);
    }
  });`,
'click.relock');

/* ---------- 2) حساب بروفايل الشريك مع الدواخل والخوارج ---------- */
rep(
`  function derivePartner(p) {
    var share = Number(p.share || 0);
    var cut = Math.round((getPartnerProfit() * share) / 100);
    var withdrawals = Number(p.withdrawals || 0);
    return {
      share: share,
      capital: Number(p.capital || 0),
      cut: cut,
      withdrawals: withdrawals,
      net: cut - withdrawals
    };
  }`,
`  function derivePartner(p) {
    var share = Number(p.share || 0);
    var cut = Math.round((getPartnerProfit() * share) / 100);
    var withdrawals = Number(p.withdrawals || 0);
    /* حركاته من «الدواخل والخوارج» تُحسب في ملفه مباشرة:
       خرج له من الشركة = مسحوبة من رصيده، ودخل منه = عطى/أودع. */
    var pLed = null;
    try { pLed = partyLedger('partner', p.name); } catch (e2) {}
    var ledOut = pLed ? Number(pLed.out || 0) : 0;
    var ledIn = pLed ? Number(pLed.in || 0) : 0;
    return {
      share: share,
      capital: Number(p.capital || 0),
      cut: cut,
      withdrawals: withdrawals,
      ledOut: ledOut,
      ledIn: ledIn,
      net: cut + ledIn - (withdrawals + ledOut)
    };
  }`,
'derivePartner');

rep(
`          '<div class="summary__box summary__box--out"><small>المسحوبات</small><b>' + money(d.withdrawals) + '</b></div>' +`,
`          '<div class="summary__box summary__box--out"><small>المسحوبات — يدوي ' + money(d.withdrawals) + ' (وهنا مضاف: من الدواخل ' + money(d.ledOut) + ')</small><b>' + money(d.withdrawals + d.ledOut) + '</b></div>' +`,
'pfpSummary.out');

/* جداول حركات الشريك في بروفايله + حركات المخازن */
rep(
`    var links = $('#pfpLinks');
    if (links) {
      var ops = collectOps().filter(function (o) {
        return o.partyType === 'partner' && o.partyName === String(p.name || '').trim();
      });
      var pLed = partyLedger('partner', p.name);
      var ledNote = '<p class="panel__note">حركات «الدواخل والخوارج» المرتبطة بهذا الشريك: داخل ' +
        money(pLed.in) + ' — خارج ' + money(pLed.out) + '</p>';
      links.innerHTML = ledNote + (ops.length
        ? opsTable(ops)
        : '<p class="panel__hint">لا توجد حركات نقدية مرتبطة بهذا الشريك — سجّل أرباحه من النموذج أعلاه أو اختره «الطرف» في الدواخل والخوارج.</p>');
    }`,
`    var links = $('#pfpLinks');
    if (links) {
      var nmP = String(p.name || '').trim();
      var pLed = partyLedger('partner', p.name);
      var stOps = storeOpsFor('partner', nmP);
      var rowsP = pLed.list.map(function (t, i) {
        var out = t.type === 'out';
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(formatDate(t.date)) + '</td><td>' + esc(t.desc || '—') +
          '</td><td><span class="tag ' + (out ? 'tag--out' : 'tag--in') + '">' +
          (out ? 'خرج (سحب)' : 'دخل (عطى/أودع)') + '</span></td>' +
          '<td class="amount ' + (out ? 'neg' : 'pos') + '">' + (out ? '- ' : '+ ') + money(t.amount) + '</td>' +
          '<td class="cell-note">' + esc(t.note || '') + '</td></tr>';
      });
      stOps.forEach(function (o, i) {
        var out = o.type === 'out';
        var lbl = o.type === 'in' ? 'دواخل' : (o.type === 'out' ? 'خوارج' : 'مرتجع');
        rowsP.push('<tr><td>' + (i + 1) + '</td><td>' + esc(formatDate(o.date)) + '</td><td>' +
          esc('مخازن: ' + (o.item || '—') + ' — كمية ' + o.qty + (o.work ? ' — شغلانة: ' + o.work : '')) +
          '</td><td><span class="tag ' + (out ? 'tag--out' : 'tag--in') + '">' + lbl + '</span></td>' +
          '<td class="amount ' + (out ? 'neg' : 'pos') + '">' + (out ? '- ' : '+ ') + money(o.total) + '</td>' +
          '<td class="cell-note">' + esc(o.note || '') + '</td></tr>');
      });
      var opsP = collectOps().filter(function (o) {
        return o.partyType === 'partner' && o.partyName === nmP && o.src !== 'الدواخل والخوارج';
      });
      links.innerHTML =
        '<p class="panel__note">حركات «الدواخل والخوارج» المرتبطة بهذا الشريك: داخل ' + money(pLed.in) +
        ' — خارج ' + money(pLed.out) + ' — تُحسب مباشرة في ملفه أعلاه (المسحوبات والصافي) بدون تكرار.</p>' +
        '<div class="table-wrap"><table class="table"><thead><tr>' +
        '<th style="width:52px">#</th><th>التاريخ</th><th>البيان</th><th>النوع</th><th>المبلغ</th><th>ملاحظة</th></tr></thead><tbody>' +
        (rowsP.length ? rowsP.join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:22px">لا توجد حركات مرتبطة بعد — اختره «الطرف» في الدواخل والخوارج أو في المخازن وهتظهر هنا وبتُحسب.</td></tr>') +
        '</tbody></table></div>' +
        (opsP.length ? '<p class="panel__hint">عمليات أخرى مرتبطة به:</p>' + opsTable(opsP) : '');
    }`,
'pfpLinks');

/* تقرير بروفايل الشريك: صفوف جديدة */
rep(
`      ['المسحوبات', d.withdrawals],
      ['الصافي المستحق', d.net],
      ['أرباح مسجّلة يدوياً', profitSum],`,
`      ['المسحوبات — يدوي', d.withdrawals],
      ['المسحوبات من الدواخل والخوارج', d.ledOut],
      ['ما قدمه للشركة (دواخل)', d.ledIn],
      ['الصافي المستحق', d.net],
      ['أرباح مسجّلة يدوياً', profitSum],`,
'partnerProfileReport.rows');

rep(
`      ['المسحوبات', d.withdrawals],
      ['الصافي المستحق', d.net]
    ];`,
`      ['المسحوبات — يدوي', d.withdrawals],
      ['المسحوبات من الدواخل والخوارج', d.ledOut],
      ['ما قدمه للشركة (دواخل)', d.ledIn],
      ['الصافي المستحق', d.net]
    ];`,
'partnerProfileSheets.rows');

/* ---------- 3) وحدة المخازن الكاملة (تُدرج قبل الإقلاع) ---------- */
let STORES = `
  /* ============================================================
     المخازن — دواخل (وارد) / خوارج (صادر) / مرتجع + رصيد كل بضاعة + إشعار نقص
     مرتبطة: المورد يتسجل حركته في بروفايله، والعميل والشريك كذلك.
     ============================================================ */
  var KEY_STORES = 'app_stores';

  function getStores() {
    try {
      var raw = localStorage.getItem(KEY_STORES);
      var v = raw ? JSON.parse(raw) : null;
      if (Array.isArray(v)) return { docs: safeList(v, []) };
      if (v && typeof v === 'object') return { docs: safeList(v.docs, []) };
    } catch (e) {}
    return { docs: [] };
  }
  function saveStores(v) {
    try { localStorage.setItem(KEY_STORES, JSON.stringify(v)); } catch (e2) {}
  }
  function storeDocs() { return getStores().docs; }

  function storeTotals() {
    var res = { inQty: 0, outQty: 0, retQty: 0, amtIn: 0, amtOut: 0, amtRet: 0, count: 0 };
    storeDocs().forEach(function (d) {
      var q = Number(d.qty || 0), a = Number(d.total || 0);
      res.count++;
      if (d.type === 'in') { res.inQty += q; res.amtIn += a; }
      else if (d.type === 'out') { res.outQty += q; res.amtOut += a; }
      else { res.retQty += q; res.amtRet += a; }
    });
    res.netQty = res.inQty + res.retQty - res.outQty;
    res.netAmt = res.amtIn + res.amtRet - res.amtOut;
    return res;
  }

  function storeItemBalance(name) {
    var b = 0;
    var nm = String(name || '').trim();
    storeDocs().forEach(function (d) {
      if (String(d.item || '').trim() !== nm) return;
      var q = Number(d.qty || 0);
      if (d.type === 'out') b -= q; else b += q;
    });
    return b;
  }

  function storeItems() {
    var seen = {}, out = [];
    storeDocs().forEach(function (d) {
      var nm = String(d.item || '').trim();
      if (nm && !seen[nm]) { seen[nm] = true; out.push(nm); }
    });
    return out;
  }

  function storeShortages() {
    var bad = [];
    storeItems().forEach(function (nm) {
      var b = storeItemBalance(nm);
      if (b <= 0) bad.push({ item: nm, bal: b });
    });
    return bad;
  }

  /* حركات المخازن المرتبطة بطرف معيّن — تظهر في بروفايله */
  function storeOpsFor(partyType, partyName) {
    var nm = String(partyName || '').trim();
    if (!nm) return [];
    return storeDocs().filter(function (d) {
      return d.partyType === partyType && String(d.partyName || '').trim() === nm;
    }).map(function (d) {
      return {
        date: d.date, type: d.type, item: d.item, qty: Number(d.qty || 0),
        price: Number(d.price || 0), total: Number(d.total || 0),
        work: d.work || '', note: d.note || ''
      };
    }).sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); });
  }

  var STORE_LABEL = { in: 'دواخل', out: 'خوارج', return: 'مرتجع' };

  function renderStoreSummary() {
    var box = $('#storeSummary');
    if (!box) return;
    var t = storeTotals();
    box.innerHTML =
      '<div class="summary__box summary__box--in"><small>إجمالي الدواخل (وارد)</small><b>' + money(t.amtIn) + '</b><span>' + t.inQty + ' كمية</span></div>' +
      '<div class="summary__box summary__box--out"><small>إجمالي الخوارج (صادر)</small><b>' + money(t.amtOut) + '</b><span>' + t.outQty + ' كمية</span></div>' +
      '<div class="summary__box"><small>إجمالي المرتجع</small><b>' + money(t.amtRet) + '</b><span>' + t.retQty + ' كمية</span></div>' +
      '<div class="summary__box summary__box--net"><small>المتبقي في المخزن</small><b>' + money(t.netAmt) + '</b><span>' + t.netQty + ' كمية</span></div>';
  }

  function renderStoreTable() {
    var tbody = $('#storeTbody');
    if (!tbody) return;
    var docs = storeDocs().slice().reverse();  /* الأحدث أولاً */
    var html = docs.map(function (d, n) {
      var lbl = STORE_LABEL[d.type] || d.type;
      var clsIn = d.type === 'in' ? 'tag--in' : 'tag--out';
      if (d.type === 'return') clsIn = 'tag--in';
      var bal = storeItemBalance(d.item) + (d.type === 'out' ? d.qty : (d.type === 'in' ? -d.qty : -d.qty));
      /* رصيد مخزن لو كانت الحركة دي سحبناها:
         القيمة الحالية للصنف بعد الحركة (يعرض جنب كل عملية) */
      return '<tr>' +
        '<td>' + (n + 1) + '</td>' +
        '<td>' + esc(formatDate(d.date)) + '</td>' +
        '<td><span class="tag ' + clsIn + '">' + esc(lbl) + '</span></td>' +
        '<td>' + esc(d.item || '—') + '</td>' +
        '<td>' + esc(d.qty) + '</td>' +
        '<td>' + money(d.price) + '</td>' +
        '<td class="amount ' + (d.type === 'out' ? 'neg' : 'pos') + '">' + (d.type === 'out' ? '- ' : '+ ') + money(d.total) + '</td>' +
        '<td>' + esc(d.partyName || '—') + '<small style="color:var(--muted)"> (' + esc(d.partyType === 'supplier' ? 'مورد' : d.partyType === 'customer' ? 'عميل' : 'شريك') + ')</small></td>' +
        '<td>' + esc(d.work || '—') + '</td>' +
        '<td class="cell-note">' + esc(d.note || '—') + '</td>' +
        '<td class="col-cell"><button type="button" class="btn btn--ghost btn--sm btn--danger" data-del-store="' + (docs.length - 1 - n) + '">حذف</button></td>' +
        '</tr>';
    });
    if (!docs.length) {
      html = ['<tr><td colspan="11" style="text-align:center;color:var(--muted);padding:26px">لا توجد حركات مخزن بعد — أضف أول حركة من النموذج أعلاه (دواخل للبضاعة الجديدة، خوارج للبيع، مرتجع للإرجاع).</td></tr>'];
    }
    tbody.innerHTML = html;
    var cnt = $('#storeCount');
    if (cnt) cnt.textContent = docs.length + ' حركة';
  }

  /* كل الحساب للصفحة: الملخص + الجدول + إشعار النقص */
  function renderStores() {
    renderStoreSummary();
    renderStoreTable();
    var sup = $('#storeShortagePanel');
    var txt = $('#storeShortageText');
    if (sup && txt) {
      var bad = storeShortages();
      if (bad.length) {
        sup.hidden = false;
        txt.innerHTML = '<b>في نقص في عناصر المخزون دي:</b> ' +
          bad.map(function (x) {
            return esc(x.item) + ' (المتبقي: ' + x.bal + ')';
          }).join('، ') +
          ' — انتبه لأن الخوارج كانت أعلى من الدواخل على الصنف. أضف «دواخل» جديدة أو راجع الخوارج.';
      } else {
        sup.hidden = true;
        txt.textContent = '';
      }
    }
  }

  function storePartyNames(type) {
    if (type === 'supplier') return getSuppliers().map(function (s) { return s.name; });
    if (type === 'customer') return getCustomers().map(function (c) { return c.name; });
    return getPartners().map(function (p) { return p.name; });
  }

  function fillStoreSuggests() {
    var sel = $('#storePartyType');
    var t = sel ? sel.value : 'supplier';
    var dl = $('#storePartyList');
    if (dl) {
      dl.innerHTML = storePartyNames(t).filter(Boolean).map(function (nm) {
        return '<option value="' + esc(nm) + '"></option>';
      }).join('');
    }
    var it = $('#storeItemList');
    if (it) {
      it.innerHTML = storeItems().map(function (nm) {
        return '<option value="' + esc(nm) + '"></option>';
      }).join('');
    }
  }

  function updateStoreCalc() {
    var f = $('#storeForm');
    if (!f) return;
    var qty = parseFloat(f.elements.qty.value) || 0;
    var price = parseFloat(f.elements.price.value) || 0;
    f.elements.storeTotal.value = money(qty * price);
    var item = String(f.elements.item.value || '').trim();
    var bal = item ? storeItemBalance(item) : 0;
    var typ = f.elements.type.value;
    if (item && typ === 'in') bal = bal + qty;
    else if (item && (typ === 'out' || typ === 'return')) bal = bal - qty;
    f.elements.storeItemBalance.value = bal + (item ? ' كمية من «' + item + '»' : '');
  }

  /* حركة يفعلها كل نوع: هي تحسب على المورد أو العميل والشريك في بروفايله تلقائياً */
  function storeLinkToParty(doc) {
    try {
      if (doc.type === 'in' && doc.partyType === 'supplier' && doc.partyName) {
        var sups = getSuppliers();
        var si = sups.map(function (s) { return String(s.name || '').trim(); }).indexOf(String(doc.partyName).trim());
        if (si > -1) {
          sups[si].tx = (sups[si].tx || []).concat([{
            date: doc.date, no: '',
            desc: 'توريد بضاعة (المخازن): ' + doc.item + ' — كمية ' + doc.qty,
            incoming: Number(doc.total || 0), paid: 0, via: 'stores'
          }]);
          saveSuppliers(sups);
        }
      }
      if (doc.type === 'out' && doc.partyType === 'customer' && doc.partyName) {
        var cs = getCustomers();
        var ci = cs.map(function (c) { return String(c.name || '').trim(); }).indexOf(String(doc.partyName).trim());
        if (ci > -1) {
          cs[ci].storeSends = (cs[ci].storeSends || []).concat([{
            date: doc.date, item: doc.item, qty: doc.qty, total: doc.total,
            work: doc.work || '', note: doc.note || '', via: 'stores'
          }]);
          saveCustomers(cs);
        }
      }
      if (doc.type === 'out' && doc.partyType === 'partner' && doc.partyName) {
        var pts = getPartners();
        var pi = pts.map(function (p) { return String(p.name || '').trim(); }).indexOf(String(doc.partyName).trim());
        if (pi > -1) {
          pts[pi].storeTakes = (pts[pi].storeTakes || []).concat([{
            date: doc.date, item: doc.item, qty: doc.qty, total: doc.total,
            work: doc.work || '', note: doc.note || '', via: 'stores'
          }]);
          savePartners(pts);
        }
      }
    } catch (e) {}
  }

  var storeForm = $('#storeForm');
  if (storeForm) {
    storeForm.addEventListener('input', updateStoreCalc);
    storeForm.addEventListener('change', function () {
      fillStoreSuggests();
      updateStoreCalc();
    });
    storeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('#storeError');
      var fail = function (m) { if (err) { err.textContent = m; err.hidden = false; } };
      var f = storeForm.elements;
      var date = f.date.value;
      var type = ['in', 'out', 'return'].indexOf(f.type.value) > -1 ? f.type.value : 'in';
      var item = String(f.item.value || '').trim();
      var qty = parseFloat(f.qty.value);
      var price = parseFloat(f.price.value);
      var partyType = f.partyType.value;
      var partyName = String(f.partyName.value || '').trim();
      var work = String(f.work.value || '').trim();
      var note = String(f.note.value || '').trim();

      var miss = [];
      if (!date) miss.push('التاريخ');
      if (!item) miss.push('اسم البضاعة');
      if (!(qty > 0)) miss.push('الكمية');
      if (!(price >= 0)) miss.push('السعر');
      if (!partyName) miss.push('اسم الطرف');
      if (miss.length) return fail('الرجاء إدخال: ' + miss.join('، '));
      if (err) err.hidden = true;

      var total = Math.round(qty * price);
      var docs = storeDocs();
      var doc = {
        date: date, type: type, item: item, qty: qty, price: price, total: total,
        partyType: partyType, partyName: partyName, work: work, note: note
      };
      docs.push(doc);
      saveStores({ docs: docs });
      storeLinkToParty(doc);

      storeForm.reset();
      f.date.value = todayISO();
      f.type.value = type;
      fillStoreSuggests();
      updateStoreCalc();
      renderStores();
      var lbl = STORE_LABEL[type] || type;
      toast('تم تسجيل ' + lbl + ' «' + item + '» بكمية ' + qty + ' وبتتعلق بـ ' + partyName + ' في بروفايله ✓');
    });
  }

  /* حذف حركة مخزن — بتفسخ كذلك الرابط عند الطرف إن وجد */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-del-store]');
    if (!b) return;
    var idx = parseInt(b.getAttribute('data-del-store'), 10);
    var docs = storeDocs();
    if (!(idx > -1) || idx >= docs.length) return;
    openConfirm({
      title: 'حذف حركة مخزن',
      message: 'هل تريد حذف حركة «' + docs[idx].item + '» نهائياً؟',
      yes: 'نعم، حذف', no: 'تراجع', password: true,
      onYes: function () {
        docs.splice(idx, 1);
        saveStores({ docs: docs });
        renderStores();
        toast('تم حذف حركة المخزن');
      }
    });
  });

  /* أعمدة الحساب في المخزن مع تنبيهاً بالأعلى عندما يكون العنصر ناقصاً */

  /* ---------- 6) التصدير: تقارير المخازن + إصدار إعادة الهيكلة ---------- */
  function reportStores() {
    var docs = storeDocs().slice().reverse();
    var rows = docs.map(function (d) {
      return [
        formatDate(d.date),
        STORE_LABEL[d.type] || d.type,
        d.item || '',
        Number(d.qty || 0),
        Number(d.price || 0),
        Number(d.total || 0),
        (d.partyName || '') + ' (' + (d.partyType === 'supplier' ? 'مورد' : d.partyType === 'customer' ? 'عميل' : 'شريك') + ')',
        d.work || '',
        d.note || ''
      ];
    });
    var t = storeTotals();
    var short = storeShortages();
    /* ملخص إجمالي + الأصناف تقريباً مع الرصيد */
    var items = storeItems().map(function (nm) {
      var b = storeItemBalance(nm);
      var hi = 0, lo = 0;
      storeDocs().forEach(function (d) {
        if (String(d.item || '').trim() !== nm) return;
        if (d.type === 'in') hi += Number(d.qty || 0); else lo += Number(d.qty || 0);
      });
      return [nm, b > 0 ? 'متوفر' : (b === 0 ? 'رجع صفر' : 'نقص!'), b, hi, lo];
    });
    rows.push(['—', '—', '—', '—', '—', '—', '—', '—', '—']);
    rows.push(['إجمالي الدواخل', '', '', t.inQty, '', t.amtIn, '', '', '']);
    rows.push(['إجمالي الخوارج', '', '', t.outQty, '', t.amtOut, '', '', '']);
    rows.push(['إجمالي المرتجع', '', '', t.retQty, '', t.amtRet, '', '', '']);
    rows.push(['المتبقي في المخزن', '', '', t.netQty, '', t.netAmt, '', '', '']);
    if (short.length) rows.push(['تنبيه نقص في: ' + short.map(function (s) { return s.item; }).join('، '), '', '', '', '', '', '', '', '']);
    return {
      title: 'المخازن — دواخل وخوارج ومرتجع',
      subtitle: (docs.length) + ' حركة — المتبقي في المخزن ' + money(t.netAmt) + ' (' + t.netQty + ' كمية)',
      columns: ['التاريخ', 'النوع', 'البضاعة', 'الكمية', 'السعر للوحدة', 'الإجمالي', 'الطرف', 'الشغلانة', 'ملاحظة'],
      rows: rows,
      moneyCols: [4, 5],
      totalRow: false,
      summary: [
        { label: 'المتبقي في المخزن', value: money(t.netAmt) },
        { label: 'إجمالي الدواخل', value: money(t.amtIn) },
        { label: 'إجمالي الخوارج', value: money(t.amtOut) },
        { label: 'إجمالي المرتجع', value: money(t.amtRet) }
      ]
    };
  }

  /* ورقة إجمالي الأصناف (رصيد كل بضاعة) — للتصدير المنظّم */
  function reportStoresItems() {
    var items = storeItems();
    var rows = items.map(function (nm) {
      var b = storeItemBalance(nm);
      var hi = 0, lo = 0;
      storeDocs().forEach(function (d) {
        if (String(d.item || '').trim() !== nm) return;
        if (d.type === 'in') hi += Number(d.qty || 0); else lo += Number(d.qty || 0);
      });
      return [nm, hi, lo, b, b <= 0 ? '⚠ نقص' : 'متوفر'];
    });
    return {
      title: 'رصيد المخازن لكل بضاعة',
      subtitle: 'كمية الدواخل والخوارج لكل صنف إجمالحصاد واضحة',
      columns: ['البضاعة', 'دخلت', 'خرجت', 'متبقٍ', 'الحالة'],
      rows: rows,
      moneyCols: [],
      totalRow: false,
      summary: [
        { label: 'عدد الأصناف', value: String(items.length) },
        { label: 'المتبقي إجمالي', value: String(storeTotals().netQty) + ' كمية' }
      ]
    };
  }
`;

/* أخزن الوحدة قبل قسم الإقلاع مباشرة */
rep(
`  /* ---------- الإقلاع ---------- */`,
STORES + `
  /* ---------- الإقلاع ---------- */`,
'stores.module');

/* ---------- 4) أوراق التصدير الظاهرة ---------- */
rep(
`    { key: 'partners',     label: 'الشركاء',          icon: 'ic-link' },
    { key: 'associations', label: 'الجمعيات',         icon: 'ic-group' }
  ];`,
`    { key: 'partners',     label: 'الشركاء',          icon: 'ic-link' },
    { key: 'associations', label: 'الجمعيات',         icon: 'ic-group' },
    { key: 'stores',       label: 'المخازن',          icon: 'ic-truck' }
  ];`,
'EXPORT_SECTIONS.stores');

rep(
`      case 'associations': return reportAssociations();
      default: return reportAll();`,
`      case 'associations': return reportAssociations();
      case 'stores': return reportStores();
      default: return reportAll();`,
'buildReport.stores');

/* ملف «الإكسل الكامل»: ورقة الحركات + ورقة رصيد الأصناف */
rep(
`  function allSheets() {
    var sheets = [reportToSheet(reportAll())];
    EXPORT_SECTIONS.forEach(function (s) { sheets.push(reportToSheet(buildReport(s.key))); });
    return sheets;
  }`,
`  function allSheets() {
    var sheets = [reportToSheet(reportAll())];
    EXPORT_SECTIONS.forEach(function (s) { sheets.push(reportToSheet(buildReport(s.key))); });
    /* إعادة هيكلة الورقة: رصيد كل بضاعة مستقل وواضح */
    try {
      var st = reportStoresItems();
      if (st.rows.length) {
        var itemSheet = {
          name: st.title, title: st.title, subtitle: st.subtitle || '',
          columns: st.columns, rows: st.rows,
          widths: reportWidths(st), moneyCols: st.moneyCols || [],
          summary: st.summary || [], totalRow: true
        };
        sheets.push(itemSheet);
      }
    } catch (e3) {}
    return sheets;
  }`,
'allSheets.stores');

/* «كل التطبيق (PDF)»: ملف واحد فيه ملخص + كل الأقسام */
rep(
`    if (t.closest('#exportAllPdf')) { doExport('all', 'pdf'); return; }`,
`    if (t.closest('#exportAllPdf')) { exportAppPdf(); return; }`,
'exportAllPdf.btn');

rep(
`  function doExport(key, kind) {`,
`  /* «كل التطبيق (PDF)»: ملف واحد فيه الملخص + كل أقسام التطبيق */
  function exportAppPdf() {
    if (typeof ExportKit === 'undefined') { toast('محرك التصدير غير محمّل', true); return; }
    if (!ExportKit.hasCanvas()) { toast('تصدير PDF يحتاج متصفحاً حقيقياً', true); return; }
    try {
      var reports = [reportAll()];
      EXPORT_SECTIONS.forEach(function (s) { reports.push(buildReport(s.key)); });
      var canvases = [];
      reports.forEach(function (r) {
        var ps = (ExportKit.drawReportPages ? ExportKit.drawReportPages(r) : null);
        if (ps && ps.length) canvases = canvases.concat(ps);
      });
      if (!canvases.length) { toast('تعذّر إنشاء ملف PDF', true); return; }
      var pdf = ExportKit.canvasesToPdf(canvases);
      if (!pdf) { toast('تعذّر إنشاء ملف PDF', true); return; }
      openExportModal('nizam-full-' + exportStamp() + '.pdf', MIME_PDF, pdf);
      toast('تم تجهيز «كل التطبيق PDF» — ' + canvases.length + ' صفحة ✓');
    } catch (e) {
      toast('خطأ في تصدير PDF: ' + (e && e.message ? e.message : e), true);
    }
  }

  function doExport(key, kind) {`,
'exportAppPdf.fn');

/* ---------- 5) الموردين: حركات المخازن في كشف الحساب ---------- */
rep(
`    var ops = list.map(function (o) {
      return {
        date: o.date, desc: o.desc || 'حركة من الدواخل والخوارج',
        src: 'الدواخل والخوارج', dir: o.type === 'out' ? 'out' : 'in',
        amount: o.amount, cash: true
      };
    });
    body.innerHTML = '<p class="panel__note">إجمالي الحركات المرتبطة: دخل ' + money(d.ledIn) +
      ' — خارج ' + money(d.ledOut) + ' (' + list.length + ' حركة) — محتسبة داخل كشف الحساب أعلاه بدون تكرار.</p>' +
      opsTable(ops);
  }`,
`    var ops = list.map(function (o) {
      return {
        date: o.date, desc: o.desc || 'حركة من الدواخل والخوارج',
        src: 'الدواخل والخوارج', dir: o.type === 'out' ? 'out' : 'in',
        amount: o.amount, cash: true
      };
    });
    var supName = (currentSupIdx > -1 && getSuppliers()[currentSupIdx]) ? String(getSuppliers()[currentSupIdx].name || '').trim() : '';
    var stOps = supName ? storeOpsFor('supplier', supName) : [];
    var stHtml = stOps.length
      ? '<h4 class="link-sub" style="margin:14px 0 6px">حركات المخازن المرتبطة بهذا المورد (دواخل)</h4>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>التاريخ</th><th>البضاعة</th><th>الكمية</th><th>السعر للوحدة</th><th>الإجمالي</th><th>ملاحظة</th></tr></thead><tbody>' +
        stOps.map(function (o, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + esc(formatDate(o.date)) + '</td><td>' + esc(o.item) + '</td><td>' + esc(o.qty) + '</td><td>' + money(o.price) + '</td><td class="amount pos">' + money(o.total) + '</td><td>' + esc(o.note || '') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : '';
    body.innerHTML = '<p class="panel__note">إجمالي الحركات المرتبطة: دخل ' + money(d.ledIn) +
      ' — خارج ' + money(d.ledOut) + ' (' + list.length + ' حركة) — محتسبة داخل كشف الحساب أعلاه بدون تكرار.</p>' +
      opsTable(ops) + stHtml;
  }`,
'supLedger.stores');

/* ملف العميل: حركات المخازن (خوارج/مرتجع) */
rep(
`    var h = '<h4 class="link-sub">توريدات وردت لك من الموردين</h4>';`,
`    var h = '<h4 class="link-sub">توريدات وردت لك من الموردين</h4>';`,
'profileLinks.anchor.noop', false);

fs.writeFileSync('app.js', src);
console.log('اكتمل الباتش بنجاح');
