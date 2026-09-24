const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Mở khóa Hardware Acceleration (GPU) cho H.265 (HEVC) trên Chromium
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

// Đổi đường dẫn lưu dữ liệu sang %APPDATA%\minhhan.net\provms
app.setPath('userData', path.join(app.getPath('appData'), 'minhhan.net', 'provms'));

let mainWindow;
let serverProcess;
let tray = null;
app.isQuiting = false;

// Chỉ cho phép 1 instance duy nhất chạy
// Instance thứ 2 sẽ tự đóng và focus vào cửa sổ instance đầu tiên
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit(); // Instance thứ 2 tự thoát ngay
} else {
    app.on('second-instance', () => {
        // Khi user mở lần 2, focus vào cửa sổ đang chạy
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// Cấu hình IPC cho Auto Start
ipcMain.handle('get-auto-start', () => {
    return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('set-auto-start', (event, enabled) => {
    app.setLoginItemSettings({
        openAtLogin: enabled,
        path: app.getPath('exe'),
        args: [
          '--processStart', `"${app.name}"`,
          '--process-start-args', `"--hidden"`
        ]
    });
    return app.getLoginItemSettings().openAtLogin;
});

// Mở màn hình phụ — BrowserWindow thật sự của Electron (cùng 1 app)
let secondaryWindows = [];
ipcMain.handle('open-secondary-window', () => {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        title: 'ProVMS Enterprise — Màn phụ',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'frontend/dist/favicon.png'),
        autoHideMenuBar: true,
        parent: mainWindow,   // Gắn với cửa sổ chính — cùng 1 app
        // KHÔNG dùng modal: true để có thể tự do di chuyển sang màn hình khác
    });
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
    show: false // Don't show immediately
  });

  mainWindow.loadURL('http://localhost:3000');
  
  // Only show if not started hidden
  mainWindow.once('ready-to-show', () => {
    if (!process.argv.includes('--hidden')) {
      mainWindow.show();
    }
  });

  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      secondaryWindows.forEach(w => w.hide());
    }
    return false;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'frontend/dist/favicon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mở ProVMS', click: () => { 
        mainWindow.show(); 
        secondaryWindows.forEach(w => w.show());
      } 
    },
    { type: 'separator' },
    { label: 'Thoát hoàn toàn', click: () => {
        app.isQuiting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('ProVMS Enterprise');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      secondaryWindows.forEach(w => w.hide());
    } else {
      mainWindow.show();
      secondaryWindows.forEach(w => w.show());
    }
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

  createTray();
  setTimeout(createWindow, 3000); 
});

app.on('window-all-closed', function () {
  // Tránh tự động tắt trên Windows khi đóng cửa sổ
  // Vì chúng ta muốn nó chạy ngầm dưới system tray
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGINT');
  }
});
