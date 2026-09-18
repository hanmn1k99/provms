const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Đổi đường dẫn lưu dữ liệu sang %APPDATA%\minhhan.net\provms
app.setPath('userData', path.join(app.getPath('appData'), 'minhhan.net', 'provms'));

let mainWindow;
let serverProcess;

// Cấu hình IPC cho Auto Start
ipcMain.handle('get-auto-start', () => {
    return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('set-auto-start', (event, enabled) => {
    app.setLoginItemSettings({
        openAtLogin: enabled,
        path: app.getPath('exe')
    });
    return app.getLoginItemSettings().openAtLogin;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ProVMS Enterprise",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'frontend/public/favicon.png'),
    autoHideMenuBar: true
  });

  mainWindow.loadURL('http://localhost:3000');
  
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', () => {
  const backendPath = path.join(__dirname, 'backend/server.js');
  
  const appDataDir = app.getPath('userData');
  const appDataDb = path.join(appDataDir, 'provms.db');
  const packagedDb = path.join(__dirname, 'backend/provms.db');
  
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }

  if (!fs.existsSync(appDataDb) && fs.existsSync(packagedDb)) {
    try {
      fs.copyFileSync(packagedDb, appDataDb);
    } catch(e) {
      console.error(e);
    }
  }
  
  serverProcess = spawn(process.execPath, [backendPath], {
    cwd: path.join(__dirname, 'backend'),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      APPDATA_PATH: app.getPath('userData')
    },
    stdio: 'inherit'
  });

  setTimeout(createWindow, 3000); 
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGINT');
  }
});
