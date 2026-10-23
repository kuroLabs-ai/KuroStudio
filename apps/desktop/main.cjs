const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

let mainWindow = null;

// ─── Real Audio Waveform Extraction IPC Handler ─────────────────────────────
ipcMain.handle('extract-audio-waveform', async (_event, filePath, sampleCount = 400) => {
  return new Promise((resolve) => {
    try {
      if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) {
        return resolve(null);
      }

      // Convert audio stream to 2000Hz mono 16-bit PCM streamed to stdout
      const args = [
        '-v', 'error',
        '-i', filePath,
        '-vn',
        '-ac', '1',
        '-ar', '2000',
        '-f', 's16le',
        '-'
      ];

      const proc = spawn(ffmpegPath, args);
      const chunks = [];

      proc.stdout.on('data', (chunk) => {
        chunks.push(chunk);
      });

      proc.on('close', (code) => {
        if (chunks.length === 0) {
          return resolve(null);
        }

        const buffer = Buffer.concat(chunks);
        const int16Count = Math.floor(buffer.length / 2);
        if (int16Count <= 0) return resolve(null);

        const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, int16Count);
        const targetCount = sampleCount || 400;
        const step = Math.max(1, Math.floor(int16Count / targetCount));
        const peaks = [];

        for (let i = 0; i < targetCount; i++) {
          const start = i * step;
          const end = Math.min(int16Count, start + step);
          let maxVal = 0;
          for (let j = start; j < end; j += 2) {
            const abs = Math.abs(int16Array[j]);
            if (abs > maxVal) maxVal = abs;
          }
          // Normalize Int16 (0..32767) to range 0.04 .. 1.0
          const normalized = Math.max(0.04, Math.min(1.0, maxVal / 32767));
          peaks.push(parseFloat(normalized.toFixed(3)));
        }

        resolve(peaks);
      });

      proc.on('error', () => resolve(null));
    } catch {
      resolve(null);
    }
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'KuroStudio',
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  // Load Vite dev server URL with retry if server is still starting up
  const loadDevServer = () => {
    mainWindow.loadURL(devUrl).catch(() => {
      console.log('Waiting for Vite dev server at ' + devUrl + '...');
      setTimeout(loadDevServer, 1000);
    });
  };

  loadDevServer();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
