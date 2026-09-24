const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Má»Ÿ khÃ³a Hardware Acceleration (GPU) cho H.265 (HEVC) trÃªn Chromium
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

// Ä á»•i Ä‘Æ°á» ng dáº«n lÆ°u dá»¯ liá»‡u sang %APPDATA%\minhhan.net\provms
app.setPath('userData', path.join(app.getPath('appData'), 'minhhan.net', 'provms'));

let mainWindow;
let serverProcess;
app.isQuiting = false;

// Chá»‰ cho phÃ©p 1 instance duy nháº¥t cháº¡y
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit(); // Instance thá»© 2 tá»± thoÃ¡t ngay
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// Cáº¥u hÃ¬nh IPC cho Auto Start
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

// Má»Ÿ mÃ n hÃ¬nh phá»¥
let secondaryWindows = [];
ipcMain.handle('open-secondary-window', () => {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        title: 'ProVMS Enterprise â€” MÃ n phá»¥',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'frontend/dist/favicon.png'),
        autoHideMenuBar: true,
        parent: mainWindow,
    });
    // Send grid size state as parameter maybe? No, we will use localStorage.
    win.loadURL('http://localhost:3000/?mode=viewer');
    secondaryWindows.push(win);
    win.on('closed', () => {
        secondaryWindows = secondaryWindows.filter(w => w !== win);
    });
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
    icon: path.join(__dirname, 'frontend/dist/favicon.png'),
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.loadURL('http://localhost:3000');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Quit completely when closing main window
  mainWindow.on('closed', function () {
    app.quit();
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGINT');
  }
});
