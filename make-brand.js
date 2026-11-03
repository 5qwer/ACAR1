/* ============================================================
   make-brand.js — توليد أصول الهوية (شعار AMW Code + أيقونة التطبيق)
   التشغيل:  node make-brand.js
   المخرجات:
     icons/logo-amw.png / @2x / logo-amw-word.png   شعار الشركة (amw)
     icons/icon-192.png / icon-512.png / icon-maskable-512.png / favicon.png
     release/.icon-ico/icon.ico                     أيقونة نسخ الويندوز
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const NAVY_TOP = '#0b0b2e';
const NAVY_BOT = '#06061a';
const GRAD = ['#d124d8', '#a855f7', '#7c5cf0', '#4fb8f5', '#5ad2ee'];

function rounded(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function wordGradient(ctx, x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, GRAD[0]);
  g.addColorStop(0.32, GRAD[1]);
  g.addColorStop(0.64, GRAD[3]);
  g.addColorStop(1, GRAD[4]);
  return g;
}

/* ================= شعار الشركة: amw على كحلي ================= */
function drawLogo(size, opts) {
  const o = opts || {};
  const s = size / 512;
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  if (!o.transparent) {
    const bg = ctx.createLinearGradient(0, 0, size * 0.4, size);
    bg.addColorStop(0, NAVY_TOP);
    bg.addColorStop(1, NAVY_BOT);
    ctx.fillStyle = bg;
    if (o.rounded) { rounded(ctx, 0, 0, size, size, size * 0.22); ctx.fill(); }
    else ctx.fillRect(0, 0, size, size);

    const halo = ctx.createRadialGradient(size / 2, size * 0.54, 0, size / 2, size * 0.54, size * 0.55);
    halo.addColorStop(0, 'rgba(124,92,240,0.18)');
    halo.addColorStop(1, 'rgba(124,92,240,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);
  }

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = '600 ' + ((o.wordScale || 1) * 188 * s) + 'px "Segoe UI", "Trebuchet MS", Arial, sans-serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = (-7 * s) + 'px';
  const w = size * (o.wordWidth || 0.62);
  ctx.shadowColor = 'rgba(180,90,255,0.40)';
  ctx.shadowBlur = 24 * s;
  ctx.fillStyle = wordGradient(ctx, size / 2 - w, size / 2 + w);
  ctx.fillText('amw', size / 2, size * (o.wordY || 0.525));
  ctx.shadowBlur = 0;
  ctx.fillText('amw', size / 2, size * (o.wordY || 0.525));
  ctx.restore();
  return c;
}

function makeWord() {
  const W = 720, H = 240;
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = '600 168px "Segoe UI", "Trebuchet MS", Arial, sans-serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '-6px';
  ctx.fillStyle = wordGradient(ctx, 120, 600);
  ctx.fillText('amw', W / 2, H * 0.54);
  return c;
}

/* ================= أيقونة التطبيق ================= */
const GOLD_TOP = '#ffe9a6', GOLD_MID = '#f8c62e', GOLD_LOW = '#c78d08';

function goldGrad(ctx, S) {
  const g = ctx.createLinearGradient(S * 0.15, S * 0.2, S * 0.85, S * 0.9);
  g.addColorStop(0, GOLD_TOP);
  g.addColorStop(0.45, GOLD_MID);
  g.addColorStop(1, GOLD_LOW);
  return g;
}

function drawIcon(size, opts) {
  const o = opts || {};
  const S = size;
  const c = createCanvas(S, S);
  const ctx = c.getContext('2d');

  /* الخلفية */
  const bg = ctx.createRadialGradient(S * 0.46, S * 0.66, S * 0.04, S * 0.5, S * 0.55, S * 0.85);
  bg.addColorStop(0, '#245bb4');
  bg.addColorStop(0.42, '#0f2c66');
  bg.addColorStop(1, '#050a18');
  if (o.maskable) {
    ctx.fillStyle = '#050a18';
    ctx.fillRect(0, 0, S, S);
    rounded(ctx, S * 0.05, S * 0.05, S * 0.90, S * 0.90, S * 0.22);
    ctx.fillStyle = bg;
    ctx.fill();
  } else {
    ctx.fillStyle = bg;
    rounded(ctx, 0, 0, S, S, S * 0.215);
    ctx.fill();
  }

  ctx.save();
  rounded(ctx, 0, 0, S, S, o.maskable ? S * 0.27 : S * 0.215);
  ctx.clip();

  /* أفق المدينة */
  ctx.fillStyle = 'rgba(7,17,40,0.85)';
  [[0.00, 0.44], [0.06, 0.37], [0.12, 0.47], [0.17, 0.41], [0.80, 0.42], [0.86, 0.35], [0.93, 0.46]].forEach(function (b) {
    ctx.fillRect(S * b[0], S * b[1], S * 0.052, S * (0.95 - b[1]));
  });

  /* حلقة ذهبية على الحدود */
  ctx.strokeStyle = goldGrad(ctx, S);
  ctx.lineWidth = S * 0.025;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(S * 0.5, S * 0.5, S * 0.415, -Math.PI * 0.10, Math.PI * 0.60, false);
  ctx.stroke();

  /* مباني زجاجية */
  function building(x, y, w, h, tones, cols, rows) {
    const g = ctx.createLinearGradient(S * x, S * y, S * (x + w), S * (y + h));
    g.addColorStop(0, tones[0]);
    g.addColorStop(1, tones[1]);
    ctx.fillStyle = g;
    ctx.fillRect(S * x, S * y, S * w, S * h);
    const cw = (S * w) / cols, ch = (S * h) / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const lit = ((i * 5 + j * 3) % 4) !== 0;
        ctx.fillStyle = lit ? 'rgba(255,206,110,0.92)' : 'rgba(110,165,225,0.28)';
        ctx.fillRect(S * x + cw * (i + 0.28), S * y + ch * (j + 0.26), cw * 0.44, ch * 0.42);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = S * 0.004;
    ctx.strokeRect(S * x, S * y, S * w, S * h);
  }
  building(0.40, 0.30, 0.15, 0.52, ['#b6c8dd', '#5f7b9c'], 4, 12);
  building(0.27, 0.40, 0.14, 0.42, ['#8aa2bd', '#42586f'], 4, 9);
  building(0.55, 0.35, 0.16, 0.47, ['#c3d3e6', '#6b88a8'], 4, 10);

  /* بيت ذهبي */
  ctx.beginPath();
  ctx.moveTo(S * 0.50, S * 0.66);
  ctx.lineTo(S * 0.64, S * 0.53);
  ctx.lineTo(S * 0.78, S * 0.66);
  ctx.lineTo(S * 0.78, S * 0.82);
  ctx.lineTo(S * 0.50, S * 0.82);
  ctx.closePath();
  ctx.fillStyle = '#0f1d3a';
  ctx.fill();
  ctx.strokeStyle = goldGrad(ctx, S);
  ctx.lineWidth = S * 0.014;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,206,110,0.95)';
  ctx.fillRect(S * 0.585, S * 0.673, S * 0.050, S * 0.045);
  ctx.fillRect(S * 0.680, S * 0.673, S * 0.050, S * 0.045);
  ctx.fillRect(S * 0.585, S * 0.760, S * 0.050, S * 0.045);
  ctx.fillRect(S * 0.680, S * 0.760, S * 0.050, S * 0.045);

  /* ونش برجي */
  ctx.strokeStyle = '#ffcc3d';
  ctx.lineWidth = S * 0.009;
  ctx.lineCap = 'butt';
  const mx = 0.185;                         /* سارية */
  ctx.beginPath();
  ctx.moveTo(S * (mx - 0.012), S * 0.74); ctx.lineTo(S * (mx - 0.012), S * 0.175);
  ctx.moveTo(S * (mx + 0.012), S * 0.74); ctx.lineTo(S * (mx + 0.012), S * 0.175);
  ctx.stroke();
  ctx.lineWidth = S * 0.005;
  ctx.beginPath();                          /* درجات السارية */
  for (let i = 0; i < 9; i++) {
    const y = S * (0.20 + i * 0.06);
    ctx.moveTo(S * (mx - 0.012), y);
    ctx.lineTo(S * (mx + 0.012), y + S * 0.05);
  }
  ctx.stroke();
  ctx.lineWidth = S * 0.010;
  ctx.beginPath();                          /* الذراع */
  ctx.moveTo(S * 0.075, S * 0.17);
  ctx.lineTo(S * 0.46, S * 0.17);
  ctx.moveTo(S * (mx), S * 0.145);
  ctx.lineTo(S * (mx), S * 0.19);
  ctx.stroke();
  ctx.lineWidth = S * 0.004;
  ctx.beginPath();                          /* شبكة الذراع */
  for (let i = 0; i < 7; i++) {
    const x = 0.21 + i * 0.035;
    ctx.moveTo(S * x, S * 0.158);
    ctx.lineTo(S * (x + 0.018), S * 0.182);
  }
  ctx.stroke();
  ctx.lineWidth = S * 0.008;
  ctx.beginPath();                          /* حبل الخطاف */
  ctx.moveTo(S * 0.38, S * 0.17);
  ctx.lineTo(S * 0.38, S * 0.305);
  ctx.stroke();
  ctx.fillStyle = '#ffcc3d';
  ctx.fillRect(S * 0.372, S * 0.305, S * 0.016, S * 0.024);
  ctx.fillRect(S * 0.082, S * 0.152, S * 0.032, S * 0.024); /* ثقل */

  /* خوذة ذهبية */
  const hg = ctx.createLinearGradient(S * 0.12, S * 0.55, S * 0.42, S * 0.80);
  hg.addColorStop(0, '#fff0bd');
  hg.addColorStop(0.5, '#f9c62f');
  hg.addColorStop(1, '#b87f06');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(S * 0.262, S * 0.735, S * 0.135, S * 0.125, 0, Math.PI, 0);
  ctx.fill();
  rounded(ctx, S * 0.108, S * 0.720, S * 0.308, S * 0.052, S * 0.024);
  ctx.fillStyle = '#e0a30c';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  rounded(ctx, S * 0.115, S * 0.722, S * 0.294, S * 0.018, S * 0.009);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = S * 0.007;
  ctx.beginPath();
  ctx.moveTo(S * 0.265, S * 0.625);
  ctx.lineTo(S * 0.265, S * 0.732);
  ctx.stroke();

  /* لفائف المخططات */
  function roll(x, y, w, h) {
    const g = ctx.createLinearGradient(0, S * y, 0, S * (y + h));
    g.addColorStop(0, '#f2f7fd');
    g.addColorStop(0.6, '#cfdbe9');
    g.addColorStop(1, '#8fa2b8');
    ctx.fillStyle = g;
    rounded(ctx, S * x, S * y, S * w, S * h, S * h * 0.5);
    ctx.fill();
    ctx.fillStyle = '#7f92a8';
    ctx.beginPath();
    ctx.ellipse(S * (x + w), S * (y + h / 2), S * h * 0.15, S * h * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  roll(0.09, 0.845, 0.34, 0.055);
  roll(0.20, 0.905, 0.28, 0.045);

  /* رقائق الأيقونات */
  const U = S * 0.052;
  const glyph = {
    list: function (cx, cy, u) {
      ctx.fillStyle = '#eaf3ff';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(cx - u * 0.75, cy - u * 0.45 + i * u * 0.45, u * 1.5, u * 0.16);
        ctx.fillRect(cx - u * 0.95, cy - u * 0.45 + i * u * 0.45, u * 0.14, u * 0.16);
      }
    },
    people: function (cx, cy, u) {
      ctx.fillStyle = '#eaf3ff';
      ctx.beginPath(); ctx.arc(cx - u * 0.40, cy - u * 0.34, u * 0.24, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + u * 0.40, cy - u * 0.34, u * 0.24, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - u * 0.40, cy + u * 0.46, u * 0.46, u * 0.34, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + u * 0.40, cy + u * 0.46, u * 0.46, u * 0.34, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - u * 0.10, u * 0.30, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy + u * 0.70, u * 0.58, u * 0.40, 0, Math.PI, 0); ctx.fill();
    },
    chart: function (cx, cy, u) {
      ctx.fillStyle = '#ffe0a0';
      ctx.fillRect(cx - u * 0.8, cy + u * 0.05, u * 0.34, u * 0.6);
      ctx.fillRect(cx - u * 0.22, cy - u * 0.45, u * 0.34, u * 1.1);
      ctx.fillRect(cx + u * 0.38, cy - u * 0.15, u * 0.34, u * 0.8);
    },
    calendar: function (cx, cy, u) {
      ctx.strokeStyle = '#eaf3ff';
      ctx.lineWidth = u * 0.13;
      rounded(ctx, cx - u * 0.8, cy - u * 0.62, u * 1.6, u * 1.35, u * 0.22);
      ctx.stroke();
      ctx.fillStyle = '#eaf3ff';
      ctx.fillRect(cx + u * 0.05, cy - u * 0.05, u * 0.42, u * 0.42);
    },
    gear: function (cx, cy, u) {
      ctx.fillStyle = '#eaf3ff';
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * u * 0.72, cy + Math.sin(a) * u * 0.72);
        ctx.rotate(a);
        ctx.fillRect(-u * 0.11, -u * 0.16, u * 0.22, u * 0.32);
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(cx, cy, u * 0.52, 0, 7); ctx.fill();
      ctx.fillStyle = '#0d1c3c';
      ctx.beginPath(); ctx.arc(cx, cy, u * 0.20, 0, 7); ctx.fill();
    }
  };
  const chipList = ['list', 'people', 'chart', 'calendar', 'gear'];
  chipList.forEach(function (name, i) {
    const x = S * 0.760, y = S * (0.185 + i * 0.125), w = S * 0.195, h = S * 0.092;
    ctx.fillStyle = 'rgba(9,24,55,0.96)';
    ctx.strokeStyle = 'rgba(96,196,255,0.85)';
    ctx.lineWidth = S * 0.007;
    rounded(ctx, x, y, w, h, h * 0.30);
    ctx.fill(); ctx.stroke();
    glyph[name](x + w / 2, y + h / 2, U * 0.9);
  });

  ctx.restore();
  return c;
}

/* ---------- ICO ---------- */
function buildIco(pngs) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let offset = 6 + pngs.length * 16;
  const dir = Buffer.alloc(pngs.length * 16);
  pngs.forEach(function (p, i) {
    const b = i * 16;
    dir.writeUInt8(p.size >= 256 ? 0 : p.size, b);
    dir.writeUInt8(p.size >= 256 ? 0 : p.size, b + 1);
    dir.writeUInt8(0, b + 2);
    dir.writeUInt8(0, b + 3);
    dir.writeUInt16LE(1, b + 4);
    dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(p.buf.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += p.buf.length;
  });
  return Buffer.concat([head, dir].concat(pngs.map(function (p) { return p.buf; })));
}

function save(canvas, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
  console.log('  ✔ ' + file + '  (' + canvas.width + '×' + canvas.height + ')');
}

const root = __dirname;
save(drawLogo(512), path.join(root, 'icons/logo-amw.png'));
save(drawLogo(1024, { wordScale: 1.02 }), path.join(root, 'icons/logo-amw@2x.png'));
save(makeWord(), path.join(root, 'icons/logo-amw-word.png'));
save(drawIcon(512), path.join(root, 'icons/icon-512.png'));
save(drawIcon(192), path.join(root, 'icons/icon-192.png'));
save(drawIcon(512, { maskable: true }), path.join(root, 'icons/icon-maskable-512.png'));
save(drawIcon(64), path.join(root, 'icons/favicon.png'));
save(drawIcon(1024), path.join(root, 'icons/icon-source-1024.png'));

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icoPngs = icoSizes.map(function (s) { return { size: s, buf: drawIcon(s).toBuffer('image/png') }; });
const icoPath = path.join(root, 'release/.icon-ico/icon.ico');
fs.mkdirSync(path.dirname(icoPath), { recursive: true });
fs.writeFileSync(icoPath, buildIco(icoPngs));
console.log('  ✔ ' + icoPath + '  (' + icoSizes.join('/') + ')');
console.log('تم توليد أصول الهوية.');
