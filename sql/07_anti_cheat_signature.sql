-- ============================================================
-- ANTI-CHEAT: validacao server-side da assinatura do game_end
-- ============================================================
-- Replica em plpgsql o algoritmo FNV-1a base36 que o client
-- usa em flappy_radical_patch.js (_signEvent + _AC_SALT).
-- Adiciona trigger BEFORE INSERT em analytics_events que marca
-- eventos game_end com _sig_invalid=true se a assinatura nao
-- bate. Eventos sem _sig sao marcados _no_sig=true.
--
-- LIMITACAO: o salt esta no codigo JS do client, entao cheaters
-- determinados conseguem extrair e forjar sigs validas. Esta
-- camada bloqueia ~95% dos cheats casuais (DevTools/console).
-- Pra blindagem total, mover a assinatura pra um RPC que recebe
-- os campos crus e assina server-side com salt em variavel de
-- ambiente. Ver TODO no fim do arquivo.
-- ============================================================

begin;

-- ----------------------------------------------------------------
-- FNV-1a hash, mesmo algoritmo do JS
-- (offset basis 2166136261, prime 16777619, output em base36)
-- ----------------------------------------------------------------
create or replace function public.fnv1a_b36(input text)
returns text
language plpgsql
immutable
as $$
declare
  h bigint := 2166136261;
  c integer;
  i integer;
  n bigint;
  digits constant text := '0123456789abcdefghijklmnopqrstuvwxyz';
  remainder integer;
  result text := '';
begin
  if input is null or length(input) = 0 then
    return '0';
  end if;
  for i in 1..length(input) loop
    c := ascii(substring(input from i for 1));
    h := (h # c::bigint) & 4294967295::bigint;        -- XOR uint32
    h := (h * 16777619::bigint) & 4294967295::bigint; -- mul mod 2^32
  end loop;
  if h = 0 then
    return '0';
  end if;
  n := h;
  while n > 0 loop
    remainder := (n % 36)::integer;
    result := substring(digits from remainder + 1 for 1) || result;
    n := n / 36;
  end loop;
  return result;
end;
$$;

-- ----------------------------------------------------------------
-- Valida a assinatura de um payload de game_end.
-- Espelha exatamente _signEvent() do flappy_radical_patch.js.
-- ----------------------------------------------------------------
create or replace function public.validate_game_end_sig(payload jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  -- ATENCAO: tem que casar com _AC_SALT em flappy_radical_patch.js
  salt constant text := 'orb1ta_p4tch_2026_kY9_xL4z';
  fields constant text[] := array[
    'anon_id', 'score', 'best', 'duration_s', 'captures', 'max_combo'
  ];
  field text;
  v text;
  parts text := '';
  expected text;
  provided text;
begin
  foreach field in array fields loop
    v := coalesce(payload->>field, '');
    if length(parts) > 0 then
      parts := parts || '|';
    end if;
    parts := parts || field || ':' || v;
  end loop;
  parts := parts || '|' || salt;
  expected := public.fnv1a_b36(parts);
  provided := coalesce(payload->>'_sig', '');
  return expected = provided;
end;
$$;

-- ----------------------------------------------------------------
-- Trigger: marca eventos game_end forjados com _sig_invalid=true
-- ----------------------------------------------------------------
create or replace function public.tr_validate_game_end_sig()
returns trigger
language plpgsql
as $$
begin
  if NEW.event_name = 'game_end' then
    if NEW.payload ? '_sig' then
      if not public.validate_game_end_sig(NEW.payload) then
        NEW.payload := NEW.payload || jsonb_build_object('_sig_invalid', true);
      end if;
    else
      NEW.payload := NEW.payload || jsonb_build_object(
        '_sig_invalid', true,
        '_no_sig', true
      );
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists analytics_events_validate_game_end on public.analytics_events;

create trigger analytics_events_validate_game_end
before insert on public.analytics_events
for each row execute function public.tr_validate_game_end_sig();

-- ----------------------------------------------------------------
-- View: cheats detectados (client + server)
-- ----------------------------------------------------------------
create or replace view public.cheats_detected_v1 as
select
  ae.created_at,
  ae.session_id,
  ae.user_id,
  ae.payload->>'anon_id' as anon_id,
  (ae.payload->>'score')::int as score,
  (ae.payload->>'best')::int as best,
  (ae.payload->>'duration_s')::numeric as duration_s,
  (ae.payload->>'captures')::int as captures,
  coalesce((ae.payload->>'cheat_flagged')::boolean, false) as client_flagged,
  coalesce((ae.payload->>'_sig_invalid')::boolean, false) as server_invalid_sig,
  coalesce((ae.payload->>'_no_sig')::boolean, false) as missing_sig,
  ae.payload as full_payload
from public.analytics_events ae
where ae.event_name = 'game_end'
  and (
    coalesce((ae.payload->>'cheat_flagged')::boolean, false)
    or coalesce((ae.payload->>'_sig_invalid')::boolean, false)
  )
order by ae.created_at desc;

-- ----------------------------------------------------------------
-- View: ranking de anon_ids mais suspeitos
-- ----------------------------------------------------------------
create or replace view public.cheats_by_anon_id_v1 as
select
  ae.payload->>'anon_id' as anon_id,
  count(*) as total_game_ends,
  count(*) filter (where coalesce((ae.payload->>'cheat_flagged')::boolean, false)) as client_cheats,
  count(*) filter (where coalesce((ae.payload->>'_sig_invalid')::boolean, false)) as server_invalid,
  max((ae.payload->>'score')::int) as max_score,
  min(ae.created_at) as first_seen,
  max(ae.created_at) as last_seen
from public.analytics_events ae
where ae.event_name = 'game_end'
  and ae.payload ? 'anon_id'
group by ae.payload->>'anon_id'
having
  count(*) filter (where coalesce((ae.payload->>'cheat_flagged')::boolean, false)) > 0
  or count(*) filter (where coalesce((ae.payload->>'_sig_invalid')::boolean, false)) > 0
order by server_invalid desc, client_cheats desc, max_score desc;

commit;

-- ============================================================
-- COMO USAR
-- ============================================================
-- Aplicar:
--   psql $DATABASE_URL -f sql/07_anti_cheat_signature.sql
-- ou cole no SQL Editor do Supabase Studio.
--
-- Monitorar cheats em tempo real:
--   select * from public.cheats_detected_v1 limit 50;
--
-- Top suspeitos:
--   select * from public.cheats_by_anon_id_v1 limit 20;
--
-- Banir manualmente um anon_id (exemplo):
--   create table if not exists public.banned_anon_ids (
--     anon_id text primary key,
--     banned_at timestamptz default now(),
--     reason text
--   );
--   insert into public.banned_anon_ids(anon_id, reason)
--     values ('uuid-aqui', 'sig forjada repetida');
--
-- ============================================================
-- TODO: Blindagem total
-- ============================================================
-- Pra impossibilitar forja: substituir a logica do _signEvent no
-- client por uma chamada RPC que recebe os campos crus e o servidor
-- assina/grava sozinho. O salt fica em vault.secrets ou ENV var.
-- O client nao precisa nem saber o salt. Exemplo:
--
--   create or replace function public.submit_game_end(
--     p_anon_id text, p_score int, p_best int,
--     p_duration_s numeric, p_captures int, p_max_combo int,
--     p_meta jsonb
--   ) returns jsonb language plpgsql security definer ...
--
-- O client envia os numeros, o servidor valida coerencia (ex.:
-- score <= captures * 25, duration_s >= captures * 0.3, etc.) e
-- so insere se passar. Isto remove o salt do cliente por completo.
-- ============================================================
