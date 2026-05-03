-- ============================================================
-- ANTI-CHEAT v2 — server-side only (PROD GRADE)
-- ============================================================
-- Substitui a logica de assinatura cliente do sql/07.
--
-- Mudancas:
-- 1) IGNORA completamente o `_sig` que vem do client (era teatro
--    porque o salt estava no JS, visivel em DevTools).
-- 2) Calcula sig SERVER-SIDE com salt INTERNO ao SECURITY DEFINER.
--    Salt fica isolado: client nao tem acesso, RPC normal nao ve,
--    soh a function dona da tabela (postgres user) consegue ler.
-- 3) Rejeita game_end com `is_likely_bot=true` ou `bot_score>=4`
--    (vem da deteccao client-side que combina webdriver + UA + etc).
-- 4) Cap de score absoluto reduzido de 5000 -> 2000 (impossivel
--    legitimo passar disso na curva atual de dificuldade).
-- 5) Detecta replay attack: payload identico do mesmo anon_id em
--    < 60s = rejeitado.
-- ============================================================

begin;

-- ----------------------------------------------------------------
-- Salt SERVER-SIDE (NOVO, diferente do antigo _AC_SALT do JS).
-- Hardcoded em SECURITY DEFINER function. Client jamais ve.
-- Pra trocar: edita aqui, dropa/recria function, redeploy.
-- ----------------------------------------------------------------
create or replace function public._compute_game_end_sig_v2(payload jsonb)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  -- SALT SERVER-ONLY. Nunca exposto ao client.
  -- Mudar este valor invalida todas as sigs existentes (intencional ao
  -- detectar leak ou rodar quarterly rotation).
  salt constant text := 'lo_2026_kS7_xH9_sR4_p9zMq_ServerOnly_v2';
  parts text;
begin
  if payload is null then return '0'; end if;

  -- Concatena campos canonicos do payload (mesma ordem do client v1
  -- pra compatibilidade futura, mas com salt diferente).
  parts := concat(
    'anon_id:',     coalesce(payload->>'anon_id', ''),     '|',
    'score:',       coalesce(payload->>'score', '0'),       '|',
    'best:',        coalesce(payload->>'best', '0'),        '|',
    'duration_s:',  coalesce(payload->>'duration_s', '0'),  '|',
    'captures:',    coalesce(payload->>'captures', '0'),    '|',
    'max_combo:',   coalesce(payload->>'max_combo', '0'),
    '|', salt
  );

  return public.fnv1a_b36(parts);
end;
$$;

-- Lockdown: client nao pode chamar essa function diretamente
revoke all on function public._compute_game_end_sig_v2(jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------
-- Trigger v2: substitui o do sql/07. Ignora _sig do client.
-- Calcula sig server-side e armazena em coluna separada.
-- Aplica filtros de bot detection + caps mais apertados.
-- ----------------------------------------------------------------
create or replace function public.validate_game_end_sig_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
  evt_name text;
  bot_score int;
  is_bot boolean;
  client_score int;
  ABSOLUTE_CAP constant int := 2000;          -- reduzido de 5000
  BOT_THRESHOLD constant int := 4;
  REPLAY_WINDOW_S constant int := 60;
  v_dup_count int;
begin
  evt_name := new.event_name;
  payload := coalesce(new.payload, '{}'::jsonb);

  -- Soh se aplica a game_end events
  if evt_name <> 'game_end' then
    return new;
  end if;

  -- ---------- Bot rejection ----------
  is_bot := coalesce((payload->>'is_likely_bot')::boolean, false);
  bot_score := coalesce((payload->>'bot_score')::int, 0);

  if is_bot or bot_score >= BOT_THRESHOLD then
    -- Marca como rejeitado mas insere ainda (pra ter dado de auditoria)
    new.payload := payload || jsonb_build_object(
      '_server_rejected', true,
      '_server_reject_reason', 'bot_detected',
      '_server_bot_score', bot_score
    );
    -- Score forcado 0 pra nao contaminar leaderboard / stats agregadas
    new.payload := new.payload || jsonb_build_object('score', 0, 'best', 0);
    return new;
  end if;

  -- ---------- Cap de score absoluto ----------
  client_score := coalesce((payload->>'score')::int, 0);
  if client_score > ABSOLUTE_CAP then
    new.payload := payload || jsonb_build_object(
      '_server_rejected', true,
      '_server_reject_reason', 'score_above_absolute_cap',
      '_server_original_score', client_score,
      'score', ABSOLUTE_CAP
    );
    return new;
  end if;

  -- ---------- Replay attack: payload identico em < 60s ----------
  -- Hash simplificado: anon_id + score + duration. Se aparecer 2x
  -- em 60s, eh tentativa de replay (fila offline + envio rapido).
  select count(*) into v_dup_count
  from public.analytics_events e
  where e.event_name = 'game_end'
    and e.created_at > now() - (REPLAY_WINDOW_S || ' seconds')::interval
    and e.payload->>'anon_id' = payload->>'anon_id'
    and e.payload->>'score' = payload->>'score'
    and e.payload->>'duration_s' = payload->>'duration_s'
    and e.payload->>'captures' = payload->>'captures';

  if v_dup_count > 0 then
    new.payload := payload || jsonb_build_object(
      '_server_rejected', true,
      '_server_reject_reason', 'replay_attack_window'
    );
    return new;
  end if;

  -- ---------- Server-side signing (substitui _sig do client) ----------
  -- Remove o _sig que veio do client (era teatro; agora ignoramos).
  -- Adiciona o nosso, calculado server-side com salt isolado.
  new.payload := (payload - '_sig') || jsonb_build_object(
    '_server_sig', public._compute_game_end_sig_v2(payload),
    '_server_validated', true,
    '_server_validated_at', extract(epoch from now())::int
  );

  return new;
end;
$$;

-- Drop trigger antigo do sql/07 e cria o novo
drop trigger if exists trg_validate_game_end_sig on public.analytics_events;
drop trigger if exists trg_validate_game_end_sig_v2 on public.analytics_events;

create trigger trg_validate_game_end_sig_v2
  before insert on public.analytics_events
  for each row
  execute function public.validate_game_end_sig_v2();

-- ----------------------------------------------------------------
-- View pra dashboard de cheaters (substitui cheats_detected_v1)
-- ----------------------------------------------------------------
create or replace view public.cheats_detected_v2 as
select
  e.created_at,
  e.session_id,
  e.user_id,
  e.payload->>'anon_id'                       as anon_id,
  (e.payload->>'_server_original_score')::int as claimed_score,
  (e.payload->>'score')::int                  as final_score,
  e.payload->>'_server_reject_reason'         as reason,
  (e.payload->>'_server_bot_score')::int      as bot_score,
  e.payload->'bot_reasons'                    as bot_reasons,
  e.payload                                   as full_payload
from public.analytics_events e
where e.event_name = 'game_end'
  and (e.payload->>'_server_rejected')::boolean is true
order by e.created_at desc;

revoke all on public.cheats_detected_v2 from public, anon, authenticated;

-- ----------------------------------------------------------------
-- Stats: % de submissions rejeitadas por dia
-- ----------------------------------------------------------------
create or replace view public.cheats_rate_daily_v2 as
select
  date_trunc('day', created_at) as day,
  count(*) as total_submissions,
  count(*) filter (where (payload->>'_server_rejected')::boolean is true) as rejected,
  round(
    100.0 * count(*) filter (where (payload->>'_server_rejected')::boolean is true) / nullif(count(*), 0)::numeric,
    2
  ) as reject_pct,
  count(*) filter (where payload->>'_server_reject_reason' = 'bot_detected')             as bot_detected,
  count(*) filter (where payload->>'_server_reject_reason' = 'score_above_absolute_cap') as score_capped,
  count(*) filter (where payload->>'_server_reject_reason' = 'replay_attack_window')     as replay_blocked
from public.analytics_events
where event_name = 'game_end'
group by 1
order by 1 desc;

revoke all on public.cheats_rate_daily_v2 from public, anon, authenticated;

commit;

-- ============================================================
-- COMO APLICAR
-- ============================================================
-- 1. Vai no Supabase Dashboard -> SQL Editor
-- 2. Cola este arquivo inteiro
-- 3. Run
-- 4. Verifica resultado: deve aparecer "Success. No rows returned"
-- 5. Pra rotacionar o salt (recomendado a cada quarter):
--    - Edita a constant `salt` em `_compute_game_end_sig_v2`
--    - Re-roda o create or replace function
--    - Sigs antigas continuam validas no banco mas novas sao recalc
-- ============================================================
