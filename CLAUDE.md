# Last Orbit (codename: orbita) — Contexto do projeto pra Claude

> Este arquivo é lido automaticamente pelo Claude Code em qualquer nova sessão neste diretório.
> Atualize quando o projeto mudar significativamente.

---

## TL;DR

**Last Orbit** é um jogo arcade web (Canvas 2D) inspirado em Flappy Bird, mas com uma mecânica de **bola orbitando nós** que o jogador "solta" no momento certo pra capturar o próximo nó. Hyper-casual, one-button. Distribuído como **PWA** que será wrappado em **AAB pra Play Store**.

> **Nota de branding (2026-04):** O nome de marca mudou de "Órbita" (PT-BR) pra "Last Orbit" (global). O codename interno permanece `orbita` em **todas** as referências técnicas (`orbita_*` no localStorage, `_AC_SALT='orb1ta_…'`, `CACHE_NAME='orbita-pwa-…'`, `OrbitaI18n`, `[Orbita]` em logs, `tags: { game: 'orbita' }` no Sentry, `release: 'orbita@…'`). **Não renomear codename** — quebraria saves de testers e invalidaria sigs anti-cheat existentes.

Owner: Galileu (galileuneto146@gmail.com)
Idiomas: PT-BR (default), EN, ES (auto-detect via `navigator.language`)

---

## Arquitetura

### Stack
- **Frontend puro JS/HTML/Canvas** — sem build tool, sem framework
- **Backend:** Supabase (Postgres + RLS + RPCs)
- **Storage:** localStorage (anon_id, save data, configs)
- **PWA:** service worker com precache, install prompt
- **Crash reporting:** Sentry browser SDK (precisa colar DSN)

### Carga de scripts (ordem em `index.html`)

1. `https://browser.sentry-cdn.com/.../bundle.min.js` (CDN)
2. `js/sentry_init.js` — Sentry init com DSN placeholder
3. `https://cdn.jsdelivr.net/.../supabase-js@2.45.0/...` (CDN)
4. `js/app_bootstrap.js` — fachada `window.App`
5. `js/core.js` — canvas, audio, helpers, estado global, ST enum
6. `js/services.js` — Supabase, auth, trackEvent, currentUser
7. `js/pwa.js` — service worker registration
8. `js/data.js` — save/load + SKINS/BACKGROUNDS constants (alguns ainda referenciados, mantidos)
9. `js/game.js` — gameplay (reset, capture, die, update, handleTap)
10. `js/render.js` — draw principal e composição visual
11. `js/gameplay_ui.js` — drawPauseScreenModule, drawActionBtnModule (drawPlayUI/drawDeadUI sobrescritos pelo patch)
12. `js/i18n.js` — sistema de tradução (PT/EN/ES)
13. `js/flappy_radical_patch.js` — **TODOS os comportamentos Flappy-style customizados**
14. `js/main.js` — game loop

### Arquivo central: `js/flappy_radical_patch.js`

Tudo de novo (~3000+ linhas) está aqui. Padrão: **monkey-patching com fallback**. Wrappa funções globais existentes (`reset`, `capture`, `die`, `startRun`, `update`, `placeBranch`, `getPhase`, `getOrbitSpeed`, etc.) usando hooks oficiais (`registerOrbitaGameplayHook`) ou substituição direta de `window.X`.

Seções principais (em ordem no arquivo):
1. Constants/state (SPEED_MULTIPLIER, MEGA_BONUS_CHANCE, _AC_SALT)
2. Hide splash (after 2 RAF + 150ms)
3. Android back button handler (popstate + history.pushState)
4. Sentry breadcrumbs
5. i18n helpers (`_t`, `_lang`, `_cycleLang`)
6. addScorePopup wrap (translates "OURO!" → gold_popup, "COMBO N!" → combo_popup)
7. drawPauseScreenModule override (com `_t()`)
8. getPhase override (onboarding ramp 1→3→5→6)
9. adjustOrbitSpeed hook (speed taming past score 100)
10. Background tier system (5 paletas: navy → violeta → teal → indigo → dourado)
11. Asteroid drawing wrap (adiciona stroke de contraste)
12. Analytics (anon_id, session_start, game_end)
13. ANTI-CHEAT (FNV-1a save signature, runtime score validation, event signature)
14. Save signature validation on load
15. Onboarding helper + tap hint state
16. Color blind mode (markers brancos por tier)
17. Debug mode (testMode toggleável)
18. placeBranch wrap (clampPosition, isPositionValid, dynamic mechanics, sibling tracking)
19. buildSpawnBranches hook (4-node fan POST-onboarding, no asteroids)
20. Update wrap (cleanup agressivo de capturados)
21. die() wrap (anti-cheat clamp, near-miss snapshot, analytics fire)
22. startRun wrap (debug forces testMode, reset state)
23. capture() wrap (mega bonus, lucky bonus, _captureCount, _expectedScore)
24. release() wrap (clears tap hint)
25. drawMenuUI override (custom menu com 5 botões: debug, lang, colorblind, mute + tap-anywhere)
26. drawPlayUIModule override (score gigante + badges + onboarding hint)
27. drawDeadUIModule override (medal, progress bar, stats, streak, near-miss visual, contextual phrase)

---

## Decisões de design já feitas

### Filosofia geral
- **One-button gameplay** mantido
- **Brutal desde o cano 1** (phase 6 always após onboarding)
- **Reinício instantâneo** (180ms após morte)
- **No menus, no ranking, no skins, no career** — removidos
- **Anti-cheat client-side** com FNV-1a hash + salt
- **Difficulty 100% skill-based, 0% RNG sujo** — ASTEROIDES FORAM REMOVIDOS

### Mecânicas ativas
- **4-node fan layout** post-onboarding (verde LL, vermelho UL, dourado top, azul R)
- **Onboarding ramp:** game 1 = phase 1 (2 nós), game 2 = phase 3 (3 nós), game 3 = phase 5, game 4+ = phase 6 brutal
- **Speed multiplier:** 1.5x normal, mas com curva customizada que reduz crescimento past score 100
- **Capture radius do verde** apertado em -16 (era 62, agora ~46)
- **Movimento/desaparecimento** randômico em todos os tiers (não só hard)
- **Mega Bonus 4%** + **Lucky 11%** em qualquer captura (variable ratio)
- **Near-miss visual** na morte se raspou num nó

### Psicologia (Flappy Bird-style)
- Reforço de razão variável (mega bonus + lucky)
- Near-miss effect (anel pulsante + texto "QUASE!")
- Estado de fluxo (HUD minimal, sem distração)
- Condicionamento operante (flash + shake + vibração + som ascendente)
- Frases contextuais por tipo de morte (9 buckets em 3 idiomas)

### Visual
- **Splash screen** ANTES de tudo carregar (CSS-only, fade out via JS)
- **Background progressivo:** 5 paletas que evoluem com score (navy → violeta → teal → indigo → dourado)
- **Color blind mode** com marcadores brancos por tier
- **Adaptive title** com gradiente + glow + letter-spacing
- **Demo orbit** animado no menu inicial

---

## Constantes-chave (ajustáveis)

Todas no topo de `js/flappy_radical_patch.js`:

```js
const SPEED_MULTIPLIER = 1.50;       // 1.30 fácil, 1.50 muito difícil, 1.75 brutal, 1.85+ impossível
const MEGA_BONUS_CHANCE = 0.04;       // 4% de jogadas com x5 pontos
const LUCKY_CHANCE = 0.11;            // 11% de jogadas com x2 pontos
const NEAR_MISS_MAX_OVERSHOOT = 0.7;  // fração do captureR pra disparar visual de "QUASE!"
const _AC_SALT = 'orb1ta_p4tch_2026_kY9_xL4z'; // SALT do anti-cheat (sincronizar com SQL)
```

E em `js/i18n.js`:
- `_LANG_PACKS` (PT/EN/ES) — todas strings de UI
- `_PHRASE_BUCKETS` por idioma (9 buckets contextuais + 500 frases extras cada)

---

## Arquivos importantes

### Frontend
- [js/flappy_radical_patch.js](js/flappy_radical_patch.js) — TUDO de comportamento custom
- [js/i18n.js](js/i18n.js) — packs PT/EN/ES
- [js/sentry_init.js](js/sentry_init.js) — Sentry com DSN placeholder
- [js/game.js](js/game.js) — gameplay base (não mexer muito, wrappar via patch)
- [js/render.js](js/render.js) — render base (drawNode, drawAsteroid, etc.)
- [index.html](index.html) — CSP atualizada pra Sentry + Supabase
- [sw.js](sw.js) — service worker, cache **v91** atual
- [privacy-policy.html](privacy-policy.html) — bilíngue (PT+EN), Play Store compliant

### Backend (Supabase)
- [sql/04_analytics_events_and_views.sql](sql/04_analytics_events_and_views.sql) — RPC `log_analytics_events`, view `analytics_run_end_v1`
- [sql/07_anti_cheat_signature.sql](sql/07_anti_cheat_signature.sql) — `fnv1a_b36()`, `validate_game_end_sig()`, trigger BEFORE INSERT, views `cheats_detected_v1` e `cheats_by_anon_id_v1`

### Tools
- [tools/assets-generator.html](tools/assets-generator.html) — gera 9 assets (icons, feature graphic, screenshots) via canvas em runtime

### Removidos (intencionalmente, NÃO RECRIAR)
- `js/competitive_ranking_ui.js`, `ranking_hardening_phase2.js` (ranking removido)
- `js/career_meta_patch.js`, `meta_progress_ui.js` (carreira/missões)
- `js/tutorial_hybrid_assist_patch.js` (tutorial híbrido)
- `js/run_variety_patch.js`, `fairness_rng_patch.js` (mutators/balancing)
- `js/ux_secondary_polish_patch.js`, `analytics_actionable_patch.js` (UI secundária/analytics extra)
- `js/debug_tools.js`, `meta_progress_ui.js`, `settings_account_ui.js`, `menu_shell_ui.js`

---

## Roadmap pra Play Store

### ✅ Já feito
- Privacy policy v2 bilíngue (`privacy-policy.html`)
- Splash screen com failsafe 8s
- Sentry crash reporting (precisa DSN real)
- Botão Android back (PLAY→PAUSE→MENU→exit)
- Renomeação JACKPOT → MEGA BÔNUS (gambling-safe)
- Color-blind mode
- Tradução PT/EN/ES com botão toggle
- Anti-cheat 3 camadas + SQL trigger
- Splash + i18n + adaptive bg
- Asset generator (`tools/assets-generator.html`)

### ❌ Pendente do USUÁRIO (não-código)
1. **Criar conta Google Play Developer** ($25 one-time)
2. **Hospedar PWA em domínio HTTPS** (Netlify/Vercel/CF Pages — grátis)
3. **PWABuilder** pra gerar AAB do PWA hospedado
4. **Trocar `contato@orbita.app`** no privacy policy pelo email real
5. **Criar conta Sentry** + colar DSN em `js/sentry_init.js` linha 30
6. **Baixar assets** do `tools/assets-generator.html`
7. **Capturar screenshots reais** do jogo via DevTools device emulation
8. **Preencher Data Safety form** no Play Console (letra G — pendente, eu posso gerar texto)
9. **Descrições título/curta/longa** pra Play Store

### 📋 Ainda no escopo de código (se ele pedir)
- Letra G — Data Safety form (texto pronto)
- Slider de volume música/SFX separados
- Modo "diário" (seed fixa)
- Achievements visuais
- Música de fundo melhor
- Mover salt do anti-cheat pro server (TODO documentado em sql/07)

---

## Convenções importantes

### Cache versioning
Toda mudança no código frontend → bumpar `CACHE_NAME` em `sw.js`. Atualmente: **`orbita-pwa-v91`**.

### Salt sincronizado
O salt `'orb1ta_p4tch_2026_kY9_xL4z'` está em **dois lugares**:
- `js/flappy_radical_patch.js` const `_AC_SALT`
- `sql/07_anti_cheat_signature.sql` `validate_game_end_sig` → `salt constant text`

**Mudou um → mudar o outro**, senão sigs ficam inválidas.

### Padrão de modificação
1. **Não mexer em `js/game.js`, `js/render.js`, `js/core.js` direto** — wrappar via `flappy_radical_patch.js`
2. Usar hooks oficiais quando existem (`registerOrbitaGameplayHook`)
3. Caso contrário, monkey-patch `window.X = function(){...}`
4. Sempre com `try/catch` defensivo + fallback PT-BR
5. Bumpar `sw.js` cache version quando publicar

### i18n
Toda string visível ao usuário deve passar por `_t('chave')`. Strings hardcoded em `game.js` que aparecem como popup (`OURO!`, `COMBO N!`) são interceptadas pelo wrapper de `addScorePopup` em runtime.

### Anti-cheat
- Save: `_signSave(data)` adiciona `_sig` em todo `saveData`. Validate em load — se inválido, reseta `best/totalScoreEver/...` pra 0.
- Runtime: `_expectedScore` track via wrappers de capture. Em `die()`, se `score > _expectedScore + 1` → clampa.
- Events: `game_end` payload assinado com `_sig` (mesmo algoritmo).
- Server: trigger SQL valida `_sig` e marca `_sig_invalid: true` se forjado.

---

## Comandos úteis

```bash
# Servir local
cd C:/Users/galil/OneDrive/Desktop/Orbita_simples && python -m http.server 8000

# Abrir no navegador
http://localhost:8000

# Asset generator
http://localhost:8000/tools/assets-generator.html

# Privacy policy
http://localhost:8000/privacy-policy.html
```

### Reset de save (testar onboarding)
DevTools → Application → Local Storage → http://localhost:8000 → apagar `orbita_save` (e `orbita_anon_id`, `orbita_first_seen`, etc se quiser começar 100% zerado).

### Debug mode
Tap no 🧪 no canto superior esquerdo do menu inicial. Toggle persiste. Quando ativo, jogador não morre — `die()` redireciona pra `restoreBallToOrbit`.

### Ativar testes de cheat
Console: `score = 99999` durante uma run, depois deixa morrer. Anti-cheat clampa pra `_expectedScore` e marca `_cheatFlagged: true` no event `game_end`.

---

## Quirks conhecidos

1. **`history.pushState` quirk:** O back-button handler push'a guard inicial. Em browser puro a 2ª back não fecha (fica em [page]), em PWA wrapped fecha. Aceitável.
2. **Splash failsafe 8s:** Se JS travar, o splash some via CSS animation `splash-failsafe`.
3. **Service worker pode prender cache antigo:** sempre Ctrl+Shift+R ou desregistrar SW pra desenvolver.
4. **`history.pushState` race com main.js loop:** OK porque `_setupBackHandler()` roda em `DOMContentLoaded`.
5. **Sentry SDK sem `integrity` attribute:** TODO de segurança documentado em `sentry_init.js`.

---

## Como continuar

Em qualquer nova conversa, use isso como ponto de partida. Pra retomar onde parou, perguntas úteis pro user:
- "Quer continuar a letra G (Data Safety form) ou outra coisa?"
- "Já hospedou em HTTPS / criou conta no Play / colou DSN do Sentry?"
- "Vamos publicar o app ou ainda tem algo no jogo a ajustar?"

O usuário historicamente prefere:
- Respostas em PT-BR
- Soluções diretas, sem perguntar muito
- Mostrar dificuldade da realidade (chance de sucesso, custo, etc.)
- Implementar primeiro, polir depois
