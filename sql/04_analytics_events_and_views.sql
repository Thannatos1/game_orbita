begin;

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  event_name text not null,
  client_ts timestamptz null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_analytics_events_created_at on public.analytics_events(created_at desc);
create index if not exists idx_analytics_events_event_name on public.analytics_events(event_name);
create index if not exists idx_analytics_events_user_id on public.analytics_events(user_id);
create index if not exists idx_analytics_events_session_id on public.analytics_events(session_id);

alter table public.analytics_events enable row level security;

drop policy if exists "Analytics disabled direct read" on public.analytics_events;
drop policy if exists "Analytics disabled direct write" on public.analytics_events;

create policy "Analytics disabled direct read"
on public.analytics_events
for select
to anon, authenticated
using (false);

create policy "Analytics disabled direct write"
on public.analytics_events
for insert
to anon, authenticated
with check (false);

revoke all on public.analytics_events from anon, authenticated;

create or replace function public.log_analytics_events(p_events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_count integer := 0;
  v_item jsonb;
  v_batch_cap constant integer := 25;
  v_per_minute_cap constant integer := 120;
  v_payload_bytes_cap constant integer := 4096;
  v_session_id text;
  v_first_session text := null;
  v_recent integer;
  v_event_name text;
begin
  v_uid := auth.uid();

  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'invalid analytics payload';
  end if;

  if jsonb_array_length(p_events) > v_batch_cap then
    raise exception 'analytics batch too large' using errcode = '22023';
  end if;

  if v_uid is not null then
    select count(*) into v_recent
    from public.analytics_events
    where user_id = v_uid
      and created_at > now() - interval '1 minute';
    if v_recent >= v_per_minute_cap then
      raise exception 'analytics rate limit exceeded' using errcode = '22023';
    end if;
  else
    v_first_session := coalesce(p_events->0->>'session_id', 'unknown');
    select count(*) into v_recent
    from public.analytics_events
    where user_id is null
      and session_id = v_first_session
      and created_at > now() - interval '1 minute';
    if v_recent >= v_per_minute_cap then
      raise exception 'analytics rate limit exceeded' using errcode = '22023';
    end if;
  end if;

  for v_item in select value from jsonb_array_elements(p_events) loop
    exit when v_count >= v_batch_cap;

    if octet_length(coalesce(v_item::text, '')) > v_payload_bytes_cap then
      continue;
    end if;

    v_session_id := coalesce(v_item->>'session_id', 'unknown');
    v_event_name := left(coalesce(v_item->>'event_name', 'unknown'), 64);

    if v_event_name !~ '^[a-z0-9_]+$' then
      continue;
    end if;

    insert into public.analytics_events (
      session_id,
      user_id,
      event_name,
      client_ts,
      payload
    ) values (
      v_session_id,
      v_uid,
      v_event_name,
      case
        when (v_item ? 'client_ts') then (v_item->>'client_ts')::timestamptz
        else null
      end,
      coalesce(v_item->'payload', '{}'::jsonb)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'inserted', v_count);
end;
$$;

revoke all on function public.log_analytics_events(jsonb) from public;
grant execute on function public.log_analytics_events(jsonb) to anon, authenticated;

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
  coalesce((payload->>'duration_seconds')::numeric, 0) as duration_seconds,
  coalesce(payload->>'death_reason', 'unknown') as death_reason,
  coalesce((payload->>'captures')::int, 0) as captures,
  coalesce((payload->>'captures_easy')::int, 0) as captures_easy,
  coalesce((payload->>'captures_medium')::int, 0) as captures_medium,
  coalesce((payload->>'captures_hard')::int, 0) as captures_hard,
  coalesce((payload->>'captures_gold')::int, 0) as captures_gold,
  coalesce((payload->>'gold_captures')::int, 0) as gold_captures,
  coalesce((payload->>'powerups_collected')::int, 0) as powerups_collected,
  coalesce((payload->>'best_combo_run')::int, 0) as best_combo_run,
  coalesce((payload->>'pause_count')::int, 0) as pause_count,
  coalesce((payload->>'tutorial_step')::int, 0) as tutorial_step,
  coalesce((payload->>'new_record')::boolean, false) as new_record,
  payload->>'selected_skin' as selected_skin,
  payload->>'selected_bg' as selected_bg
from public.analytics_events
where event_name = 'game_over';

create or replace view public.analytics_daily_funnel_v1 as
with per_session as (
  select
    coalesce((client_ts at time zone 'utc')::date, created_at::date) as event_day,
    session_id,
    bool_or(event_name = 'app_open') as opened,
    bool_or(event_name = 'game_start') as started,
    bool_or(event_name = 'first_release') as first_release,
    bool_or(event_name = 'game_over') as finished
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

create or replace view public.analytics_source_daily_v1 as
select
  event_day,
  mode,
  source,
  count(*) as runs,
  round(avg(score)::numeric, 2) as avg_score,
  round(avg(duration_seconds)::numeric, 2) as avg_duration_seconds,
  round(percentile_cont(0.5) within group (order by score)::numeric, 2) as median_score,
  round(100.0 * avg(case when new_record then 1 else 0 end)::numeric, 2) as new_record_rate_pct
from public.analytics_run_end_v1
group by event_day, mode, source
order by event_day desc, runs desc;

create or replace view public.analytics_powerups_daily_v1 as
select
  coalesce((client_ts at time zone 'utc')::date, created_at::date) as event_day,
  coalesce(payload->>'type', 'unknown') as powerup_type,
  count(*) as picks,
  round(avg(coalesce((payload->>'score')::numeric, 0)), 2) as avg_score_at_pick,
  round(avg(coalesce((payload->>'phase')::numeric, 1)), 2) as avg_phase_at_pick
from public.analytics_events
where event_name = 'powerup_collected'
group by event_day, powerup_type
order by event_day desc, picks desc;

create or replace view public.analytics_phase_daily_v1 as
select
  coalesce((client_ts at time zone 'utc')::date, created_at::date) as event_day,
  coalesce((payload->>'phase_reached')::int, (payload->>'phase')::int, 1) as phase_reached,
  count(*) as hits,
  count(distinct coalesce(payload->>'client_run_id', payload->>'run_id', session_id)) as distinct_runs,
  round(avg(coalesce((payload->>'score')::numeric, 0)), 2) as avg_score_when_reached
from public.analytics_events
where event_name = 'phase_reached'
group by event_day, phase_reached
order by event_day desc, phase_reached asc;

create or replace view public.analytics_branch_options_v1 as
select
  coalesce((client_ts at time zone 'utc')::date, created_at::date) as event_day,
  created_at,
  session_id,
  user_id,
  coalesce(payload->>'client_run_id', payload->>'run_id') as run_ref,
  coalesce(payload->>'mode', 'unknown') as mode,
  coalesce(payload->>'source', 'unknown') as source,
  coalesce((payload->>'phase')::int, 1) as phase,
  coalesce((payload->>'score')::int, 0) as score,
  coalesce((payload->>'branch_group_id')::int, -1) as branch_group_id,
  coalesce(payload->>'branch_layout_id', 'unknown') as branch_layout_id,
  coalesce((payload->>'option_count')::int, 0) as option_count,
  coalesce((payload->>'easy_count')::int, 0) as easy_count,
  coalesce((payload->>'medium_count')::int, 0) as medium_count,
  coalesce((payload->>'hard_count')::int, 0) as hard_count,
  coalesce((payload->>'gold_count')::int, 0) as gold_count,
  coalesce((payload->>'has_hard')::boolean, false) as has_hard,
  coalesce((payload->>'has_gold')::boolean, false) as has_gold,
  coalesce((payload->>'hazard_options')::int, 0) as hazard_options,
  coalesce((payload->>'min_distance')::numeric, 0) as min_distance,
  coalesce((payload->>'max_distance')::numeric, 0) as max_distance,
  coalesce((payload->>'distance_spread')::numeric, 0) as distance_spread,
  coalesce((payload->>'min_pair_gap')::numeric, 0) as min_pair_gap,
  coalesce((payload->>'max_pair_gap')::numeric, 0) as max_pair_gap,
  coalesce(payload->'options', '[]'::jsonb) as options
from public.analytics_events
where event_name = 'branch_options_presented';

create or replace view public.analytics_branch_choice_v1 as
select
  coalesce((client_ts at time zone 'utc')::date, created_at::date) as event_day,
  created_at,
  session_id,
  user_id,
  coalesce(payload->>'client_run_id', payload->>'run_id') as run_ref,
  coalesce(payload->>'mode', 'unknown') as mode,
  coalesce(payload->>'source', 'unknown') as source,
  coalesce((payload->>'phase')::int, 1) as phase,
  coalesce((payload->>'phase_before')::int, (payload->>'phase')::int, 1) as phase_before,
  coalesce((payload->>'phase_after')::int, (payload->>'phase')::int, 1) as phase_after,
  coalesce((payload->>'score')::int, 0) as score,
  coalesce((payload->>'score_before')::int, 0) as score_before,
  coalesce((payload->>'score_after')::int, 0) as score_after,
  coalesce((payload->>'branch_group_id')::int, -1) as branch_group_id,
  coalesce(payload->>'branch_layout_id', 'unknown') as branch_layout_id,
  coalesce((payload->>'option_count')::int, 0) as option_count,
  coalesce((payload->>'easy_count')::int, 0) as easy_count,
  coalesce((payload->>'medium_count')::int, 0) as medium_count,
  coalesce((payload->>'hard_count')::int, 0) as hard_count,
  coalesce((payload->>'gold_count')::int, 0) as gold_count,
  coalesce((payload->>'hazard_options')::int, 0) as hazard_options,
  coalesce(payload->>'selected_tier', 'unknown') as selected_tier,
  coalesce((payload->>'selected_points')::int, 0) as selected_points,
  coalesce((payload->>'selected_distance')::numeric, 0) as selected_distance,
  coalesce((payload->>'selected_angle_offset')::numeric, 0) as selected_angle_offset,
  coalesce((payload->>'selected_rank_by_risk')::int, 0) as selected_rank_by_risk,
  coalesce((payload->>'selected_rank_by_distance')::int, 0) as selected_rank_by_distance,
  coalesce((payload->>'selected_distance_delta_to_safest')::numeric, 0) as selected_distance_delta_to_safest,
  coalesce((payload->>'safest_option_distance')::numeric, 0) as safest_option_distance,
  coalesce((payload->>'farthest_option_distance')::numeric, 0) as farthest_option_distance,
  coalesce((payload->>'selected_is_highest_risk')::boolean, false) as selected_is_highest_risk,
  coalesce((payload->>'selected_is_farthest')::boolean, false) as selected_is_farthest,
  coalesce((payload->>'selected_has_hazard')::boolean, false) as selected_has_hazard,
  coalesce((payload->>'selected_moving')::boolean, false) as selected_moving,
  coalesce((payload->>'selected_disappearing')::boolean, false) as selected_disappearing,
  coalesce((payload->>'selected_teleporting')::boolean, false) as selected_teleporting,
  coalesce((payload->>'min_pair_gap')::numeric, 0) as min_pair_gap,
  coalesce((payload->>'max_pair_gap')::numeric, 0) as max_pair_gap,
  coalesce(payload->'options', '[]'::jsonb) as options
from public.analytics_events
where event_name = 'branch_choice_made';

create or replace view public.analytics_run_features_v1 as
with choice_agg as (
  select
    run_ref,
    user_id,
    count(*) as branch_choices,
    round(avg(option_count)::numeric, 2) as avg_option_count,
    round(avg(selected_distance)::numeric, 2) as avg_selected_distance,
    round(avg(selected_distance_delta_to_safest)::numeric, 2) as avg_selected_distance_delta_to_safest,
    round(avg(selected_rank_by_risk)::numeric, 2) as avg_selected_risk_rank,
    round(avg(selected_rank_by_distance)::numeric, 2) as avg_selected_distance_rank,
    round(avg(case when selected_tier = 'easy' then 1 else 0 end)::numeric, 4) as easy_choice_rate,
    round(avg(case when selected_tier = 'medium' then 1 else 0 end)::numeric, 4) as medium_choice_rate,
    round(avg(case when selected_tier = 'hard' then 1 else 0 end)::numeric, 4) as hard_choice_rate,
    round(avg(case when selected_tier = 'gold' then 1 else 0 end)::numeric, 4) as gold_choice_rate,
    round(avg(case when selected_is_highest_risk then 1 else 0 end)::numeric, 4) as highest_risk_choice_rate,
    round(avg(case when selected_is_farthest then 1 else 0 end)::numeric, 4) as farthest_choice_rate,
    round(avg(case when selected_has_hazard then 1 else 0 end)::numeric, 4) as hazard_choice_rate
  from public.analytics_branch_choice_v1
  group by run_ref, user_id
),
offer_agg as (
  select
    run_ref,
    user_id,
    count(*) as branch_sets_seen,
    round(avg(option_count)::numeric, 2) as avg_options_presented,
    round(avg(case when has_hard then 1 else 0 end)::numeric, 4) as hard_offer_rate,
    round(avg(case when has_gold then 1 else 0 end)::numeric, 4) as gold_offer_rate,
    round(avg(hazard_options)::numeric, 2) as avg_hazard_options,
    round(avg(distance_spread)::numeric, 2) as avg_distance_spread,
    round(avg(min_pair_gap)::numeric, 2) as avg_min_pair_gap
  from public.analytics_branch_options_v1
  group by run_ref, user_id
),
checkpoint_agg as (
  select
    coalesce(payload->>'client_run_id', payload->>'run_id') as run_ref,
    user_id,
    count(*) as progress_checkpoints,
    max(coalesce((payload->>'phase')::int, 1)) as max_checkpoint_phase,
    max(coalesce((payload->>'captures')::int, 0)) as max_checkpoint_captures,
    max(coalesce((payload->>'powerups')::int, 0)) as max_checkpoint_powerups
  from public.analytics_events
  where event_name = 'run_progress_checkpoint'
  group by 1, 2
),
mutator_agg as (
  select
    coalesce(payload->>'client_run_id', payload->>'run_id') as run_ref,
    user_id,
    count(*) as mutator_activations,
    count(distinct coalesce(payload->>'mutator_id', 'unknown')) as distinct_mutators
  from public.analytics_events
  where event_name = 'run_mutator_activated'
  group by 1, 2
)
select
  re.*,
  coalesce(off.branch_sets_seen, 0) as branch_sets_seen,
  coalesce(choice.branch_choices, 0) as branch_choices,
  coalesce(off.avg_options_presented, 0) as avg_options_presented,
  coalesce(off.hard_offer_rate, 0) as hard_offer_rate,
  coalesce(off.gold_offer_rate, 0) as gold_offer_rate,
  coalesce(off.avg_hazard_options, 0) as avg_hazard_options,
  coalesce(off.avg_distance_spread, 0) as avg_distance_spread,
  coalesce(off.avg_min_pair_gap, 0) as avg_min_pair_gap,
  coalesce(choice.avg_selected_distance, 0) as avg_selected_distance,
  coalesce(choice.avg_selected_distance_delta_to_safest, 0) as avg_selected_distance_delta_to_safest,
  coalesce(choice.avg_selected_risk_rank, 0) as avg_selected_risk_rank,
  coalesce(choice.avg_selected_distance_rank, 0) as avg_selected_distance_rank,
  coalesce(choice.easy_choice_rate, 0) as easy_choice_rate,
  coalesce(choice.medium_choice_rate, 0) as medium_choice_rate,
  coalesce(choice.hard_choice_rate, 0) as hard_choice_rate,
  coalesce(choice.gold_choice_rate, 0) as gold_choice_rate,
  coalesce(choice.highest_risk_choice_rate, 0) as highest_risk_choice_rate,
  coalesce(choice.farthest_choice_rate, 0) as farthest_choice_rate,
  coalesce(choice.hazard_choice_rate, 0) as hazard_choice_rate,
  coalesce(chk.progress_checkpoints, 0) as progress_checkpoints,
  coalesce(chk.max_checkpoint_phase, 0) as max_checkpoint_phase,
  coalesce(chk.max_checkpoint_captures, 0) as max_checkpoint_captures,
  coalesce(chk.max_checkpoint_powerups, 0) as max_checkpoint_powerups,
  coalesce(mut.mutator_activations, 0) as mutator_activations,
  coalesce(mut.distinct_mutators, 0) as distinct_mutators,
  round((case when re.duration_seconds > 0 then re.score::numeric / re.duration_seconds else null end), 2) as score_per_second,
  round((case when re.captures > 0 then re.score::numeric / re.captures else null end), 2) as score_per_capture,
  round((case when re.duration_seconds > 0 then re.captures::numeric / re.duration_seconds else null end), 3) as captures_per_second,
  (re.score < 20) as failed_very_early,
  (re.phase >= 4) as reached_advanced_phase
from public.analytics_run_end_v1 re
left join choice_agg choice
  on choice.run_ref = re.run_ref
 and choice.user_id is not distinct from re.user_id
left join offer_agg off
  on off.run_ref = re.run_ref
 and off.user_id is not distinct from re.user_id
left join checkpoint_agg chk
  on chk.run_ref = re.run_ref
 and chk.user_id is not distinct from re.user_id
left join mutator_agg mut
  on mut.run_ref = re.run_ref
 and mut.user_id is not distinct from re.user_id;

create or replace view public.analytics_player_features_daily_v1 as
select
  event_day,
  coalesce(user_id::text, 'anon:' || session_id) as actor_key,
  user_id,
  mode,
  count(*) as runs,
  round(avg(score)::numeric, 2) as avg_score,
  round(avg(duration_seconds)::numeric, 2) as avg_duration_seconds,
  round(avg(score_per_second)::numeric, 2) as avg_score_per_second,
  round(avg(score_per_capture)::numeric, 2) as avg_score_per_capture,
  round(avg(branch_sets_seen)::numeric, 2) as avg_branch_sets_seen,
  round(avg(branch_choices)::numeric, 2) as avg_branch_choices,
  round(avg(avg_options_presented)::numeric, 2) as avg_options_presented,
  round(avg(gold_offer_rate)::numeric, 4) as avg_gold_offer_rate,
  round(avg(hard_offer_rate)::numeric, 4) as avg_hard_offer_rate,
  round(avg(gold_choice_rate)::numeric, 4) as avg_gold_choice_rate,
  round(avg(hard_choice_rate)::numeric, 4) as avg_hard_choice_rate,
  round(avg(highest_risk_choice_rate)::numeric, 4) as avg_highest_risk_choice_rate,
  round(avg(hazard_choice_rate)::numeric, 4) as avg_hazard_choice_rate,
  round(avg(progress_checkpoints)::numeric, 2) as avg_progress_checkpoints,
  round(avg(mutator_activations)::numeric, 2) as avg_mutator_activations,
  round(avg(case when death_reason = 'asteroid' then 1 else 0 end)::numeric, 4) as asteroid_death_rate,
  round(avg(case when failed_very_early then 1 else 0 end)::numeric, 4) as very_early_fail_rate,
  round(avg(case when new_record then 1 else 0 end)::numeric, 4) as new_record_rate,
  max(score) as best_score,
  max(phase) as best_phase
from public.analytics_run_features_v1
group by event_day, coalesce(user_id::text, 'anon:' || session_id), user_id, mode
order by event_day desc, runs desc;

create or replace function public.get_player_ml_profile(p_days integer default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_days integer := greatest(3, least(coalesce(p_days, 14), 90));
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  return (
    with recent as (
      select *
      from public.analytics_run_features_v1
      where user_id = v_uid
        and event_day >= current_date - (v_days - 1)
    ),
    summary as (
      select
        count(*) as runs,
        coalesce(round(avg(score)::numeric, 2), 0) as avg_score,
        coalesce(round(avg(duration_seconds)::numeric, 2), 0) as avg_duration_seconds,
        coalesce(round(avg(score_per_second)::numeric, 2), 0) as avg_score_per_second,
        coalesce(round(avg(gold_choice_rate)::numeric, 4), 0) as avg_gold_choice_rate,
        coalesce(round(avg(hard_choice_rate)::numeric, 4), 0) as avg_hard_choice_rate,
        coalesce(round(avg(highest_risk_choice_rate)::numeric, 4), 0) as avg_highest_risk_choice_rate,
        coalesce(round(avg(gold_offer_rate)::numeric, 4), 0) as avg_gold_offer_rate,
        coalesce(round(avg(hard_offer_rate)::numeric, 4), 0) as avg_hard_offer_rate,
        coalesce(round(avg(avg_selected_distance_delta_to_safest)::numeric, 2), 0) as avg_selected_distance_delta_to_safest,
        coalesce(round(avg(progress_checkpoints)::numeric, 2), 0) as avg_progress_checkpoints,
        coalesce(round(avg(case when death_reason = 'asteroid' then 1 else 0 end)::numeric, 4), 0) as asteroid_death_rate,
        coalesce(round(avg(case when failed_very_early then 1 else 0 end)::numeric, 4), 0) as very_early_fail_rate,
        coalesce(round(avg(case when new_record then 1 else 0 end)::numeric, 4), 0) as new_record_rate,
        coalesce(max(score), 0) as best_score,
        coalesce(max(phase), 0) as best_phase,
        case
          when coalesce(avg(gold_choice_rate), 0) >= 0.15 or coalesce(avg(highest_risk_choice_rate), 0) >= 0.35 then 'aggressive'
          when coalesce(avg(easy_choice_rate), 0) >= 0.55 and coalesce(avg(case when failed_very_early then 1 else 0 end), 0) <= 0.25 then 'safe'
          else 'balanced'
        end as risk_profile,
        case
          when coalesce(avg(case when failed_very_early then 1 else 0 end), 0) >= 0.40 then 'fragile'
          when coalesce(avg(case when new_record then 1 else 0 end), 0) >= 0.20 then 'improving'
          else 'stable'
        end as stability_profile
      from recent
    ),
    recent_rows as (
      select *
      from recent
      order by created_at desc
      limit 10
    )
    select jsonb_build_object(
      'ok', true,
      'window_days', v_days,
      'summary', jsonb_build_object(
        'runs', summary.runs,
        'avg_score', summary.avg_score,
        'avg_duration_seconds', summary.avg_duration_seconds,
        'avg_score_per_second', summary.avg_score_per_second,
        'avg_gold_choice_rate', summary.avg_gold_choice_rate,
        'avg_hard_choice_rate', summary.avg_hard_choice_rate,
        'avg_highest_risk_choice_rate', summary.avg_highest_risk_choice_rate,
        'avg_gold_offer_rate', summary.avg_gold_offer_rate,
        'avg_hard_offer_rate', summary.avg_hard_offer_rate,
        'avg_selected_distance_delta_to_safest', summary.avg_selected_distance_delta_to_safest,
        'avg_progress_checkpoints', summary.avg_progress_checkpoints,
        'asteroid_death_rate', summary.asteroid_death_rate,
        'very_early_fail_rate', summary.very_early_fail_rate,
        'new_record_rate', summary.new_record_rate,
        'best_score', summary.best_score,
        'best_phase', summary.best_phase,
        'risk_profile', summary.risk_profile,
        'stability_profile', summary.stability_profile
      ),
      'recent_runs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'event_day', event_day,
          'score', score,
          'phase', phase,
          'death_reason', death_reason,
          'duration_seconds', duration_seconds,
          'gold_choice_rate', gold_choice_rate,
          'hard_choice_rate', hard_choice_rate,
          'highest_risk_choice_rate', highest_risk_choice_rate
        ) order by created_at desc)
        from recent_rows
      ), '[]'::jsonb)
    )
    from summary
  );
end;
$$;

revoke all on function public.get_player_ml_profile(integer) from public;
grant execute on function public.get_player_ml_profile(integer) to authenticated;

commit;
