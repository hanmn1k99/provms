const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
    setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
    openSecondaryWindow: () => ipcRenderer.invoke('open-secondary-window')
});
