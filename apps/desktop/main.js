const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function getApiUrl() {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.apiUrl) {
        return data.apiUrl;
      }
    } else {
      const defaultConfig = { apiUrl: 'http://localhost:3000' };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      return defaultConfig.apiUrl;
    }
  } catch (err) {
    console.error('Error handling config.json:', err);
  }
  return process.env.VITE_API_URL || 'http://localhost:3000';
}

ipcMain.on('hmat:get-api-url-sync', (event) => {
  event.returnValue = getApiUrl();
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'HMAT Pharmacy POS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  const htmlPath = path.join(__dirname, 'renderer', 'index.html');
  if (fs.existsSync(htmlPath)) {
    win.loadFile(htmlPath);
  } else {
    win.loadURL('http://localhost:5173');
  }
}

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

ipcMain.handle('hmat:save-receipt-pdf', async (event, receiptHtml) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    throw new Error('Unable to access browser window for PDF save');
  }

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save Receipt as PDF',
    defaultPath: 'receipt.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const htmlDocument = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:20px;font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;color:#111;background:#fff;}@media print{body{margin:0;}}</style></head><body>${receiptHtml}</body></html>`;
  await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlDocument)}`);

  await new Promise((resolve, reject) => {
    const contents = pdfWindow.webContents;
    if (contents.isLoadingMainFrame()) {
      contents.once('did-finish-load', resolve);
      contents.once('did-fail-load', (event, errorCode, errorDescription) => reject(new Error(errorDescription || `Load failed: ${errorCode}`)));
    } else {
      resolve();
    }
  });

  const pdfData = await pdfWindow.webContents.printToPDF({
    printBackground: true,
    marginsType: 1,
    pageSize: 'A4',
  });

  await fs.promises.writeFile(filePath, pdfData);
  pdfWindow.close();
  return { canceled: false, filePath };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
