const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hmatApi', {
  ping: () => ipcRenderer.invoke('hmat:ping'),
  saveReceiptPdf: (receiptHtml) => ipcRenderer.invoke('hmat:save-receipt-pdf', receiptHtml),
  getApiUrlSync: () => ipcRenderer.sendSync('hmat:get-api-url-sync'),
});
