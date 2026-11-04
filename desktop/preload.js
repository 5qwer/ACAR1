/* ============================================================
   desktop/preload.js — جسر فولدر النسخ المحلي (Electron)
   يوفّر window.NizamLocalFolder للتطبيق:
     - pick()        اختيار فولدر من الجهاز
     - info()        الفولدر المختار + آخر نسخة + عدد الملفات
     - clear()       إلغاء الربط
     - saveText()    كتابة ملف نصي (JSON)
     - saveBinary()  كتابة ملف ثنائي (PDF/Excel) من base64
   ============================================================ */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('NizamLocalFolder', {
  available: true,
  platform: 'electron',
  pick: function () { return ipcRenderer.invoke('backup:pick'); },
  info: function () { return ipcRenderer.invoke('backup:info'); },
  clear: function () { return ipcRenderer.invoke('backup:clear'); },
  saveText: function (name, text) { return ipcRenderer.invoke('backup:save', { name: name, text: text }); },
  saveBinary: function (name, base64) { return ipcRenderer.invoke('backup:saveBinary', { name: name, base64: base64 }); }
});
