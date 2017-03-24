const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, shell, globalShortcut } = require('electron')
const http = require('http')
const axios = require('axios')
const config = require('./config')
// const tray = require('./tray');

let mainWindow;
let isQuitting = false;

// copy custom style and js to appData

if (!fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'custom.css'))) {
  fs.createReadStream(path.join(__dirname, 'custom.css')).pipe(fs.createWriteStream(path.join(app.getPath('appData'), app.getName(), 'custom.css')))
}

if (!fs.existsSync(path.join(app.getPath('appData'), app.getName(), 'custom.js'))) {
  fs.createReadStream(path.join(__dirname, 'custom.js')).pipe(fs.createWriteStream(path.join(app.getPath('appData'), app.getName(), 'custom.js')))
}

const cssPath = path.join(app.getPath('appData'), app.getName(), 'custom.css')
const jsPath = path.join(app.getPath('appData'), app.getName(), 'custom.js')

const appMenu = require('./menu');

// TODO: not provide remote style yet
// const patchRemoteStyle = (page, url) => {
//   if (!url) {
//     page.insertCSS(fs.readFileSync(path.join(__dirname, 'custom.css'), 'utf8'));
//     return
//   }
//   axios.get(url)
//     .then(res => {
//       page.insertCSS(res.data)
//     })
//     .catch(e => {
//       // fetch failed, use local css
//       page.insertCSS(fs.readFileSync(path.join(__dirname, 'custom.css'), 'utf8'));
//     })
// }

const isAlreadyRunning = app.makeSingleInstance(() => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();
  }
});

if (isAlreadyRunning) {
  app.quit();
}

function createMainWindow() {
  const lastWindowState = config.get('lastWindowState');
  const win = new BrowserWindow({
    icon: path.join(__dirname, 'build', 'icon.ico'),
    titleBarStyle: 'hidden-inset',
    x: lastWindowState.x,
    y: lastWindowState.y,
    width: lastWindowState.width,
    height: lastWindowState.height,
    minWidth: 300,
    maxWidth: 500,
    maxHeight: 500 / 0.618,
    autoHideMenuBar: true,
    webPreferences: {
      preload: jsPath,
      nodeIntegration: false,
      plugins: true
    }
  });

  if (process.platform === 'darwin') {
    win.setSheetOffset(40);
  }

  win.loadURL('http://m.weibo.cn/beta');

  win.on('close', e => {
    if (!isQuitting) {
      e.preventDefault();

      if (process.platform === 'darwin') {
        app.hide();
      } else {
        win.hide();
      }
    }
  });

  win.on('page-title-updated', e => {
    e.preventDefault();
  });

  return win;
}

app.on('ready', () => {
  Menu.setApplicationMenu(appMenu);
  mainWindow = createMainWindow();
  // tray.create(mainWindow);

  const page = mainWindow.webContents;

  page.on('dom-ready', () => {
    page.insertCSS(fs.readFileSync(cssPath, 'utf8'));
    mainWindow.show();
  });

  page.on('new-window', (e, url) => {
    e.preventDefault();
    shell.openExternal(url);
  });
});

app.on('activate', () => {
  mainWindow.show();
});

app.on('before-quit', () => {
  isQuitting = true;

  if (!mainWindow.isFullScreen()) {
    config.set('lastWindowState', mainWindow.getBounds());
  }
});