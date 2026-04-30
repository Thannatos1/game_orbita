let deferredInstallPrompt = null;
let canInstallApp = false;
let installPromptSeen = false;
let pwaStatusText = '';
const pwaAppConfig = window.App && window.App.config && window.App.config.pwa ? window.App.config.pwa : {};
const pwaAppServiceRegistry = window.App && window.App.services ? window.App.services : null;
const pwaServiceWorkerPath = pwaAppConfig.serviceWorkerPath || './sw.js';
const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
const canShowIosInstallHelp = isIosDevice && !isStandaloneApp;
// isLocalPreviewHost ja declarado em services.js (carregado antes); evita SyntaxError de redeclaracao

function updatePwaStatusText() {
  if (isStandaloneApp) {
    pwaStatusText = 'App instalado';
  } else if (canInstallApp) {
    pwaStatusText = 'Pronto para instalar';
  } else if (canShowIosInstallHelp) {
    pwaStatusText = 'Instale pelo Compartilhar';
  } else {
    pwaStatusText = 'Abra no navegador do celular para instalar';
  }
}
updatePwaStatusText();

async function promptInstallApp() {
  if (isStandaloneApp) return true;

  if (deferredInstallPrompt) {
    try {
      if (typeof trackEvent === 'function') trackEvent('pwa_install_prompt_open', { screen: menuScreen || 'unknown' });
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (typeof trackEvent === 'function') trackEvent('pwa_install_prompt_result', { outcome: choice?.outcome || 'unknown' });
      if (choice?.outcome === 'accepted') {
        deferredInstallPrompt = null;
        canInstallApp = false;
        updatePwaStatusText();
        return true;
      }
    } catch (e) {
      console.warn('[Orbita] install prompt failed', e);
    }
    updatePwaStatusText();
    return false;
  }

  if (canShowIosInstallHelp) {
    menuScreen = 'installHelp';
    return false;
  }

  return false;
}

function initPWA() {
  if (isLocalPreviewHost) return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(pwaServiceWorkerPath).then(() => {
        if (typeof trackEvent === 'function') trackEvent('pwa_sw_registered', {});
      }).catch(err => {
        console.warn('[Orbita] service worker register failed', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    canInstallApp = true;
    updatePwaStatusText();
    if (!installPromptSeen && typeof trackEvent === 'function') {
      installPromptSeen = true;
      trackEvent('pwa_install_available', { screen: menuScreen || 'unknown' });
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    canInstallApp = false;
    updatePwaStatusText();
    if (typeof trackEvent === 'function') trackEvent('pwa_installed', {});
  });
}

initPWA();

if (pwaAppServiceRegistry && typeof pwaAppServiceRegistry.register === 'function') {
  pwaAppServiceRegistry.register('promptInstallApp', promptInstallApp);
  pwaAppServiceRegistry.register('initPWA', initPWA);
}
