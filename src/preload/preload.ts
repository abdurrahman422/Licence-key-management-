import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  copyClipboard: (text: string) => ipcRenderer.invoke('app:copy-clipboard', text),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
  openFileDialog: (options?: any) => ipcRenderer.invoke('dialog:open-file', options),
  saveFileDialog: (options?: any) => ipcRenderer.invoke('dialog:save-file', options),
});
