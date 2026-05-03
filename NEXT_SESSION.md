# Last Orbit — Checkpoint de sessão (continuar daqui)

> Este arquivo registra o estado exato em que paramos pra retomar em nova conversa Claude. Cole esse conteúdo na próxima sessão pra contexto rápido.

**Última atualização**: ver git log
**Owner**: Galileu (galileuneto146@gmail.com)
**Branding**: Last Orbit (codename interno: `orbita`)

---

## 🎯 Onde paramos

Estamos a **1 passo do upload na Play Console**. Estado atual:

- ✅ AAB assinado já gerado pelo PWABuilder, em `C:\Users\galil\Desktop\lastorbit-keys\`
- ✅ Keystore + senha salvas/backup feito
- ✅ Player Console signup → conta sendo criada (1-3 dias de aprovação Google)
- ✅ Hospedado em `https://lastorbit-app.pages.dev` (Cloudflare Pages)
- ⏳ **Próximo deploy pendente**: v109 com música distinta menu/play + painel de volume HTML
- ⏳ Última issue ativa: re-login do wrangler com conta Cloudflare correta (caía em `sistem.bac@gmail.com` em vez da do projeto)

---

## 📦 Versão atual

| Arquivo | Versão |
|---|---|
| `sw.js` `CACHE_NAME` | **`orbita-pwa-v109`** (no código local; último deploy bem-sucedido foi **v108**) |
| Última versão no ar (Cloudflare Pages) | v108 (sem o painel de áudio + perfis distintos de música) |
| AAB gerado e assinado | sim, pacote com chave nova `app.lastorbit.game` |

---

## 🚀 Infra

| Recurso | Onde | Como acessar |
|---|---|---|
| **Frontend (PWA prod)** | Cloudflare Pages | `https://lastorbit-app.pages.dev` |
| **Project name** | `lastorbit-app` | Account: `5b03bc3937e92ca4335020fed973a03a` (galileuneto146) |
| **Outro Cloudflare account** (NÃO USAR) | `019d66ae245b8e819cf64e31828f4504` | Email `sistem.bac@gmail.com` — wrangler tende a pegar essa |
| **Backend Supabase** | `poedjpfrwpdsdjjjduow.supabase.co` | RLS apertado, anon key em `services.js` |
| **Sentry** | DSN ainda placeholder | `js/sentry_init.js:26` |
| **Conta Play Developer** | Em criação | $25 paid one-time |
| **Worker antigo** (descartável) | `lastorbit.galileuneto146.workers.dev` | Pode deletar quando quiser |

---

## 🔄 Como deployar

1. Editar arquivos em `C:\Users\galil\OneDrive\Desktop\Orbita_simples\`
2. Bumpar `CACHE_NAME` em `sw.js` (atualmente em `v109`, próximo é v110)
3. Atualizar `APP_SHELL` em `sw.js` se adicionou/renomeou JS
4. Refresh deploy folder + deploy:

```powershell
# Refresh
$src='C:\Users\galil\OneDrive\Desktop\Orbita_simples'; $dst="$env:USERPROFILE\Desktop\lastorbit-deploy"; if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }; New-Item -ItemType Directory -Path $dst | Out-Null; foreach ($f in @('index.html','manifest.webmanifest','privacy-policy.html','sw.js','_headers')) { Copy-Item "$src\$f" "$dst\$f" }; foreach ($d in @('icons','js','tools','.well-known','screenshots')) { if (Test-Path "$src\$d") { Copy-Item "$src\$d" "$dst\$d" -Recurse -Force } }
```

```bash
# Deploy (FORÇA account ID correto pra evitar bug do wrangler pegar conta errada)
cd /c/Users/galil/Desktop/lastorbit-deploy && CLOUDFLARE_ACCOUNT_ID=5b03bc3937e92ca4335020fed973a03a npx wrangler@3 pages deploy . --project-name=lastorbit-app --branch=main --commit-dirty=true
```

5. Validar:

```bash
curl -s 'https://lastorbit-app.pages.dev/sw.js?cb=test' | grep CACHE_NAME
```

⚠️ **Wrangler v3** (não v4 — exige Node 22, user tem Node 20).
⚠️ Se der "Project not found" e mostrar `019d...` no erro: wrangler está autenticado na conta errada. Logout, garante que browser está em `galileuneto146@gmail.com`, login de novo.

---

## ✅ v109 deployado com sucesso (resolvido)

Mudanças aplicadas e ao vivo em `https://lastorbit-app.pages.dev`:
- `js/core.js`: perfis de timbre distintos menu/play (`profileMenu`, `profilePlay`)
- `js/audio_panel.js` (novo): painel HTML com sliders de música/SFX/mute, API `window.OrbitaAudioPanel.open()`
- `index.html`: HTML do painel + CSS + script tag pra `audio_panel.js`
- `js/flappy_radical_patch.js`: tap no speaker do menu agora abre painel
- `sw.js`: CACHE_NAME `v109`, `audio_panel.js` adicionado ao APP_SHELL

### Lição aprendida (importante pra próxima)

Wrangler tem bug conhecido de pegar conta errada quando usuário tem múltiplas contas Cloudflare. Pra evitar:
1. Antes de `wrangler login`, garante que `dash.cloudflare.com` está logado na conta correta no browser
2. Se duvidar, sempre usa flag explícita: `CLOUDFLARE_ACCOUNT_ID=5b03bc3937e92ca4335020fed973a03a npx wrangler@3 pages deploy ...`

---

## 📋 Próximos passos do projeto (pós-deploy v109)

### Curto prazo (esta semana)

1. **Validar v109 no celular** — testar tap no 🔊, sliders, mute, persistência via reload
2. **Aguardar aprovação Play Developer Account** (1-3 dias)
3. **Criar app no Play Console** quando aprovado (rascunho pode ser feito antes)
4. **Subir AAB** → testes internos primeiro
5. **Gravar vídeo trailer** — usar Win+G ou OBS Studio com Chrome em modo `--app=` device emulation
6. **Substituir screenshots gerados via canvas** por screenshots reais do gameplay

### Médio prazo

7. **Criar conta Sentry** + colar DSN em `js/sentry_init.js:26` (visibilidade de crashes)
8. **Recriar o anti-cheat trigger v2** (foi droppado por bug — veja `sql/08_anti_cheat_v2_server_only.sql`, problema era em algum cast/condição)
9. **Submit pra produção da Play Store** após testes internos passarem

### Longo prazo

10. Calibrar `SPEED_MULTIPLIER` com dados reais via `analytics_run_end_v1`
11. Fatiar `flappy_radical_patch.js` em arquivos menores (~3000 linhas hoje)

---

## 📁 Arquivos importantes neste round de trabalho

| Arquivo | O que faz |
|---|---|
| `js/audio_panel.js` | NOVO. Painel modal HTML com sliders de música/SFX/mute. Wire-up automático no DOM ready. API: `window.OrbitaAudioPanel.open()` |
| `js/sw_register_inline.js` | NOVO. Registra SW de forma "inline-equivalent" pra PWABuilder/Lighthouse detectarem (CSP estrita não permite `<script>` inline) |
| `js/core.js` | Mudanças no áudio: 2 chord sets distintos, 2 profiles de timbre, master limiter, fade-in 3.5s, listeners globais pra inicializar AudioContext em qualquer gesture |
| `js/flappy_radical_patch.js` | Bot detection (`_botSignals`), debug button locked em prod (`_IS_PROD`), splash agora é "TAP TO START" em vez de auto-hide |
| `index.html` | HTML do audio panel, CSS, script tags novos. Splash CSS atualizado pra "LAST/ORBIT" 2 linhas + CTA pulsante |
| `sw.js` | Cache versionado (v109 atual), APP_SHELL atualizado |
| `_headers` (Cloudflare) | HSTS, CSP `frame-ancestors`, Cache-Control diferenciado por path |
| `manifest.webmanifest` | 20 campos preenchidos (incluindo `screenshots`, `shortcuts`, `display_override`) |
| `STORE_LISTING.md` | Texto pronto PT/EN pra Play Store (short + full description) |
| `screenshots/` | `screen-menu.png`, `screen-play.png`, `feature-graphic.png` (1024×500) — todos gerados via canvas + Edge headless |
| `icons/` | `icon-192.png`, `icon-512.png` — design lua sorridente com glow ciano |
| `sql/08_anti_cheat_v2_server_only.sql` | Migration aplicada e DEPOIS o trigger foi droppado por bug. Function/views ainda existem no banco. |

---

## 🔐 Coisas a NÃO mudar

- localStorage keys: `orbita_save`, `orbita_anon_id`, `orbita_first_seen`, `orbita_debug_mode`
- Anti-cheat salt client (em `js/flappy_radical_patch.js`): `'orb1ta_p4tch_2026_kY9_xL4z'` (já é teatro mas não vale recalcular saves de testers)
- Anti-cheat salt server (em SQL function `_compute_game_end_sig_v2`): `'lo_2026_kS7_xH9_sR4_p9zMq_ServerOnly_v2'`
- Codename interno: `OrbitaI18n`, `[Orbita]` em logs, `tags: { game: 'orbita' }` no Sentry, `release: 'orbita@1.0.0'`
- Package name Android: `app.lastorbit.game` (imutável após publicar na Play)
- Keystore + senha: arquivo crítico, perda = nunca mais update

---

## 🎮 Decisões de produto recentes (não mexer sem motivo)

- **Música**: 2 perfis distintos (menu chill etéreo / play tense denso). Volume mínimo 0.45 forçado em MENU/DEAD pra não ficar mudo.
- **Splash**: tap-to-start (não auto-hide) pra resolver "menu mudo" causado por autoplay policy
- **Debug button**: oculto em prod, força `_debugMode=false` em prod
- **Console silenced em prod** (não em localhost)
- **Bot detection client**: 7 heurísticas, anexa `bot_score` e `is_likely_bot` ao payload de game_end (server pode filtrar futuramente)
- **CSP**: estrita, sem `'unsafe-inline'`. Inline scripts movidos pra `js/*.js`
- **Cache strategy**: `index.html` e `sw.js` com `Cache-Control: max-age=0, must-revalidate`. Assets versionados via `CACHE_NAME` no service worker.

---

## 🤖 Como retomar com Claude Code

Cole na próxima conversa:

```
Continuando o trabalho do Last Orbit. Lê o NEXT_SESSION.md no projeto pra contexto rápido.

Status: deploy v109 do Cloudflare Pages está pendente porque o wrangler caiu na conta errada. Pra retomar:
1. Verificar que browser está logado em galileuneto146@gmail.com no dash.cloudflare.com
2. Rodar o deploy command com CLOUDFLARE_ACCOUNT_ID=5b03bc3937e92ca4335020fed973a03a explícito

Próximo objetivo: validar v109 no celular, aguardar aprovação Play Developer, subir AAB.
```

E lê o `CLAUDE.md` (já mantido atualizado) pra contexto técnico do projeto.
