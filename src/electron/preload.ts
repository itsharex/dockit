import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('browserWindow', {
  versions: () => ipcRenderer.invoke('versions'),
});

contextBridge.exposeInMainWorld('electronAPI', {
  openGitHub: () => ipcRenderer.send('open-github'),
});
