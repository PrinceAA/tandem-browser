import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tandem', {
  // Navigation
  navigate: (url: string) => ipcRenderer.invoke('navigate', url),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),

  // Page content
  getPageContent: () => ipcRenderer.invoke('get-page-content'),
  getPageStatus: () => ipcRenderer.invoke('get-page-status'),
  executeJS: (code: string) => ipcRenderer.invoke('execute-js', code),

  // Tab management
  newTab: () => ipcRenderer.invoke('tab-new'),
  closeTab: (tabId: string) => ipcRenderer.invoke('tab-close', tabId),
  focusTab: (tabId: string) => ipcRenderer.invoke('tab-focus', tabId),
  focusTabByIndex: (index: number) => ipcRenderer.invoke('tab-focus-index', index),
  listTabs: () => ipcRenderer.invoke('tab-list'),

  // Tab events to main
  sendTabUpdate: (data: { tabId: string; title?: string; url?: string; favicon?: string }) => {
    ipcRenderer.send('tab-update', data);
  },
  registerTab: (webContentsId: number, url: string) => {
    ipcRenderer.send('tab-register', { webContentsId, url });
  },

  // Events from main process
  onCopilotAlert: (callback: (data: { title: string; body: string }) => void) => {
    ipcRenderer.on('copilot-alert', (_event, data) => callback(data));
  },
  onNavigated: (callback: (url: string) => void) => {
    ipcRenderer.on('navigated', (_event, url) => callback(url));
  },
  onShortcut: (callback: (action: string) => void) => {
    ipcRenderer.on('shortcut', (_event, action) => callback(action));
  },
  onTabRegistered: (callback: (data: { tabId: string }) => void) => {
    ipcRenderer.on('tab-registered', (_event, data) => callback(data));
  },
});
