// SW registration inline-equivalent.
// Tem que estar em arquivo separado (CSP nao permite inline scripts).
// Pra que serve: scanners como PWABuilder e Lighthouse detectam SW
// procurando por "navigator.serviceWorker.register(" no JS carregado pelo HTML.
// A registracao "real" (com tracking de eventos analytics) eh feita em js/pwa.js.
(function(){
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('./sw.js').catch(function(){});
    });
  }
})();
