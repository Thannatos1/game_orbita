// ============ SUPABASE / AUTH / GLOBAL RANKING ============
const servicesAppConfig = window.App && window.App.config ? window.App.config : {};
const servicesAppStorageKeys = servicesAppConfig.storageKeys || {};
const servicesAppStorage = window.App && window.App.storage ? window.App.storage : null;
const servicesAppServiceRegistry = window.App && window.App.services ? window.App.services : null;
const SUPABASE_URL = servicesAppConfig.supabase && servicesAppConfig.supabase.url ? servicesAppConfig.supabase.url : 'https://poedjpfrwpdsdjjjduow.supabase.co';
const SUPABASE_KEY = servicesAppConfig.supabase && servicesAppConfig.supabase.anonKey ? servicesAppConfig.supabase.anonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvZWRqcGZyd3Bkc2RqampkdW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTgyNTksImV4cCI6MjA5MTU5NDI1OX0.6D0p4m9QPBPSlICDEMb2Y8umJpETbQ3FpInfwmpN-9o';
const isLocalPreviewHost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || '');

function getLocalText(key) {
  if (servicesAppStorage && typeof servicesAppStorage.getLocalText === 'function') return servicesAppStorage.getLocalText(key);
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function setLocalText(key, value) {
  if (servicesAppStorage && typeof servicesAppStorage.setLocalText === 'function') return servicesAppStorage.setLocalText(key, value);
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (e) {
    return false;
  }
}

function removeLocal(key) {
  if (servicesAppStorage && typeof servicesAppStorage.removeLocal === 'function') return servicesAppStorage.removeLocal(key);
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

function getLocalJson(key, fallback = null) {
  if (servicesAppStorage && typeof servicesAppStorage.getLocalJson === 'function') return servicesAppStorage.getLocalJson(key, fallback);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setLocalJson(key, value) {
  if (servicesAppStorage && typeof servicesAppStorage.setLocalJson === 'function') return servicesAppStorage.setLocalJson(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

function getSessionText(key) {
  if (servicesAppStorage && typeof servicesAppStorage.getSessionText === 'function') return servicesAppStorage.getSessionText(key);
  try {
    return sessionStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function setSessionText(key, value) {
  if (servicesAppStorage && typeof servicesAppStorage.setSessionText === 'function') return servicesAppStorage.setSessionText(key, value);
  try {
    sessionStorage.setItem(key, String(value));
    return true;
  } catch (e) {
    return false;
  }
}

function getSessionJson(key, fallback = null) {
  if (servicesAppStorage && typeof servicesAppStorage.getSessionJson === 'function') return servicesAppStorage.getSessionJson(key, fallback);
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setSessionJson(key, value) {
  if (servicesAppStorage && typeof servicesAppStorage.setSessionJson === 'function') return servicesAppStorage.setSessionJson(key, value);
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

function removeSession(key) {
  if (servicesAppStorage && typeof servicesAppStorage.removeSession === 'function') return servicesAppStorage.removeSession(key);
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

let sb = null;
function initSupabase() {
  if (sb) return sb;
  if (isLocalPreviewHost) return null;
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    try {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('[Orbita] Supabase client created');
    } catch(e) {
      console.error('[Orbita] Supabase init failed', e);
    }
  } else {
    console.warn('[Orbita] Supabase SDK not available yet');
  }
  return sb;
}
initSupabase();

// Auth state
let currentUser = null;
let playerName = '';
let authLoading = true;
let needsNickname = false;
let nicknameBuffer = '';
let nicknameError = '';
let nicknameChecking = false;
let nicknameStatusText = '';

// Ranking state
let rankings = [];
let rankingsLoading = false;
let rankingsError = '';
let userPosition = -1;
let lastSubmittedScore = 0;

const RUN_SESSION_KEY = servicesAppStorageKeys.runSession || 'orbita_run_session';
let activeRunSession = null;

const PROFILE_NAME_CACHE_KEY = servicesAppStorageKeys.profileNameCache || 'orbita_profile_name_cache';
const PLAYER_ML_PROFILE_CACHE_KEY = servicesAppStorageKeys.playerMlProfileCache || 'orbita_player_ml_profile_cache';
let playerMlProfile = null;
let playerMlProfileOwnerId = '';
let playerMlProfileFetchedAt = 0;
let playerMlProfileLoading = false;

function getCachedProfileName() {
  try {
    const raw = getLocalText(PROFILE_NAME_CACHE_KEY);
    const value = String(raw || '').trim().toUpperCase();
    return value || '';
  } catch (e) {
    return '';
  }
}

function setCachedProfileName(name) {
  try {
    const value = String(name || '').trim().toUpperCase();
    if (value) setLocalText(PROFILE_NAME_CACHE_KEY, value);
    else removeLocal(PROFILE_NAME_CACHE_KEY);
  } catch (e) {}
}

function syncWindowPlayerMlProfile() {
  try {
    window.__orbitaPlayerMlProfile = getCachedPlayerMlProfile();
  } catch (e) {}
}

function loadCachedPlayerMlProfile() {
  try {
    const cached = getLocalJson(PLAYER_ML_PROFILE_CACHE_KEY, null);
    if (!cached || typeof cached !== 'object') {
      playerMlProfile = null;
      playerMlProfileOwnerId = '';
      playerMlProfileFetchedAt = 0;
      syncWindowPlayerMlProfile();
      return;
    }

    const profile = cached.profile && typeof cached.profile === 'object' ? cached.profile : cached;
    playerMlProfile = profile && typeof profile === 'object' ? profile : null;
    playerMlProfileOwnerId = String(cached.user_id || cached.owner_id || '').trim();
    playerMlProfileFetchedAt =
      Number(cached.fetched_at || cached.fetchedAt || 0) ||
      Date.parse(String(cached.fetched_at_iso || '')) ||
      0;
  } catch (e) {
    playerMlProfile = null;
    playerMlProfileOwnerId = '';
    playerMlProfileFetchedAt = 0;
  }
  syncWindowPlayerMlProfile();
}

function persistPlayerMlProfile() {
  try {
    if (playerMlProfile && typeof playerMlProfile === 'object' && playerMlProfile.ok) {
      setLocalJson(PLAYER_ML_PROFILE_CACHE_KEY, {
        user_id: playerMlProfileOwnerId || (currentUser && currentUser.id) || null,
        fetched_at: playerMlProfileFetchedAt || Date.now(),
        profile: playerMlProfile
      });
    } else {
      removeLocal(PLAYER_ML_PROFILE_CACHE_KEY);
    }
  } catch (e) {}
  syncWindowPlayerMlProfile();
}

function clearCachedPlayerMlProfile() {
  playerMlProfile = null;
  playerMlProfileOwnerId = '';
  playerMlProfileFetchedAt = 0;
  playerMlProfileLoading = false;
  try {
    removeLocal(PLAYER_ML_PROFILE_CACHE_KEY);
  } catch (e) {}
  syncWindowPlayerMlProfile();
}

function adoptCachedPlayerMlProfileForCurrentUser() {
  if (!currentUser || !currentUser.id) {
    syncWindowPlayerMlProfile();
    return null;
  }
  if (playerMlProfileOwnerId && playerMlProfileOwnerId !== currentUser.id) {
    clearCachedPlayerMlProfile();
    return null;
  }
  if (!playerMlProfileOwnerId && playerMlProfile) {
    playerMlProfileOwnerId = currentUser.id;
    persistPlayerMlProfile();
  } else {
    syncWindowPlayerMlProfile();
  }
  return playerMlProfile;
}

function isPlayerMlProfileFresh(maxAgeMinutes = 60) {
  if (!playerMlProfile || !playerMlProfileFetchedAt) return false;
  const maxAgeMs = Math.max(5, Math.min(Number(maxAgeMinutes) || 60, 240)) * 60 * 1000;
  return (Date.now() - playerMlProfileFetchedAt) < maxAgeMs;
}

function getCachedPlayerMlProfile() {
  if (!currentUser || !currentUser.id) return null;
  if (playerMlProfileOwnerId && playerMlProfileOwnerId !== currentUser.id) return null;
  return playerMlProfile;
}

async function refreshPlayerMlProfile(days = 14, opts = {}) {
  if (!sb) initSupabase();
  adoptCachedPlayerMlProfileForCurrentUser();
  if (!sb || !currentUser || !networkOnline) return getCachedPlayerMlProfile();
  if (playerMlProfileLoading) return getCachedPlayerMlProfile();
  if (!opts.force && isPlayerMlProfileFresh(opts.maxAgeMinutes || 60)) {
    return getCachedPlayerMlProfile();
  }

  playerMlProfileLoading = true;
  try {
    const data = await getPlayerMlProfile(days);
    if (data && typeof data === 'object' && data.ok) {
      playerMlProfile = data;
      playerMlProfileOwnerId = currentUser.id;
      playerMlProfileFetchedAt = Date.now();
      persistPlayerMlProfile();
    }
    return getCachedPlayerMlProfile();
  } catch (e) {
    return getCachedPlayerMlProfile();
  } finally {
    playerMlProfileLoading = false;
  }
}

// Analytics
const ANALYTICS_QUEUE_KEY = servicesAppStorageKeys.analyticsQueue || 'orbita_analytics_queue';
const ANALYTICS_SESSION_KEY = servicesAppStorageKeys.analyticsSession || 'orbita_analytics_session_id';
let analyticsQueue = [];
let analyticsFlushTimer = null;
let analyticsSending = false;
let analyticsSessionId = null;
let loadProfileInFlight = null;

const PENDING_SCORE_KEY = servicesAppStorageKeys.pendingScore || 'orbita_pending_score';
let networkOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
let pendingScoreSubmission = null;

function loadPendingScoreSubmission() {
  try {
    pendingScoreSubmission = getLocalJson(PENDING_SCORE_KEY, null);
  } catch (e) {
    pendingScoreSubmission = null;
  }
}

function persistPendingScoreSubmission() {
  try {
    if (pendingScoreSubmission) setLocalJson(PENDING_SCORE_KEY, pendingScoreSubmission);
    else removeLocal(PENDING_SCORE_KEY);
  } catch (e) {}
}

function hasPendingScoreSubmission() {
  return !!(
    pendingScoreSubmission &&
    Number.isFinite(Number(pendingScoreSubmission.score)) &&
    pendingScoreSubmission.run_id
  );
}

function loadRunSession() {
  try {
    activeRunSession = getSessionJson(RUN_SESSION_KEY, null);
  } catch (e) {
    activeRunSession = null;
  }
}

function persistRunSession() {
  try {
    if (activeRunSession) setSessionJson(RUN_SESSION_KEY, activeRunSession);
    else removeSession(RUN_SESSION_KEY);
  } catch (e) {}
}

function clearActiveRunSession() {
  activeRunSession = null;
  persistRunSession();
}

function isNetworkError(error) {
  const msg = String(error?.message || error?.details || error || '').toLowerCase();
  return !networkOnline || msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch') || msg.includes('timeout');
}

function queuePendingScoreSubmission(score, skin) {
  if (!activeRunSession || !activeRunSession.run_id) return false;

  const next = {
    score: Number(score) || 0,
    skin: skin || null,
    run_id: activeRunSession.run_id,
    queued_at: new Date().toISOString()
  };

  if (!pendingScoreSubmission || next.score >= Number(pendingScoreSubmission.score || 0)) {
    pendingScoreSubmission = next;
    persistPendingScoreSubmission();
  }
  return true;
}

async function flushPendingScoreSubmission() {
  if (!hasPendingScoreSubmission() || !networkOnline || !sb || !currentUser) return false;

  const next = pendingScoreSubmission;
  try {
    const { data, error } = await sb.rpc('submit_score_secure', {
      p_run_id: next.run_id,
      p_score: Number(next.score) || 0,
      p_skin: next.skin || null,
      p_client_meta: {
        source: 'pending_flush',
        queued_at: next.queued_at || null
      }
    });
    if (error) throw error;

    if (data?.stored !== undefined) {
      lastSubmittedScore = Math.max(lastSubmittedScore, Number(data.stored) || 0);
    }

    trackEvent('pending_score_flushed', {
      submitted: Number(next.score) || 0,
      stored: Number(data?.stored || next.score || 0),
      run_id: next.run_id
    }, { urgent: true });

    pendingScoreSubmission = null;
    persistPendingScoreSubmission();
    clearActiveRunSession();
    return true;
  } catch (e) {
    console.warn('[Orbita] pending score flush failed', e);
    return false;
  }
}

function setNetworkOnlineStatus(isOnline) {
  const changed = networkOnline !== !!isOnline;
  networkOnline = !!isOnline;
  if (changed) {
    trackEvent(networkOnline ? 'network_online' : 'network_offline', { pending_score: hasPendingScoreSubmission() });
  }
}

function getAnalyticsSessionId() {
  if (analyticsSessionId) return analyticsSessionId;
  try {
    analyticsSessionId = getSessionText(ANALYTICS_SESSION_KEY);
    if (!analyticsSessionId) {
      analyticsSessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('sess_' + Date.now() + '_' + Math.random().toString(16).slice(2));
      setSessionText(ANALYTICS_SESSION_KEY, analyticsSessionId);
    }
  } catch (e) {
    analyticsSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }
  return analyticsSessionId;
}

function loadAnalyticsQueue() {
  try {
    analyticsQueue = getLocalJson(ANALYTICS_QUEUE_KEY, []);
    if (!Array.isArray(analyticsQueue)) analyticsQueue = [];
  } catch (e) {
    analyticsQueue = [];
  }
}

function persistAnalyticsQueue() {
  try {
    setLocalJson(ANALYTICS_QUEUE_KEY, analyticsQueue.slice(-200));
  } catch (e) {}
}

function sanitizeAnalyticsValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 120);
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeAnalyticsValue);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value).slice(0, 24)) {
      out[k] = sanitizeAnalyticsValue(v);
    }
    return out;
  }
  return String(value).slice(0, 120);
}

function trackEvent(eventName, payload = {}, opts = {}) {
  if (!eventName) return;
  const evt = {
    session_id: getAnalyticsSessionId(),
    event_name: String(eventName).slice(0, 64),
    payload: sanitizeAnalyticsValue(payload || {}),
    client_ts: new Date().toISOString(),
  };
  analyticsQueue.push(evt);
  if (analyticsQueue.length > 200) analyticsQueue = analyticsQueue.slice(-200);
  persistAnalyticsQueue();
  scheduleAnalyticsFlush(opts.urgent ? 250 : 1500);
}

function scheduleAnalyticsFlush(delay = 1500) {
  if (analyticsFlushTimer) return;
  analyticsFlushTimer = setTimeout(() => {
    analyticsFlushTimer = null;
    flushAnalyticsQueue();
  }, delay);
}

let analyticsBackoffUntil = 0;

async function flushAnalyticsQueue(force = false) {
  if (analyticsSending) return false;
  if (!analyticsQueue.length) return true;
  if (!sb) initSupabase();
  if (!networkOnline) return false;
  if (!sb) return false;
  if (Date.now() < analyticsBackoffUntil) return false;

  const batch = analyticsQueue.slice(0, 25);
  analyticsSending = true;
  try {
    const { error } = await sb.rpc('log_analytics_events', { p_events: batch });
    if (error) throw error;
    analyticsQueue.splice(0, batch.length);
    persistAnalyticsQueue();
    if (analyticsQueue.length && Date.now() >= analyticsBackoffUntil) scheduleAnalyticsFlush(force ? 400 : 1500);
    return true;
  } catch (e) {
    const msg = String(e?.message || e?.details || '').toLowerCase();
    if (msg.includes('rate limit')) {
      analyticsBackoffUntil = Date.now() + 60_000;
    } else if (msg.includes('batch too large')) {
      analyticsQueue = analyticsQueue.slice(-100);
      persistAnalyticsQueue();
    }
    console.warn('[Orbita] analytics flush failed', e);
    return false;
  } finally {
    analyticsSending = false;
  }
}

loadAnalyticsQueue();
loadPendingScoreSubmission();
loadRunSession();
loadCachedPlayerMlProfile();

// Initialize auth on load
async function initAuth() {
  if (!sb) initSupabase();

  console.log('[Orbita] initAuth starting. SDK available:', !!sb);

  if (!sb) {
    console.warn('[Orbita] No Supabase SDK - offline mode');
    authLoading = false;
    menuScreen = 'main';
    return;
  }

  const timeoutId = setTimeout(() => {
    console.warn('[Orbita] Auth check timeout');
    if (authLoading) {
      authLoading = false;
      menuScreen = 'main';
    }
  }, 5000);

  try {
    const { data: { session } } = await sb.auth.getSession();
    console.log('[Orbita] Session:', !!session);
    if (session && session.user) {
      currentUser = session.user;
      adoptCachedPlayerMlProfileForCurrentUser();
      const cachedName = getCachedProfileName();
      if (cachedName) {
        playerName = cachedName;
        needsNickname = false;
      }
      menuScreen = 'main';
      authLoading = false;

      loadProfile().then(() => {
        console.log('[Orbita] Profile loaded. playerName:', playerName, 'needsNickname:', needsNickname);
        menuScreen = (playerName && !needsNickname) ? 'main' : 'nickname';
      }).catch(e => console.warn('[Orbita] loadProfile chain failed', e));

      trackEvent('auth_signed_in', { has_nickname: !!playerName });
      scheduleAnalyticsFlush(400);
      flushPendingScoreSubmission().catch(e => console.warn('[Orbita] flushPendingScoreSubmission failed', e));
      refreshPlayerMlProfile(14, { maxAgeMinutes: 20 }).catch(e => console.warn('[Orbita] refreshPlayerMlProfile failed', e));
    } else {
      menuScreen = 'main';
      authLoading = false;
    }
  } catch(e) {
    console.error('[Orbita] Auth init failed', e);
    menuScreen = 'main';
    authLoading = false;
  }
  clearTimeout(timeoutId);
  console.log('[Orbita] initAuth done. Screen:', menuScreen);
  trackEvent('app_open', { screen: menuScreen, has_session: !!currentUser, online: networkOnline });
  scheduleAnalyticsFlush(600);
  flushPendingScoreSubmission().catch(e => console.warn('[Orbita] flushPendingScoreSubmission failed', e));
}

async function loadProfile() {
  if (!sb || !currentUser) return;
  if (loadProfileInFlight) return loadProfileInFlight;
  const ownerAtStart = currentUser.id;
  loadProfileInFlight = (async () => {
    try {
      const { data, error } = await sb
        .from('profiles')
        .select('name')
        .eq('id', ownerAtStart)
        .maybeSingle();
      if (error) throw error;
      if (!currentUser || currentUser.id !== ownerAtStart) return;
      if (data && data.name) {
        playerName = String(data.name);
        setCachedProfileName(playerName);
        needsNickname = false;
      } else {
        playerName = '';
        setCachedProfileName('');
        needsNickname = true;
      }
    } catch(e) {
      console.error('Load profile failed', e);
    } finally {
      loadProfileInFlight = null;
    }
  })();
  return loadProfileInFlight;
}

async function signInWithGoogle() {
  if (!sb || !networkOnline) {
    trackEvent('auth_sign_in_blocked_offline', { screen: menuScreen || 'unknown' });
    rankingsError = 'Sem internet';
    return;
  }
  try {
    trackEvent('auth_sign_in_click', { screen: menuScreen || 'unknown' });
    const safeRedirect = new URL('./', window.location.href).toString();
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: safeRedirect }
    });
  } catch(e) {
    console.error('Sign in failed', e);
  }
}

async function signOut() {
  if (!sb) return;
  try {
    trackEvent('auth_sign_out', { screen: menuScreen || 'unknown' });
    await sb.auth.signOut();
    currentUser = null;
    playerName = '';
    setCachedProfileName('');
    clearCachedPlayerMlProfile();
    needsNickname = false;
    clearActiveRunSession();
    menuScreen = 'main';
  } catch(e) {
    console.error('Sign out failed', e);
  }
}

function normalizeNickname(name) {
  return String(name || '').trim().toUpperCase();
}

async function startServerRunSession(mode = 'normal', source = 'unknown') {
  clearActiveRunSession();

  if (!sb || !currentUser || !networkOnline) {
    return null;
  }

  refreshPlayerMlProfile(14, { maxAgeMinutes: 15 }).catch(e => console.warn('[Orbita] refreshPlayerMlProfile failed', e));

  try {
    const { data, error } = await sb.rpc('start_run_session', {
      p_mode: mode,
      p_client_meta: {
        source,
        best: Number(best) || 0,
        selected_skin: selectedSkin || null,
        selected_bg: selectedBg || null
      }
    });
    if (error) throw error;

    activeRunSession = {
      run_id: data?.run_id || null,
      mode: data?.mode || mode,
      started_at: data?.started_at || new Date().toISOString(),
      source
    };
    persistRunSession();

    trackEvent('run_session_started', {
      mode: activeRunSession.mode,
      source,
      has_nickname: !!playerName
    });

    return activeRunSession;
  } catch (e) {
    console.error('start_run_session failed', e);
    clearActiveRunSession();
    return null;
  }
}

function getRpcNicknameError(e) {
  const msg = String(e?.message || e?.details || '').toLowerCase();
  if (msg.includes('nickname already in use')) return 'Apelido já em uso!';
  if (msg.includes('invalid nickname')) return 'Use 3 a 16 letras ou números';
  if (msg.includes('not authenticated')) return 'Faça login para salvar';
  return 'Erro ao salvar';
}

function getRpcScoreError(e) {
  const msg = String(e?.message || e?.details || '').toLowerCase();
  if (msg.includes('profile without nickname')) return 'Defina um apelido antes de enviar score';
  if (msg.includes('not authenticated')) return 'Login necessário para ranking';
  if (msg.includes('run session required')) return 'Partida inválida. Abra uma nova run';
  if (msg.includes('run not found')) return 'Run não encontrada';
  if (msg.includes('run already finished')) return 'Essa run já foi encerrada';
  if (msg.includes('run expired')) return 'Essa run expirou. Jogue outra';
  if (msg.includes('run too short')) return 'Run curta demais para ranking';
  if (msg.includes('score exceeds server limit')) return 'Score rejeitado pelo servidor';
  if (msg.includes('score exceeds absolute cap')) return 'Score acima do limite absoluto';
  if (msg.includes('zen mode is not ranked')) return 'Modo Zen não entra no ranking';
  return 'Erro ao enviar score';
}

async function setNicknameViaRpc(name) {
  if (!sb || !currentUser) {
    return { ok: false, error: 'Não logado' };
  }

  const cleanName = normalizeNickname(name);
  if (!/^[A-Z0-9]{3,16}$/.test(cleanName)) {
    return { ok: false, error: 'Use 3 a 16 letras ou números' };
  }

  try {
    const { data, error } = await sb.rpc('set_nickname', { p_name: cleanName });
    if (error) throw error;
    const finalName = String(data?.name || cleanName);
    playerName = finalName;
    setCachedProfileName(playerName);
    needsNickname = false;
    nicknameError = '';
    nicknameStatusText = '';
    trackEvent('nickname_set', { name_len: finalName.length });
    return { ok: true, name: finalName };
  } catch (e) {
    console.error('set_nickname failed', e);
    return { ok: false, error: getRpcNicknameError(e) };
  }
}

async function saveNickname(name) {
  const result = await setNicknameViaRpc(name);
  if (!result.ok) {
    nicknameError = result.error;
    return false;
  }
  return true;
}

async function submitScore(score, skin) {
  if (!sb || !currentUser) return false;
  if (!activeRunSession || !activeRunSession.run_id) {
    console.warn('[Orbita] secure submit blocked: no active run session');
    return false;
  }

  if (!networkOnline) {
    const queued = queuePendingScoreSubmission(score, skin);
    if (queued) {
      lastSubmittedScore = Math.max(lastSubmittedScore, Number(score) || 0);
      trackEvent('score_queued_offline', {
        submitted: Number(score) || 0,
        skin: skin || null,
        run_id: activeRunSession.run_id
      });
      return true;
    }
    return false;
  }

  try {
    const { data, error } = await sb.rpc('submit_score_secure', {
      p_run_id: activeRunSession.run_id,
      p_score: Number(score) || 0,
      p_skin: skin || null,
      p_client_meta: {
        source: 'game_over',
        best_local: Number(best) || 0,
        selected_skin: skin || null,
        selected_bg: selectedBg || null
      }
    });
    if (error) throw error;

    if (data?.stored !== undefined) {
      lastSubmittedScore = Math.max(lastSubmittedScore, Number(data.stored) || 0);
    }

    trackEvent('score_submitted', {
      submitted: Number(score) || 0,
      stored: Number(data?.stored || score || 0),
      new_record: !!data?.new_record,
      skin: skin || null,
      run_id: activeRunSession.run_id,
      duration_seconds: Number(data?.duration_seconds || 0)
    });

    clearActiveRunSession();
    return true;
  } catch (e) {
    console.error('submit_score_secure failed', e);

    if (isNetworkError(e)) {
      const queued = queuePendingScoreSubmission(score, skin);
      if (queued) {
        lastSubmittedScore = Math.max(lastSubmittedScore, Number(score) || 0);
        trackEvent('score_queued_retry', {
          submitted: Number(score) || 0,
          skin: skin || null,
          run_id: activeRunSession.run_id
        });
        return true;
      }
    }

    const friendly = getRpcScoreError(e);
    if (friendly === 'Defina um apelido antes de enviar score') {
      needsNickname = true;
    }
    if (
      friendly === 'Partida inválida. Abra uma nova run' ||
      friendly === 'Run não encontrada' ||
      friendly === 'Essa run já foi encerrada' ||
      friendly === 'Essa run expirou. Jogue outra' ||
      friendly === 'Run curta demais para ranking' ||
      friendly === 'Score rejeitado pelo servidor' ||
      friendly === 'Modo Zen não entra no ranking'
    ) {
      clearActiveRunSession();
    }
    return false;
  }
}

async function loadRankings() {
  if (!networkOnline) {
    rankingsError = 'Sem internet';
    return;
  }
  if (!sb) {
    rankingsError = 'Sem conexão';
    return;
  }
  rankingsLoading = true;
  rankingsError = '';
  try {
    const { data, error } = await sb
      .from('rankings')
      .select('name, score, skin, user_id')
      .order('score', { ascending: false })
      .limit(50);
    if (error) throw error;
    rankings = data || [];
    userPosition = -1;
    if (currentUser) {
      for (let i = 0; i < rankings.length; i++) {
        if (rankings[i].user_id === currentUser.id) {
          userPosition = i;
          break;
        }
      }
    }
  } catch(e) {
    rankingsError = 'Erro ao carregar';
    console.error('Load failed', e);
  }
  rankingsLoading = false;
}

async function getPlayerMlProfile(days = 14) {
  if (!sb) initSupabase();
  if (!sb || !currentUser) return null;
  try {
    const { data, error } = await sb.rpc('get_player_ml_profile', {
      p_days: Math.max(3, Math.min(Number(days) || 14, 90))
    });
    if (error) throw error;
    return data || null;
  } catch (e) {
    console.error('get_player_ml_profile failed', e);
    return null;
  }
}

async function deleteAccount() {
  if (!sb || !currentUser) return false;

  try {
    const { error } = await sb.rpc('delete_my_account_data');
    if (error) throw error;

    trackEvent('account_delete', { had_profile: !!playerName, best_score: best || 0 }, { urgent: true });
    await flushAnalyticsQueue(true);

    await sb.auth.signOut();

    removeLocal(servicesAppStorageKeys.save || 'orbita_save');
    setCachedProfileName('');
    removeLocal(ANALYTICS_QUEUE_KEY);
    clearCachedPlayerMlProfile();
    clearActiveRunSession();
    removeSession(RUN_SESSION_KEY);

    currentUser = null;
    playerName = '';
    needsNickname = false;
    authLoading = false;
    best = 0;
    totalGames = 0;
    totalScoreEver = 0;
    totalNodesEver = 0;
    bestComboEver = 0;
    highestPhase = 1;
    totalGoldCaptured = 0;
    achievements = [];
    unlockedSkins = ['default'];
    unlockedBgs = ['space'];
    zenUnlocked = false;
    selectedSkin = 'default';
    selectedBg = 'space';
    rankings = [];
    userPosition = -1;
    rankingsError = '';
    lastSubmittedScore = 0;
    menuScreen = 'login';

    return true;
  } catch (e) {
    console.error('Delete account failed', e);
    return false;
  }
}

function resetLocalProgress() {
  removeLocal(servicesAppStorageKeys.save || 'orbita_save');
  best = 0;
  totalGames = 0;
  totalScoreEver = 0;
  totalNodesEver = 0;
  bestComboEver = 0;
  highestPhase = 1;
  totalGoldCaptured = 0;
  achievements = [];
  unlockedSkins = ['default'];
  unlockedBgs = ['space'];
  zenUnlocked = false;
  selectedSkin = 'default';
  selectedBg = 'space';
  saveData();
}

async function changeNickname(newName) {
  const result = await setNicknameViaRpc(newName);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

if (sb) {
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      adoptCachedPlayerMlProfileForCurrentUser();
      const cachedName = getCachedProfileName();
      if (cachedName) {
        playerName = cachedName;
        needsNickname = false;
      }
      menuScreen = 'main';
      loadProfile().then(() => {
        menuScreen = (playerName && !needsNickname) ? 'main' : 'nickname';
      }).catch(e => console.warn('[Orbita] loadProfile chain failed', e));
      trackEvent('auth_signed_in', { has_nickname: !!playerName });
      scheduleAnalyticsFlush(400);
      flushPendingScoreSubmission().catch(e => console.warn('[Orbita] flushPendingScoreSubmission failed', e));
      refreshPlayerMlProfile(14, { maxAgeMinutes: 20 }).catch(e => console.warn('[Orbita] refreshPlayerMlProfile failed', e));
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      playerName = '';
      setCachedProfileName('');
      clearCachedPlayerMlProfile();
      needsNickname = false;
      clearActiveRunSession();
      menuScreen = 'login';
      trackEvent('auth_signed_out', {});
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth, { once: true });
} else {
  initAuth();
}



window.addEventListener('online', () => {
  setNetworkOnlineStatus(true);
  scheduleAnalyticsFlush(250);
  flushPendingScoreSubmission();
  if (currentUser) refreshPlayerMlProfile(14, { maxAgeMinutes: 10 });
  if (menuScreen === 'ranking') loadRankings();
});

window.addEventListener('offline', () => {
  setNetworkOnlineStatus(false);
  if (menuScreen === 'ranking') rankingsError = 'Sem internet';
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    flushAnalyticsQueue(true);
  } else {
    if (analyticsQueue.length) scheduleAnalyticsFlush(500);
    flushPendingScoreSubmission();
  }
});

function onAppTeardown() {
  if (analyticsFlushTimer) {
    clearTimeout(analyticsFlushTimer);
    analyticsFlushTimer = null;
  }
  persistAnalyticsQueue();
  persistPendingScoreSubmission();
  persistRunSession();
}

window.addEventListener('beforeunload', onAppTeardown);
window.addEventListener('pagehide', onAppTeardown);

if (servicesAppServiceRegistry && typeof servicesAppServiceRegistry.register === 'function') {
  servicesAppServiceRegistry.register('initSupabase', initSupabase);
  servicesAppServiceRegistry.register('initAuth', initAuth);
  servicesAppServiceRegistry.register('trackEvent', trackEvent);
  servicesAppServiceRegistry.register('flushAnalyticsQueue', flushAnalyticsQueue);
  servicesAppServiceRegistry.register('loadRankings', loadRankings);
  servicesAppServiceRegistry.register('getPlayerMlProfile', getPlayerMlProfile);
  servicesAppServiceRegistry.register('refreshPlayerMlProfile', refreshPlayerMlProfile);
  servicesAppServiceRegistry.register('getCachedPlayerMlProfile', getCachedPlayerMlProfile);
  servicesAppServiceRegistry.register('submitScore', submitScore);
  servicesAppServiceRegistry.register('saveNickname', saveNickname);
  servicesAppServiceRegistry.register('changeNickname', changeNickname);
  servicesAppServiceRegistry.register('resetLocalProgress', resetLocalProgress);
  servicesAppServiceRegistry.register('deleteAccount', deleteAccount);
}
