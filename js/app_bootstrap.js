// =====================================================================
// PROD CONSOLE SILENCER
// Silencia console.log/info/debug em producao pra reduzir vazamento de
// info pra usuarios curiosos abrindo DevTools. Mantem console.warn e
// console.error porque Sentry usa eles como breadcrumbs e diagnosticar
// crashes em prod ainda eh util. Sentry intercepta antes da gente
// substituir aqui (ele carrega no <script> anterior).
// =====================================================================
(function silenceConsoleInProd(){
  try {
    const h = (typeof location !== 'undefined' && location.hostname) || '';
    const isLocal = h === 'localhost' || h === '127.0.0.1' || h === '';
    if (isLocal) return;
    const noop = function(){};
    if (typeof console !== 'undefined') {
      ['log','info','debug','trace','dir','dirxml','group','groupCollapsed','groupEnd','table'].forEach(function(m){
        if (typeof console[m] === 'function') console[m] = noop;
      });
    }
  } catch(e) {}
})();

(function initOrbitaAppBootstrap(){
  const existingApp = window.App || {};
  const existingConfig = existingApp.config || {};
  const existingServices = existingApp.services || {};
  const existingStorage = existingApp.storage || {};
  const serviceRegistry = existingApp.__serviceRegistry || Object.create(null);

  function getStorageArea(kind){
    try {
      return kind === 'session' ? window.sessionStorage : window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function getText(kind, key){
    const area = getStorageArea(kind);
    if (!area) return null;
    try {
      return area.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setText(kind, key, value){
    const area = getStorageArea(kind);
    if (!area) return false;
    try {
      if (value === undefined || value === null) area.removeItem(key);
      else area.setItem(key, String(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function removeText(kind, key){
    const area = getStorageArea(kind);
    if (!area) return false;
    try {
      area.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  function getJson(kind, key, fallback){
    const raw = getText(kind, key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function setJson(kind, key, value){
    try {
      return setText(kind, key, JSON.stringify(value));
    } catch (e) {
      return false;
    }
  }

  const App = existingApp;
  App.__orbitaBootstrapVersion = 'phase1-bootstrap';

  App.boot = Object.assign({}, existingApp.boot || {}, {
    scriptMode: 'classic',
    migrationStage: 'bootstrap'
  });

  App.config = Object.assign({}, existingConfig, {
    appName: existingConfig.appName || 'Orbita',
    entryScript: existingConfig.entryScript || './js/main.js',
    supabase: Object.assign({
      url: 'https://poedjpfrwpdsdjjjduow.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZWRqcGZyd3Bkc2RqampkdW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTgyNTksImV4cCI6MjA5MTU5NDI1OX0.6D0p4m9QPBPSlICDEMb2Y8umJpETbQ3FpInfwmpN-9o'
    }, existingConfig.supabase || {}),
    pwa: Object.assign({
      serviceWorkerPath: './sw.js'
    }, existingConfig.pwa || {}),
    storageKeys: Object.assign({
      save: 'orbita_save',
      profileNameCache: 'orbita_profile_name_cache',
      playerMlProfileCache: 'orbita_player_ml_profile_cache',
      analyticsQueue: 'orbita_analytics_queue',
      analyticsSession: 'orbita_analytics_session_id',
      pendingScore: 'orbita_pending_score',
      runSession: 'orbita_run_session'
    }, existingConfig.storageKeys || {})
  });

  App.storage = Object.assign({}, existingStorage, {
    getLocalText(key){ return getText('local', key); },
    setLocalText(key, value){ return setText('local', key, value); },
    removeLocal(key){ return removeText('local', key); },
    getLocalJson(key, fallback = null){ return getJson('local', key, fallback); },
    setLocalJson(key, value){ return setJson('local', key, value); },
    getSessionText(key){ return getText('session', key); },
    setSessionText(key, value){ return setText('session', key, value); },
    removeSession(key){ return removeText('session', key); },
    getSessionJson(key, fallback = null){ return getJson('session', key, fallback); },
    setSessionJson(key, value){ return setJson('session', key, value); }
  });

  App.__serviceRegistry = serviceRegistry;
  App.services = Object.assign({}, existingServices, {
    register(name, value){
      if (!name) return value;
      serviceRegistry[name] = value;
      return value;
    },
    get(name){
      return serviceRegistry[name];
    },
    has(name){
      return Object.prototype.hasOwnProperty.call(serviceRegistry, name);
    },
    list(){
      return Object.keys(serviceRegistry).sort();
    }
  });

  window.App = App;
})();
