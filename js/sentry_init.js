// ============================================================
// SENTRY CRASH REPORTING
// ============================================================
// Sentry captura erros JavaScript em producao automaticamente.
// Sem isso, voce nao sabe por que usuarios estao crashando o app.
//
// COMO ATIVAR (5 minutos):
//   1. Cria conta gratuita em https://sentry.io
//   2. Cria projeto novo, escolhe "Browser JavaScript"
//   3. Copia o DSN exibido (formato:
//      https://abc123@o456789.ingest.us.sentry.io/1234567)
//   4. Substitui SENTRY_DSN abaixo pelo seu DSN real
//   5. Republica o app
//
// TIER FREE: 5k erros/mes, 1 usuario, 30 dias retencao.
// Suficiente pra um app indie no lancamento.
//
// PRIVACIDADE: este init NAO envia PII (sem nome/email).
// Anexa apenas o anon_id local pra agrupar erros do mesmo
// dispositivo. URLs sao truncadas pra remover query strings.
// ============================================================
(function(){
  'use strict';

  // === SUBSTITUA AQUI PELO SEU DSN REAL ===
  const SENTRY_DSN = 'https://YOUR_KEY@oYOUR_ORG.ingest.us.sentry.io/YOUR_PROJECT';
  // ========================================

  // Pula init se DSN nao foi configurado (mantem o jogo funcionando)
  if (!SENTRY_DSN || SENTRY_DSN.indexOf('YOUR_KEY') !== -1) {
    if (typeof console !== 'undefined' && console.info) {
      console.info('[orbita] Sentry desativado. Configure DSN em js/sentry_init.js pra ativar.');
    }
    return;
  }

  if (typeof Sentry === 'undefined' || !Sentry.init) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[orbita] Sentry SDK nao carregou. Verifique CSP e CDN.');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,

      // Marque a versao do build pra agrupar erros por release
      release: 'orbita@1.0.0',

      // Ambiente: dev em localhost, prod em outros hosts
      environment: (typeof location !== 'undefined' && location.hostname === 'localhost')
        ? 'development'
        : 'production',

      // ---- AMOSTRAGEM (custa eventos do tier) ----
      // Sem performance monitoring (custa tracesSampleRate eventos extra)
      tracesSampleRate: 0.0,
      // Sem session replay (privacidade + custo)
      replaysSessionSampleRate: 0.0,
      replaysOnErrorSampleRate: 0.0,

      // ---- PRIVACIDADE ----
      sendDefaultPii: false,
      attachStacktrace: true,

      // Ignora erros conhecidos que sao no-op ou fora do nosso controle
      ignoreErrors: [
        // ResizeObserver loop (espalha em chrome, irrelevante)
        /ResizeObserver loop limit exceeded/i,
        /ResizeObserver loop completed/i,
        // Erros de rede do usuario
        /Network request failed/i,
        /Failed to fetch/i,
        /NetworkError when attempting/i,
        /Load failed/i,
        // AudioContext em mobile sem interacao
        /The AudioContext was not allowed to start/i,
        // Service worker registrations em incognito
        /Failed to register a ServiceWorker/i,
        // Extensoes do navegador
        /chrome-extension:\/\//i,
        /moz-extension:\/\//i,
      ],
      denyUrls: [
        // Extensoes
        /chrome-extension:\/\//i,
        /moz-extension:\/\//i,
        /safari-extension:\/\//i,
      ],

      // Sanitiza eventos antes de enviar
      beforeSend: function(event) {
        try {
          // Trunca URL pra remover query strings sensiveis
          if (event.request && event.request.url) {
            try {
              const u = new URL(event.request.url);
              event.request.url = u.origin + u.pathname;
            } catch(e) {}
          }
          // Remove cookies e headers de auth
          if (event.request) {
            delete event.request.cookies;
            if (event.request.headers) {
              delete event.request.headers.Authorization;
              delete event.request.headers.Cookie;
              delete event.request.headers['x-anonymous-id'];
            }
          }
          // Limpa breadcrumbs com query strings
          if (Array.isArray(event.breadcrumbs)) {
            for (const bc of event.breadcrumbs) {
              if (bc && bc.data && bc.data.url) {
                try {
                  const u = new URL(bc.data.url);
                  bc.data.url = u.origin + u.pathname;
                } catch(e) {}
              }
            }
          }
        } catch(e) {}
        return event;
      },

      // Tags fixas pra todos os eventos
      initialScope: {
        tags: {
          game: 'orbita',
          platform: (function(){
            const ua = (navigator && navigator.userAgent) || '';
            if (/Android/i.test(ua)) return 'android';
            if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
            return 'web';
          })()
        }
      }
    });

    // Anexa anon_id como user.id pra agrupar erros do mesmo dispositivo
    // (sem PII - eh um UUID local gerado pelo proprio app)
    try {
      const anonId = localStorage.getItem('orbita_anon_id');
      if (anonId && Sentry.setUser) {
        Sentry.setUser({ id: anonId });
      }
    } catch(e) {}

    if (typeof console !== 'undefined' && console.info) {
      console.info('[orbita] Sentry crash reporting ativo.');
    }
  } catch(e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[orbita] Erro ao inicializar Sentry:', e);
    }
  }
})();
