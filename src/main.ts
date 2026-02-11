import { app, BrowserWindow, session, ipcMain, Notification, globalShortcut, clipboard, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { TandemAPI } from './api/server';
import { StealthManager } from './stealth/manager';
import { TabManager } from './tabs/manager';
import { PanelManager } from './panel/manager';
import { DrawOverlayManager } from './draw/overlay';
import { ActivityTracker } from './activity/tracker';
import { VoiceManager } from './voice/recognition';
import { BehaviorObserver } from './behavior/observer';
import { ConfigManager } from './config/manager';

const IS_DEV = process.argv.includes('--dev');
const API_PORT = 8765;

let mainWindow: BrowserWindow | null = null;
let api: TandemAPI | null = null;
let tabManager: TabManager | null = null;
let panelManager: PanelManager | null = null;
let drawManager: DrawOverlayManager | null = null;
let activityTracker: ActivityTracker | null = null;
let voiceManager: VoiceManager | null = null;
let behaviorObserver: BehaviorObserver | null = null;
let configManager: ConfigManager | null = null;

async function createWindow(): Promise<BrowserWindow> {
  const partition = 'persist:tandem';
  const ses = session.fromPartition(partition);

  const stealth = new StealthManager(ses);
  await stealth.apply();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Tandem Browser',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      partition,
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'shell', 'index.html'));

  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    tabManager = null;
    if (behaviorObserver) behaviorObserver.destroy();
  });

  return mainWindow;
}

async function startAPI(win: BrowserWindow): Promise<void> {
  configManager = new ConfigManager();
  tabManager = new TabManager(win);
  panelManager = new PanelManager(win);
  drawManager = new DrawOverlayManager(win);
  activityTracker = new ActivityTracker(win, panelManager, drawManager);
  voiceManager = new VoiceManager(win, panelManager);
  behaviorObserver = new BehaviorObserver(win);
  api = new TandemAPI(win, API_PORT, tabManager, panelManager, drawManager, activityTracker, voiceManager, behaviorObserver, configManager);
  await api.start();
  console.log(`🧠 Tandem API running on http://localhost:${API_PORT}`);

  // Listen for tab metadata updates from renderer
  ipcMain.on('tab-update', (_event, data: { tabId: string; title?: string; url?: string; favicon?: string }) => {
    tabManager?.updateTab(data.tabId, data);
  });

  // Listen for initial tab registration
  ipcMain.on('tab-register', (_event, data: { webContentsId: number; url: string }) => {
    if (tabManager && tabManager.count === 0) {
      const tab = tabManager.registerInitialTab(data.webContentsId, data.url);
      // Notify renderer of the tab ID
      win.webContents.send('tab-registered', { tabId: tab.id });
    }
  });

  // ═══ Chat IPC — Robin sends messages from renderer ═══
  ipcMain.on('chat-send', (_event, text: string) => {
    if (text && panelManager) {
      panelManager.addChatMessage('robin', text);
    }
  });

  // ═══ Screenshot Snap — composites webview + canvas, saves + clipboard ═══
  ipcMain.handle('snap-for-kees', async () => {
    try {
      const activeTab = tabManager?.getActiveTab();
      if (!activeTab) return { ok: false, error: 'No active tab' };

      const result = await drawManager!.captureAnnotatedFull(activeTab.webContentsId, activeTab.url);
      return result;
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ═══ Quick Screenshot (no draw mode) ═══
  ipcMain.handle('quick-screenshot', async () => {
    try {
      const activeTab = tabManager?.getActiveTab();
      if (!activeTab) return { ok: false, error: 'No active tab' };

      const result = await drawManager!.captureQuickScreenshot(activeTab.webContentsId, activeTab.url);
      return result;
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ═══ Voice IPC ═══
  ipcMain.on('voice-transcript', (_event, data: { text: string; isFinal: boolean }) => {
    if (voiceManager) {
      voiceManager.handleTranscript(data.text, data.isFinal);
    }
  });

  ipcMain.on('voice-status-update', (_event, data: { listening: boolean }) => {
    if (voiceManager) {
      voiceManager.setListening(data.listening);
    }
  });

  // ═══ Activity tracking: webview events from renderer ═══
  ipcMain.on('activity-webview-event', (_event, data: { type: string; url?: string; tabId?: string }) => {
    if (activityTracker) {
      activityTracker.onWebviewEvent(data);
    }
    // Also record in behavioral observer
    if (behaviorObserver && data.type === 'did-navigate' && data.url) {
      behaviorObserver.recordNavigation(data.url, data.tabId);
    }
  });

  // Tab management IPC for renderer shortcuts
  ipcMain.handle('tab-new', async () => {
    const newtabPath = `file://${path.join(__dirname, '..', 'shell', 'newtab.html')}`;
    return tabManager?.openTab(newtabPath);
  });

  ipcMain.handle('tab-close', async (_event, tabId: string) => {
    return tabManager?.closeTab(tabId);
  });

  ipcMain.handle('tab-focus', async (_event, tabId: string) => {
    if (behaviorObserver) behaviorObserver.recordTabSwitch(tabId);
    return tabManager?.focusTab(tabId);
  });

  ipcMain.handle('tab-focus-index', async (_event, index: number) => {
    return tabManager?.focusByIndex(index);
  });

  ipcMain.handle('tab-list', async () => {
    return tabManager?.listTabs();
  });
}

function registerShortcuts(): void {
  // Cmd+T — new tab
  globalShortcut.register('CommandOrControl+T', () => {
    mainWindow?.webContents.send('shortcut', 'new-tab');
  });

  // Cmd+W — close tab
  globalShortcut.register('CommandOrControl+W', () => {
    mainWindow?.webContents.send('shortcut', 'close-tab');
  });

  // Cmd+K — toggle Kees panel
  globalShortcut.register('CommandOrControl+K', () => {
    panelManager?.togglePanel();
  });

  // Cmd+D — toggle draw mode
  globalShortcut.register('CommandOrControl+D', () => {
    drawManager?.toggleDrawMode();
  });

  // Cmd+M — toggle voice input
  globalShortcut.register('CommandOrControl+M', () => {
    voiceManager?.toggleVoice();
  });

  // Cmd+Shift+S — quick screenshot (no draw mode)
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow?.webContents.send('shortcut', 'quick-screenshot');
  });

  // Cmd+, — open settings
  globalShortcut.register('CommandOrControl+,', () => {
    mainWindow?.webContents.send('shortcut', 'open-settings');
  });

  // Cmd+1-9 — switch tabs
  for (let i = 1; i <= 9; i++) {
    globalShortcut.register(`CommandOrControl+${i}`, () => {
      mainWindow?.webContents.send('shortcut', `focus-tab-${i - 1}`);
    });
  }
}

// Copilot alert — notify Robin when Kees needs help
export function copilotAlert(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title: `🧀 ${title}`, body }).show();
  }
  mainWindow?.webContents.send('copilot-alert', { title, body });
}

app.whenReady().then(async () => {
  const win = await createWindow();
  await startAPI(win);
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().then(w => {
        startAPI(w);
        registerShortcuts();
      });
    }
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (behaviorObserver) behaviorObserver.destroy();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
