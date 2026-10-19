const { contextBridge } = require('electron');

const bridgeImplementation = {
  getAppVersion: () => '0.1.0',
  isWindows10: () => true,
  probeMedia: async (filePath) => ({
    filePath,
    formatName: 'mp4',
    durationSeconds: 10,
    durationTicks: 300000,
    fileSizeBytes: 1048576,
    allStreams: [],
  }),
  getStoreCatalog: async () => [],
};

try {
  contextBridge.exposeInMainWorld('kuroBridge', bridgeImplementation);
} catch (e) {
  // Ignored outside contextBridge
}
