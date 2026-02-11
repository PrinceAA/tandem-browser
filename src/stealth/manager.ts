import { Session } from 'electron';

/**
 * StealthManager — Makes Tandem Browser look like a regular human browser.
 * 
 * Anti-detection measures:
 * 1. Realistic User-Agent (matches real Chrome)
 * 2. Remove automation indicators
 * 3. Consistent fingerprinting
 * 4. Realistic request headers
 */
export class StealthManager {
  private session: Session;

  // Match latest stable Chrome on macOS
  private readonly USER_AGENT = 
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  constructor(session: Session) {
    this.session = session;
  }

  async apply(): Promise<void> {
    // Set realistic User-Agent
    this.session.setUserAgent(this.USER_AGENT);

    // Modify headers to look natural
    this.session.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders };
      
      // Remove Electron/automation giveaways
      delete headers['X-Electron'];
      
      // Ensure realistic Accept-Language
      if (!headers['Accept-Language']) {
        headers['Accept-Language'] = 'nl-BE,nl;q=0.9,en-US;q=0.8,en;q=0.7';
      }

      // Ensure Sec-CH-UA matches our UA
      headers['Sec-CH-UA'] = '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"';
      headers['Sec-CH-UA-Mobile'] = '?0';
      headers['Sec-CH-UA-Platform'] = '"macOS"';

      callback({ requestHeaders: headers });
    });

    console.log('🛡️ Stealth patches applied');
  }

  /**
   * JavaScript to inject into pages to hide automation indicators
   */
  static getStealthScript(): string {
    return `
      // Hide webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Hide Electron from plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ]
      });

      // Realistic languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['nl-BE', 'nl', 'en-US', 'en']
      });

      // Chrome runtime — complete mock matching real Chrome
      if (!window.chrome) {
        window.chrome = {};
      }
      if (!window.chrome.runtime) {
        window.chrome.runtime = {
          OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
          OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
          PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
          RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
          connect: function() { return { onDisconnect: { addListener: function() {} }, onMessage: { addListener: function() {} }, postMessage: function() {}, disconnect: function() {} }; },
          sendMessage: function() {},
          id: undefined,
        };
      }
      if (!window.chrome.loadTimes) {
        window.chrome.loadTimes = function() {
          return { commitLoadTime: Date.now() / 1000, connectionInfo: 'h2', finishDocumentLoadTime: Date.now() / 1000, finishLoadTime: Date.now() / 1000, firstPaintAfterLoadTime: 0, firstPaintTime: Date.now() / 1000, navigationType: 'Other', npnNegotiatedProtocol: 'h2', requestTime: Date.now() / 1000 - 0.3, startLoadTime: Date.now() / 1000 - 0.3, wasAlternateProtocolAvailable: false, wasFetchedViaSpdy: true, wasNpnNegotiated: true };
        };
      }
      if (!window.chrome.csi) {
        window.chrome.csi = function() {
          return { onloadT: Date.now(), pageT: Date.now() / 1000, startE: Date.now(), tran: 15 };
        };
      }
      if (!window.chrome.app) {
        window.chrome.app = { isInstalled: false, getDetails: function() { return null; }, getIsInstalled: function() { return false; }, installState: function() { return 'not_installed'; }, runningState: function() { return 'cannot_run'; }, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } };
      }

      // Remove Electron giveaways from window
      try { delete window.process; } catch(e) {}
      try { delete window.require; } catch(e) {}
      try { delete window.module; } catch(e) {}
      try { delete window.exports; } catch(e) {}
      try { delete window.Buffer; } catch(e) {}
      try { delete window.__dirname; } catch(e) {}
      try { delete window.__filename; } catch(e) {}
      // Ensure process is truly gone
      Object.defineProperty(window, 'process', { get: () => undefined, configurable: true });

      // navigator.userAgentData — match real Chrome
      if (!navigator.userAgentData) {
        Object.defineProperty(navigator, 'userAgentData', {
          get: () => ({
            brands: [
              { brand: 'Google Chrome', version: '131' },
              { brand: 'Chromium', version: '131' },
              { brand: 'Not_A Brand', version: '24' },
            ],
            mobile: false,
            platform: 'macOS',
            getHighEntropyValues: (hints) => Promise.resolve({
              brands: [
                { brand: 'Google Chrome', version: '131' },
                { brand: 'Chromium', version: '131' },
                { brand: 'Not_A Brand', version: '24' },
              ],
              mobile: false,
              platform: 'macOS',
              platformVersion: '15.3.0',
              architecture: 'arm',
              bitness: '64',
              model: '',
              uaFullVersion: '131.0.0.0',
              fullVersionList: [
                { brand: 'Google Chrome', version: '131.0.0.0' },
                { brand: 'Chromium', version: '131.0.0.0' },
                { brand: 'Not_A Brand', version: '24.0.0.0' },
              ],
            }),
            toJSON: function() {
              return { brands: this.brands, mobile: this.mobile, platform: this.platform };
            },
          }),
          configurable: true,
        });
      }

      // Permissions API
      const originalQuery = window.navigator.permissions?.query;
      if (originalQuery) {
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      }

      // Ensure window.Notification exists
      if (!window.Notification) {
        window.Notification = { permission: 'default' };
      }

      // ConnectionType for Network Information API
      if (navigator.connection) {
        // Already exists, fine
      }
    `;
  }
}
