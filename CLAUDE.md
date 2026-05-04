# Last Orbit (codename: orbita) — Contexto do projeto pra Claude

> Este arquivo é lido automaticamente pelo Claude Code em qualquer nova sessão neste diretório.
> Atualize quando o projeto mudar significativamente.
>
> **Para retomar de onde parou na última sessão**, leia também `NEXT_SESSION.md`.

---

## TL;DR

**Last Orbit** é um jogo arcade web (Canvas 2D) inspirado em Flappy Bird, mas com uma mecânica de **bola orbitando nós** que o jogador "solta" no momento certo pra capturar o próximo nó. Hyper-casual, one-button. Distribuído como **PWA** (já hospedado) e **AAB instalável via Play Store** (na track de **Teste Interno** desde 2026-05-04).

**URL prod ativa**: `https://lastorbit-app.pages.dev` (Cloudflare Pages, deploy via wrangler CLI)
**Track Play Store (Internal)**: `https://play.google.com/apps/internaltest/4701254592733948037`
**Cache atual**: `orbita-pwa-v123` em `sw.js`

> **Nota de branding (2026-04):** O nome de marca mudou de "Órbita" (PT-BR) pra "Last Orbit" (global). O codename interno permanece `orbita` em **todas** as referências técnicas (`orbita_*` no localStorage, `_AC_SALT='orb1ta_…'`, `CACHE_NAME='orbita-pwa-…'`, `OrbitaI18n`, `[Orbita]` em logs, `tags: { game: 'orbita' }` no Sentry, `release: 'orbita@…'`). **Não renomear codename** — quebraria saves de testers e invalidaria sigs anti-cheat existentes.

Owner: Galileu (galileuneto146@gmail.com)
**E-mail de suporte público (na ficha da loja + privacy policy)**: `lastorbit.contato@gmail.com`
Idiomas: PT-BR (default), EN, ES (auto-detect via `navigator.language`)
Package Android (imutável após Play): `app.lastorbit.game`

---

## Arquitetura

### Stack
- **Frontend puro JS/HTML/Canvas** — sem build tool, sem framework
- **Backend:** Supabase (Postgres + RLS + RPCs) — projeto `poedjpfrwpdsdjjjduow`
- **Storage:** localStorage (anon_id, save data, configs)
- **PWA:** service worker com precache, install prompt
- **Hosting:** Cloudflare Pages (`lastorbit-app` no account `5b03bc3937e92ca4335020fed973a03a`)
- **Crash reporting:** Sentry browser SDK (DSN ainda placeholder em `sentry_init.js:26`)
- **Mobile distribution:** TWA wrapper via PWABuilder, AAB já gerado

### Carga de scripts (ordem em `index.html`)

1. `https://browser.sentry-cdn.com/.../bundle.min.js` (CDN, com SRI hash)
2. `js/sw_register_inline.js` — registra SW visível pra scanners (PWABuilder/Lighthouse)
3. `js/sentry_init.js` — Sentry init com DSN placeholder
4. `https://cdn.jsdelivr.net/.../supabase-js@2.45.0/...` (CDN, com SRI hash)
5. `js/app_bootstrap.js` — fachada `window.App` + **silenceConsoleInProd** (em prod silencia console.log/info/debug)
6. `js/core.js` — canvas, audio (com 2 perfis menu/play, master limiter, fade-in, listeners globais), helpers, estado global, ST enum
7. `js/services.js` — Supabase, auth, trackEvent, currentUser
8. `js/pwa.js` — service worker registration "real" com tracking de eventos
9. `js/data.js` — save/load + SKINS/BACKGROUNDS constants
10. `js/game.js` — gameplay (reset, capture, die, update, handleTap)
11. `js/render.js` — draw principal e composição visual
12. `js/gameplay_ui.js` — drawPauseScreenModule, drawActionBtnModule
13. `js/i18n.js` — sistema de tradução (PT/EN/ES)
14. `js/audio_panel.js` — modal HTML com sliders música/SFX/mute (`window.OrbitaAudioPanel.open()`)
15. `js/flappy_radical_patch.js` — **TODOS os comportamentos Flappy-style customizados**
16. `js/main.js` — game loop

### Arquivo central: `js/flappy_radical_patch.js`

~3000+ linhas. Padrão: **monkey-patching com fallback**. Wrappa funções globais existentes usando hooks oficiais (`registerOrbitaGameplayHook`) ou substituição direta de `window.X`.

Seções principais (em ordem no arquivo):
1. Constants/state (SPEED_MULTIPLIER, MEGA_BONUS_CHANCE, _AC_SALT)
2. Splash tap-to-start (espera tap pra inicializar áudio + esconder)
3. Android back button handler (popstate + history.pushState)
4. Sentry breadcrumbs
5. i18n helpers (`_t`, `_lang`, `_cycleLang`)
6. addScorePopup wrap (translates "OURO!" → gold_popup, "COMBO N!" → combo_popup)
7. drawPauseScreenModule override (com `_t()`)
8. getPhase override (onboarding ramp 1→3→5→6)
9. adjustOrbitSpeed hook (speed taming past score 100)
10. Background tier system (5 paletas: navy → violeta → teal → indigo → dourado)
11. Asteroid drawing wrap (legacy, asteroids removidos do gameplay)
12. Analytics (anon_id, session_start, game_end com bot detection)
13. ANTI-CHEAT (FNV-1a save signature, runtime score validation, event signature, **bot detection com 7 heurísticas**)
14. Save signature validation on load
15. Onboarding helper + tap hint state
16. Color blind mode (markers brancos por tier)
17. Debug mode (testMode toggleável) — **bloqueado em prod via `_IS_PROD` em 5 camadas**
18. placeBranch wrap (clampPosition, isPositionValid, dynamic mechanics, sibling tracking)
19. buildSpawnBranches hook (4-node fan POST-onboarding, no asteroids)
20. Update wrap (cleanup agressivo de capturados)
21. die() wrap (anti-cheat clamp, near-miss snapshot, analytics fire)
22. startRun wrap (debug forces testMode, reset state)
23. capture() wrap (mega bonus, lucky bonus, _captureCount, _expectedScore)
24. release() wrap (clears tap hint)
25. drawMenuUI override (custom menu — speaker btn agora abre `OrbitaAudioPanel.open()`)
26. drawPlayUIModule override (score gigante + badges + onboarding hint)
27. drawDeadUIModule override (medal, progress bar, stats, streak, near-miss visual, contextual phrase)

---

## Decisões de design já feitas

### Filosofia geral
- **One-button gameplay** mantido
- **Brutal desde o cano 1** (phase 6 always após onboarding)
- **Reinício instantâneo** (180ms após morte)
- **No menus, no ranking, no skins, no career** — removidos
- **Anti-cheat client-side + bot detection + cap server-side** (Tier 1 aplicado)
- **Difficulty 100% skill-based, 0% RNG sujo** — ASTEROIDES FORAM REMOVIDOS

### Mecânicas ativas
- **4-node fan layout** post-onboarding (verde LL, vermelho UL, dourado top, azul R)
- **Onboarding ramp:** game 1 = phase 1 (2 nós), game 2 = phase 3 (3 nós), game 3 = phase 5, game 4+ = phase 6 brutal
- **Speed multiplier:** 1.5x normal, mas com curva customizada que reduz crescimento past score 100
- **Capture radius do verde** apertado em -16 (era 62, agora ~46)
- **Movimento/desaparecimento** randômico em todos os tiers (não só hard)
- **Mega Bonus 4%** + **Lucky 11%** em qualquer captura (variable ratio)
- **Near-miss visual** na morte se raspou num nó

### Áudio (refinado em 2026-05)
- **2 perfis distintos** menu vs gameplay:
  - **Menu**: chill etéreo (Am→Em→F→C, 8s/acorde, lowpass 4500Hz, sub sutil, shimmer alto)
  - **Gameplay**: tense denso (Am→F→C→G, 5s/acorde, lowpass 1800Hz, sub forte, layers detuned 14)
- **Master limiter** brick-wall (-3dBFS, ratio 20:1) protege contra clipping
- **Fade-in 3.5s** no startup (entrada cinematográfica)
- **Volume mínimo 0.45** forçado em MENU/DEAD pra não ficar mudo após transição
- **Random pitch ±50 cents** em SFX (anti-fadiga auditiva)
- **AudioContext init em qualquer gesture** (listeners globais em `core.js`)
- **Painel de volume HTML** (`OrbitaAudioPanel.open()`) acessível pelo speaker icon — sliders Música/SFX + mute toggle + botão "OK" + toast "✓ Salvo"
- **API window.OrbitaAudio** (em `core.js`) com setters reais (`setMusic`, `setSfx`, `toggleMute`, `setMuted`, `isMuted`, `getMusic`, `getSfx`) — necessária porque `let menuMusicVol/sfxVol` são script-scoped (não acessíveis via `window.X = v`)
- **Eleva sceneLevel pra 0.9 ao abrir painel** se música está ducked (PAUSE/DEAD), restaura ao fechar — pra slider ser audível em qualquer estado
- **AudioContext suspende ao minimizar** (handler `visibilitychange` em `core.js`) — música para de tocar quando app vai pro background

### Splash tap-to-start
- Splash NÃO some automaticamente; espera o user tocar
- Texto "TOQUE PARA INICIAR" **direto no HTML** (não dependente de JS) — i18n via JS swap pra EN/ES quando carrega
- Listener **capture-phase no canvas** (em `flappy_radical_patch.js`) bloqueia pointerdown/touchstart/touchend/click/mousedown enquanto splash está no DOM, evitando que click sintético do Android WebView vaze pro `handleTap` e dispare `startRun`
- `_splashAlive` flag + delay 50ms antes de adicionar `.hidden` — splash absorve click sintético até remoção do DOM
- Failsafe 30s: se ninguém tocar, esconde mesmo assim
- CSS auto-fade animation foi REMOVIDA (deixava splash invisível mas com pointer-events ativos → tap fantasma)

### Reabertura do app (background → foreground)
- Handler `visibilitychange` em `core.js` (linhas 20-30):
  - **Hidden**: `actx.suspend()` — música/SFX param
  - **Visible**: `actx.resume()` + força `resize()` (com retries em 80ms e 300ms) pra canvas re-medir viewport (Chrome Custom Tabs / TWA às vezes não dispara `resize` no return do background)
- Handler `pageshow` faz resize adicional pra cobrir back-forward cache

### Psicologia (Flappy Bird-style)
- Reforço de razão variável (mega bonus + lucky)
- Near-miss effect (anel pulsante + texto "QUASE!")
- Estado de fluxo (HUD minimal, sem distração)
- Condicionamento operante (flash + shake + vibração + som ascendente)
- Frases contextuais por tipo de morte (9 buckets em 3 idiomas)

### Visual
- **Splash CSS-only** com logotype "LAST" pequeno + "ORBIT" gigante (2 linhas), bola orbitando, gradiente ciano
- **Background progressivo:** 5 paletas que evoluem com score (navy → violeta → teal → indigo → dourado)
- **Color blind mode** com marcadores brancos por tier
- **Adaptive title** com gradiente + glow + letter-spacing
- **Demo orbit** animado no menu inicial
- **Ícone do app**: lua sorridente com glow ciano (gerado via `tools/icon-generator.html`)

---

## Constantes-chave (ajustáveis)

Todas no topo de `js/flappy_radical_patch.js`:

```js
const SPEED_MULTIPLIER = 1.50;       // 1.30 fácil, 1.50 muito difícil, 1.75 brutal, 1.85+ impossível
const MEGA_BONUS_CHANCE = 0.04;       // 4% de jogadas com x5 pontos
const LUCKY_CHANCE = 0.11;            // 11% de jogadas com x2 pontos
const NEAR_MISS_MAX_OVERSHOOT = 0.7;  // fração do captureR pra disparar visual de "QUASE!"
const _AC_SALT = 'orb1ta_p4tch_2026_kY9_xL4z'; // salt anti-cheat client (já é "teatro")
```

E em `js/i18n.js`:
- `_LANG_PACKS` (PT/EN/ES) — todas strings de UI
- `_PHRASE_BUCKETS` por idioma (9 buckets contextuais + 500 frases extras cada)

E em `js/core.js`:
- `MUSIC_BASE_GAIN = 0.88`, `SFX_BASE_GAIN = 0.74`
- `musicSceneLevel = 0.40` (default; `setMusicVolume(v)` ajusta em runtime)
- `profileMenu` / `profilePlay` (timbre/lowpass/detune por modo)
- `chordsMenu` / `chordsPlay` (progressões diferentes)

---

## Arquivos importantes

### Frontend
- [js/flappy_radical_patch.js](js/flappy_radical_patch.js) — TUDO de comportamento custom
- [js/audio_panel.js](js/audio_panel.js) — modal HTML do painel de volume
- [js/sw_register_inline.js](js/sw_register_inline.js) — SW register pra scanners (PWABuilder)
- [js/i18n.js](js/i18n.js) — packs PT/EN/ES
- [js/sentry_init.js](js/sentry_init.js) — Sentry com DSN placeholder
- [js/game.js](js/game.js) — gameplay base (não mexer muito, wrappar via patch)
- [js/render.js](js/render.js) — render base (drawNode, drawAsteroid, etc.)
- [index.html](index.html) — CSP estrita (sem unsafe-inline) + splash CSS + audio panel HTML
- [sw.js](sw.js) — service worker, cache **`orbita-pwa-v109`** atual
- [_headers](_headers) — Cloudflare Pages headers (HSTS, CSP frame-ancestors, Cache-Control diferenciado)
- [privacy-policy.html](privacy-policy.html) — bilíngue (PT+EN), Play Store compliant
- [manifest.webmanifest](manifest.webmanifest) — 20 campos preenchidos (incluindo screenshots, shortcuts, display_override)

### Backend (Supabase) — RLS apertado, escrita só via RPC
- [sql/01_profiles_rankings_account.sql](sql/01_profiles_rankings_account.sql) — profiles, rankings, set_nickname
- [sql/02_run_sessions.sql](sql/02_run_sessions.sql) — start_run_session
- [sql/03_secure_run_progress_and_score_submission.sql](sql/03_secure_run_progress_and_score_submission.sql) — submit_score_secure (cap 5000, 10pt/seg, checkpoints)
- [sql/04_analytics_events_and_views.sql](sql/04_analytics_events_and_views.sql) — RPC `log_analytics_events` (rate limit 120/min)
- [sql/07_anti_cheat_signature.sql](sql/07_anti_cheat_signature.sql) — `fnv1a_b36()`, trigger antigo (já substituído)
- [sql/08_anti_cheat_v2_server_only.sql](sql/08_anti_cheat_v2_server_only.sql) — function `_compute_game_end_sig_v2` + trigger (trigger foi DROPPADO por bug; functions/views ainda existem)

### Tools
- [tools/assets-generator.html](tools/assets-generator.html) — gera ícones, feature graphic, screenshots via canvas. Suporta `?export=menu|play|feature` pra captura headless.
- [tools/icon-generator.html](tools/icon-generator.html) — gerador interativo de ícone do app
- [tools/_icon-export.html](tools/_icon-export.html) — página dedicada de export do ícone
- [tools/playstore-screenshots.html](tools/playstore-screenshots.html) — drag-and-drop pra polir screenshots reais do celular em Play Store style. Suporta 3 tamanhos de saída: Phone 1080×2400, Tablet 7" 1080×1920, Tablet 10" 1440×2560. Headline + subhead editáveis com auto-fit.
- [tools/feature-graphic.html](tools/feature-graphic.html) — gerador dedicado pra Feature Graphic 1024×500 (banner do topo da Play Store). Headline + subhead + tema editáveis.

### Documentação
- [STORE_LISTING.md](STORE_LISTING.md) — texto pronto PT/EN pra Play Store
- [NEXT_SESSION.md](NEXT_SESSION.md) — checkpoint pra retomar trabalho

### Removidos (intencionalmente, NÃO RECRIAR)
- `js/competitive_ranking_ui.js`, `ranking_hardening_phase2.js` (ranking removido)
- `js/career_meta_patch.js`, `meta_progress_ui.js` (carreira/missões)
- `js/tutorial_hybrid_assist_patch.js` (tutorial híbrido)
- `js/run_variety_patch.js`, `fairness_rng_patch.js` (mutators/balancing)
- `js/ux_secondary_polish_patch.js`, `analytics_actionable_patch.js`
- `js/debug_tools.js`, `meta_progress_ui.js`, `settings_account_ui.js`, `menu_shell_ui.js`

---

## Roadmap pra Play Store

### ✅ Já feito (até 2026-05-04)
- Privacy policy v2.1 bilíngue (com Cloudflare + Sentry declarados como processadores, e-mail `lastorbit.contato@gmail.com`)
- Splash tap-to-start com texto direto no HTML + capture-phase listener no canvas (fix do bug "tap vai pro jogo")
- Sentry crash reporting (DSN ainda placeholder)
- Botão Android back (PLAY→PAUSE→MENU→exit)
- Pause música + força resize ao voltar do background (`visibilitychange` handler)
- Renomeação JACKPOT → MEGA BÔNUS (gambling-safe)
- Color-blind mode
- Tradução PT/EN/ES com botão toggle
- Anti-cheat Tier 1 (3 camadas: save sig + runtime score clamp + bot detection client)
- Console silenciado em prod
- Debug button locked em prod (5 camadas)
- 2 perfis distintos de música menu vs play
- **Painel de áudio refeito**: API `window.OrbitaAudio` com setters reais, sliders Música/SFX/mute funcionando, botão "OK", toast "✓ Salvo", eleva sceneLevel se ducked
- Master limiter + fade-in suave
- Random pitch nos SFX (anti-fadiga)
- Hospedado em HTTPS (Cloudflare Pages)
- **Conta Google Play Developer aprovada** (2026-05-04)
- **Verificação de pacote no Play Console concluída** (chave pública + APK assinado com `assets/adi-registration.properties`)
- AAB assinado em `C:\Users\galil\Downloads\Last Orbit - Google Play package (1)\Last Orbit.aab`
- Keystore + senha em `C:\Users\galil\Downloads\Last Orbit - Google Play package (1)\` (arquivo `signing-key-info.txt`)
- **assetlinks.json com 2 chaves SHA-256** (upload + Play App Signing) — chave do Google `1F:C2:EF:26:E6:E5:3E:83:35:C3:9A:B3:D2:25:6E:08:56:15:5C:AC:B3:4F:F4:4B:DC:2C:0C:A3:72:DE:50:2F`
- Ícone do app (lua sorridente, gerado via canvas)
- Feature graphic 1024×500
- 5 screenshots reais do celular (polidos via `tools/playstore-screenshots.html`)
- STORE_LISTING.md atualizado (linha "Sem tutorial" → "aprende jogando nos 3 primeiros runs")
- **Data Safety form completo** (3 categorias: Atividade no app, Informações de desempenho, ID do dispositivo)
- **Content Rating completo** (Livre / Para Todos)
- **Target audience**: 13+
- **Apps de notícias/saúde/governo/financeiros**: Não
- **Anúncios**: Não (corrigido depois — inicialmente foi marcado Sim por engano)
- **Ficha da loja preenchida** com texto/categoria/email/privacy URL
- **Suporte a tablet desativado** (apenas Phone) — pulou tablet screenshots
- **Release no Teste Interno publicada e ativa** — link de opt-in: `https://play.google.com/apps/internaltest/4701254592733948037`
- Lista de testers criada ("Testers Last Orbit", 3 emails)

### ⏳ Pendente do USUÁRIO
1. **Reinstalar o app no celular** após v117 com assetlinks atualizado (pra TWA abrir sem barra do Chrome)
2. **Testar todos os fluxos no Internal Testing**: splash, menu, painel de áudio, gameplay, pause, back-button, minimize/restaurar
3. **Convidar amigos pra testar** (adicionar emails na lista de testers, máx 100)
4. **Promover release pra Produção** quando confiante (passa por revisão Google de 3-7 dias)
5. **Criar conta Sentry + colar DSN** em `js/sentry_init.js:26` (visibilidade de crashes em prod)
6. **Gravar vídeo trailer** (30-45s, opcional, melhora conversão)
7. **Soft launch** após aprovação → coletar dados → calibrar dificuldade

### 📋 Ainda no escopo de código (se ele pedir)
- Recriar trigger anti-cheat v2 sem o bug (foi droppado, function/views ainda existem)
- Modo "diário" (seed fixa)
- Achievements visuais
- Mover salt do anti-cheat client → 100% server (parcialmente feito)
- Fatiar `flappy_radical_patch.js` em arquivos menores (~3000 linhas)
- Calibrar `SPEED_MULTIPLIER` com dados reais via `analytics_run_end_v1`
- Suporte a tablet (gerar screenshots 9:16 + reativar form factor na Play Console)

---

## Convenções importantes

### Cache versioning
Toda mudança no código frontend → bumpar `CACHE_NAME` em `sw.js`. Atualmente: **`orbita-pwa-v123`**.

### Cache HTTP
- `/sw.js`, `/index.html`: `max-age=0, must-revalidate` (sempre fresh)
- `/js/*`: `max-age=300, must-revalidate` (5min — pra updates no APK chegarem rápido)
- `/icons/*`: `max-age=86400` (1 dia)
- `/manifest.webmanifest`: `max-age=3600`

### Salt — duas camadas
- **Client salt** (`js/flappy_radical_patch.js:343`): `'orb1ta_p4tch_2026_kY9_xL4z'` — visível em DevTools, é "teatro" mas mantém compatibilidade com saves antigos
- **Server salt** (em SQL function `_compute_game_end_sig_v2`): `'lo_2026_kS7_xH9_sR4_p9zMq_ServerOnly_v2'` — isolado em SECURITY DEFINER, invisível ao client

**Não precisam estar sincronizados** (server ignora client sig agora).

### Padrão de modificação
1. **Não mexer em `js/game.js`, `js/render.js`, `js/core.js` direto** sem motivo forte — wrappar via `flappy_radical_patch.js`
2. Usar hooks oficiais quando existem (`registerOrbitaGameplayHook`)
3. Caso contrário, monkey-patch `window.X = function(){...}`
4. Sempre com `try/catch` defensivo + fallback PT-BR
5. Bumpar `sw.js` cache version quando publicar
6. Atualizar `APP_SHELL` no `sw.js` se adicionou novo arquivo `.js`

### CSP
Estrita: SEM `'unsafe-inline'` em script-src. Inline scripts devem ser movidos pra `js/*.js`. Aplicada via `<meta>` no index.html E via `_headers` HTTP do Cloudflare.

### i18n
Toda string visível ao usuário deve passar por `_t('chave')`. Strings hardcoded em `game.js` que aparecem como popup (`OURO!`, `COMBO N!`) são interceptadas pelo wrapper de `addScorePopup` em runtime.

### Anti-cheat (Tier 1)
- **Save**: `_signSave(data)` adiciona `_sig` em todo `saveData`. Validate em load — se inválido, reseta `best/totalScoreEver/...` pra 0.
- **Runtime**: `_expectedScore` track via wrappers de capture. Em `die()`, se `score > _expectedScore + 1` → clampa.
- **Bot detection**: 7 heurísticas client-side anexadas ao payload de game_end (`bot_score`, `is_likely_bot`)
- **Server cap**: 5000 absoluto, 10pt/seg dinâmico, exige checkpoints (sql/03)
- **Server rate limit**: 120 events/min por anon_id
- **Console silenciado em prod** (vaza menos info pra cheaters)

---

## Como deployar

### Setup uma vez
```bash
# Login wrangler (se ainda não estiver)
npx wrangler@3 login
```

⚠️ **IMPORTANTE**: antes de `wrangler login`, garante que `dash.cloudflare.com` no browser está logado em `galileuneto146@gmail.com` (account `5b03bc3937e92ca4335020fed973a03a`). User tem múltiplas contas; wrangler pega a errada se browser estiver em outra.

### Deploy típico (cada mudança de código)

1. Editar arquivos
2. Bumpar `CACHE_NAME` em `sw.js` (ex: v109 → v110)
3. Atualizar `APP_SHELL` se adicionou JS novo
4. Refresh deploy folder + deploy:

```powershell
# Refresh deploy folder
$src='C:\Users\galil\OneDrive\Desktop\Orbita_simples'; $dst="$env:USERPROFILE\Desktop\lastorbit-deploy"; if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }; New-Item -ItemType Directory -Path $dst | Out-Null; foreach ($f in @('index.html','manifest.webmanifest','privacy-policy.html','sw.js','_headers')) { Copy-Item "$src\$f" "$dst\$f" }; foreach ($d in @('icons','js','tools','.well-known','screenshots')) { if (Test-Path "$src\$d") { Copy-Item "$src\$d" "$dst\$d" -Recurse -Force } }
```

```bash
# Deploy (CLOUDFLARE_ACCOUNT_ID explícito previne wrangler pegar conta errada)
cd /c/Users/galil/Desktop/lastorbit-deploy && CLOUDFLARE_ACCOUNT_ID=5b03bc3937e92ca4335020fed973a03a npx wrangler@3 pages deploy . --project-name=lastorbit-app --branch=main --commit-dirty=true
```

5. Validar:
```bash
curl -s 'https://lastorbit-app.pages.dev/sw.js?cb=test' | grep CACHE_NAME
```

### NPM versions
- **Wrangler v3** (não v4 — exige Node 22, user tem Node 20)
- **Supabase CLI v2** funciona com Node 20

---

## Comandos úteis

```bash
# Servir local (testar antes de deploy)
cd C:/Users/galil/OneDrive/Desktop/Orbita_simples && python -m http.server 8000

# Abrir no navegador
http://localhost:8000

# Asset generator (gera ícones/feature graphic/screenshots via canvas)
http://localhost:8000/tools/assets-generator.html

# Privacy policy
http://localhost:8000/privacy-policy.html

# Icon generator (interativo, gera novos ícones de app)
http://localhost:8000/tools/icon-generator.html
```

### Reset de save (testar onboarding)
DevTools → Application → Local Storage → http://localhost:8000 → apagar `orbita_save` (e `orbita_anon_id`, `orbita_first_seen`, etc se quiser começar 100% zerado).

### Debug mode (apenas localhost)
Tap no 🧪 no canto superior esquerdo do menu inicial. **Em prod o botão NÃO existe** (locked em 5 camadas: render, hit area, toggle, init, localStorage cleanup).

### Acessar Supabase via API (sem dashboard)
User pode gerar Personal Access Token em `https://supabase.com/dashboard/account/tokens`. Aí dá pra rodar SQL via:
```bash
curl -X POST 'https://api.supabase.com/v1/projects/poedjpfrwpdsdjjjduow/database/query' \
  -H "Authorization: Bearer sbp_..." -H 'Content-Type: application/json' \
  -d '{"query":"SELECT 1"}'
```
**Sempre revogar o token depois de usar.**

---

## Quirks conhecidos

1. **Wrangler pega conta errada quando user tem múltiplas Cloudflare accounts**: sempre usar `CLOUDFLARE_ACCOUNT_ID=5b03...` env var explícita no deploy.
2. **`history.pushState` quirk**: O back-button handler push'a guard inicial. Em browser puro a 2ª back não fecha (fica em [page]), em PWA wrapped fecha. Aceitável.
3. **Splash tap-to-start**: música SÓ inicia depois de qualquer toque. Limitação de browser autoplay policy, sem como contornar.
4. **Service worker pode prender cache antigo**: sempre Ctrl+Shift+R ou desregistrar SW pra desenvolver.
5. **Sentry SDK sem `integrity` attribute**: TODO de segurança documentado em `sentry_init.js`. Adicionei integrity no Supabase mas Sentry ficou de fora.
6. **Trigger anti-cheat v2 droppado**: o trigger SQL `validate_game_end_sig_v2` tinha bug em algum cast/condição. Foi droppado pra desbloquear analytics. Functions e views permanecem (`_compute_game_end_sig_v2`, `cheats_detected_v2`, `cheats_rate_daily_v2`). Pra reativar: debugar a função e recriar trigger.
7. **Account Cloudflare alternativa**: user também tem `019d66ae245b8e819cf64e31828f4504` (`sistem.bac@gmail.com`). NÃO USAR essa pro projeto.

---

## Como continuar

### Em qualquer nova conversa
Cole no prompt inicial:
```
Continuando o trabalho do Last Orbit. Lê o NEXT_SESSION.md no projeto pra status atual + CLAUDE.md pra contexto técnico.
```

### Perguntas úteis pra alinhar com o user
- "Já criou conta Sentry / Play Developer?"
- "Quer continuar polindo o jogo ou seguir pro upload no Play Console?"
- "Algum bug específico que apareceu?"

### O usuário historicamente prefere
- Respostas em **PT-BR**
- Soluções diretas, **sem perguntar muito**
- Mostrar **dificuldade da realidade** (chance de sucesso, custo, etc.)
- **Implementar primeiro, polir depois**
- Ações automatizadas em vez de instruções manuais (use wrangler CLI / Supabase Management API quando possível, peça token quando precisar)
