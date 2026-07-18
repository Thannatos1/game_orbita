-- Last Orbit v130 analytics normalization.
-- The current client sends `game_end`; older views expected `game_over`.
-- This migration keeps backward compatibility and exposes the new death feedback.

begin;

create or replace view public.analytics_run_end_v1 as
select
  coalesce((client_ts at time zone 'utc')::date, created_at::date) as event_day,
  created_at,
  session_id,
  user_id,
  coalesce(payload->>'client_run_id', payload->>'run_id') as run_ref,
  coalesce(payload->>'mode', 'unknown') as mode,
  coalesce(payload->>'source', 'unknown') as source,
  coalesce((payload->>'score')::int, (payload->>'final_score')::int, 0) as score,
  coalesce((payload->>'phase')::int, (payload->>'final_phase')::int, 1) as phase,
  coalesce((payload->>'duration_s')::numeric, (payload->>'duration_seconds')::numeric, 0) as duration_seconds,
  coalesce(payload->>'death_reason', 'unknown') as death_reason,
  coalesce((payload->>'captures')::int, 0) as captures,
  coalesce((payload->>'captures_easy')::int, 0) as captures_easy,
  coalesce((payload->>'captures_medium')::int, 0) as captures_medium,
  coalesce((payload->>'captures_hard')::int, 0) as captures_hard,
  coalesce((payload->>'captures_gold')::int, 0) as captures_gold,
  coalesce((payload->>'gold_captures')::int, 0) as gold_captures,
  coalesce((payload->>'powerups_collected')::int, 0) as powerups_collected,
  coalesce((payload->>'max_combo')::int, (payload->>'best_combo_run')::int, 0) as best_combo_run,
  coalesce((payload->>'pause_count')::int, 0) as pause_count,
  coalesce((payload->>'tutorial_step')::int, 0) as tutorial_step,
  coalesce((payload->>'new_record')::boolean, false) as new_record,
  payload->>'selected_skin' as selected_skin,
  payload->>'selected_bg' as selected_bg,
  event_name,
  coalesce((payload->>'best')::int, 0) as best,
  coalesce(payload->'death_reason_meta', '{}'::jsonb) as death_reason_meta,
  coalesce((payload->>'releases')::int, 0) as releases,
  coalesce((payload->>'max_combo')::int, (payload->>'best_combo_run')::int, 0) as max_combo,
  coalesce((payload->>'training_run')::boolean, false) as training_run,
  coalesce((payload->>'record_eligible')::boolean, true) as record_eligible,
  coalesce((payload->>'onboarding_run_index')::int, null) as onboarding_run_index,
  coalesce((payload->>'onboarding_total_runs')::int, null) as onboarding_total_runs,
  coalesce((payload->>'had_near_miss')::boolean, false) as had_near_miss,
  payload->>'near_miss_tier' as near_miss_tier,
  coalesce((payload->>'cheat_flagged')::boolean, false) as cheat_flagged,
  coalesce((payload->>'is_likely_bot')::boolean, false) as is_likely_bot,
  coalesce((payload->>'bot_score')::int, 0) as bot_score,
  payload->'bot_reasons' as bot_reasons,
  payload as raw_payload
from public.analytics_events
where event_name in ('game_end', 'game_over');

create or replace view public.analytics_daily_funnel_v1 as
with per_session as (
  select
    coalesce((client_ts at time zone 'utc')::date, created_at::date) as event_day,
    session_id,
    bool_or(event_name in ('app_open', 'session_start')) as opened,
    bool_or(event_name = 'game_start') as started,
    bool_or(event_name = 'first_release') as first_release,
    bool_or(event_name in ('game_end', 'game_over')) as finished
  from public.analytics_events
  group by 1, 2
)
select
  event_day,
  count(*) filter (where opened) as sessions_opened,
  count(*) filter (where started) as sessions_started_run,
  count(*) filter (where first_release) as sessions_first_release,
  count(*) filter (where finished) as sessions_finished_run,
  round(100.0 * count(*) filter (where started) / nullif(count(*) filter (where opened), 0), 2) as open_to_start_pct,
  round(100.0 * count(*) filter (where first_release) / nullif(count(*) filter (where started), 0), 2) as start_to_first_release_pct,
  round(100.0 * count(*) filter (where finished) / nullif(count(*) filter (where started), 0), 2) as start_to_finish_pct
from per_session
group by event_day
order by event_day desc;

create or replace view public.analytics_death_reason_daily_v1 as
select
  event_day,
  death_reason,
  training_run,
  count(*) as runs,
  round(avg(score)::numeric, 2) as avg_score,
  round((percentile_cont(0.5) within group (order by score))::numeric, 2) as median_score,
  round(avg(duration_seconds)::numeric, 2) as avg_duration_seconds,
  round(avg(captures)::numeric, 2) as avg_captures,
  round(avg(releases)::numeric, 2) as avg_releases,
  round(100.0 * count(*) / nullif(sum(count(*)) over (partition by event_day, training_run), 0), 2) as pct_of_runs
from public.analytics_run_end_v1
where not is_likely_bot
  and not cheat_flagged
group by event_day, death_reason, training_run
order by event_day desc, training_run desc, runs desc;

create or replace view public.analytics_death_reason_recent_v1 as
select
  created_at,
  session_id,
  user_id,
  score,
  best,
  phase,
  duration_seconds,
  captures,
  releases,
  max_combo,
  death_reason,
  death_reason_meta,
  training_run,
  record_eligible,
  onboarding_run_index,
  had_near_miss,
  near_miss_tier
from public.analytics_run_end_v1
where not is_likely_bot
  and not cheat_flagged
order by created_at desc
limit 200;

commit;
