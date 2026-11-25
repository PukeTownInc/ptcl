-- Protect redeemable player balances and provide atomic server-only Cash Lab settlement.
create table if not exists public.cash_lab_spin_requests (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  response jsonb,
  created_at timestamptz not null default now()
);
alter table public.cash_lab_spin_requests enable row level security;
revoke all on public.cash_lab_spin_requests from anon, authenticated;
grant all on public.cash_lab_spin_requests to service_role;

create or replace function public.guard_user_profile_economy()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  k text;
  protected_keys text[] := array[
    'lockedPotPP','withdrawablePP','totalEarnedPP','ppEarnedToday',
    'spinsRemaining','freeSpinsClaimed','withdrawalHistory','lastWithdraw',
    'slotHistory','totalSpins','spinsToday','jackpotWins'
  ];
begin
  if current_user in ('postgres','service_role') then return new; end if;
  if tg_op = 'INSERT' then
    new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object(
      'lockedPotPP',0,'withdrawablePP',0,'totalEarnedPP',0,'ppEarnedToday',0,
      'spinsRemaining',5,'freeSpinsClaimed',false,'withdrawalHistory','[]'::jsonb,
      'lastWithdraw',null,'slotHistory','[]'::jsonb,'totalSpins',0,'spinsToday',0,'jackpotWins',0
    );
    return new;
  end if;
  foreach k in array protected_keys loop
    if coalesce(old.data->k,'null'::jsonb) is distinct from coalesce(new.data->k,'null'::jsonb) then
      raise exception 'Protected player economy fields can only be changed by a trusted server action'
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.guard_user_profile_economy() from public, anon, authenticated;
drop trigger if exists guard_user_profile_economy on public.user_profiles;
create trigger guard_user_profile_economy
before insert or update of data on public.user_profiles
for each row execute function public.guard_user_profile_economy();

create or replace function public.settle_cash_lab_spin(
  p_user_id uuid,p_request_id uuid,p_bet_pp integer,p_base_payout_pp bigint,p_result jsonb,p_history jsonb
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_data jsonb; v_response jsonb; v_locked bigint; v_spins integer;
  v_use_free boolean; v_final_payout bigint; v_after_stake bigint;
  v_multiplier numeric := 1; v_history jsonb;
  v_now_ms bigint := floor(extract(epoch from clock_timestamp())*1000);
begin
  if p_user_id is null or p_request_id is null or p_bet_pp not between 1 and 1000
     or p_base_payout_pp not between 0 and 10000000
     or jsonb_typeof(p_result)<>'object' or jsonb_typeof(p_history)<>'object' then
    raise exception 'Invalid spin request' using errcode='22023';
  end if;
  insert into public.cash_lab_spin_requests(request_id,user_id) values(p_request_id,p_user_id)
  on conflict(request_id) do nothing;
  if not found then
    select response into v_response from public.cash_lab_spin_requests
    where request_id=p_request_id and user_id=p_user_id;
    if v_response is null then raise exception 'Request id already used' using errcode='23505'; end if;
    return v_response;
  end if;
  select data into v_data from public.user_profiles where id=p_user_id for update;
  if not found then raise exception 'Player profile not found' using errcode='P0002'; end if;
  v_locked := greatest(0,coalesce((v_data->>'lockedPotPP')::bigint,0));
  v_spins := greatest(0,coalesce((v_data->>'spinsRemaining')::integer,0));
  v_use_free := v_spins>0;
  if not v_use_free and v_locked<p_bet_pp then raise exception 'Insufficient Puke Points' using errcode='P0001'; end if;
  if coalesce((v_data->>'potAccelUntil')::bigint,0)>v_now_ms then v_multiplier:=v_multiplier*2; end if;
  if coalesce((v_data->>'hotStreakUntil')::bigint,0)>v_now_ms then v_multiplier:=v_multiplier*1.5; end if;
  v_final_payout:=floor(p_base_payout_pp*v_multiplier);
  v_after_stake:=greatest(0,v_locked-case when v_use_free then 0 else p_bet_pp end);
  v_history:=jsonb_set(p_history,'{pp}',to_jsonb(v_final_payout),true);
  v_data:=jsonb_set(v_data,'{lockedPotPP}',to_jsonb(least(500000,v_after_stake+v_final_payout)),true);
  v_data:=jsonb_set(v_data,'{totalEarnedPP}',to_jsonb(coalesce((v_data->>'totalEarnedPP')::bigint,0)+v_final_payout),true);
  v_data:=jsonb_set(v_data,'{ppEarnedToday}',to_jsonb(coalesce((v_data->>'ppEarnedToday')::bigint,0)+v_final_payout),true);
  v_data:=jsonb_set(v_data,'{spinsRemaining}',to_jsonb(greatest(0,v_spins-case when v_use_free then 1 else 0 end)+greatest(0,coalesce((p_result->>'freeSpinsAwarded')::integer,0))),true);
  v_data:=jsonb_set(v_data,'{spinsToday}',to_jsonb(coalesce((v_data->>'spinsToday')::integer,0)+1),true);
  v_data:=jsonb_set(v_data,'{totalSpins}',to_jsonb(coalesce((v_data->>'totalSpins')::integer,0)+1),true);
  v_data:=jsonb_set(v_data,'{xp}',to_jsonb(coalesce((v_data->>'xp')::integer,0)+1),true);
  v_data:=jsonb_set(v_data,'{dailyXpFree}',to_jsonb(coalesce((v_data->>'dailyXpFree')::integer,0)+1),true);
  v_data:=jsonb_set(v_data,'{missions,spins}',to_jsonb(coalesce((v_data#>>'{missions,spins}')::integer,0)+1),true);
  if p_result->'jackpot' is not null and p_result->'jackpot'<>'null'::jsonb then
    v_data:=jsonb_set(v_data,'{jackpotWins}',to_jsonb(coalesce((v_data->>'jackpotWins')::integer,0)+1),true);
  end if;
  v_data:=jsonb_set(v_data,'{slotHistory}',jsonb_build_array(v_history)||coalesce(v_data->'slotHistory','[]'::jsonb),true);
  v_data:=jsonb_set(v_data,'{doubleUpPending}','null'::jsonb,true);
  update public.user_profiles set data=v_data,last_synced=now() where id=p_user_id;
  v_response:=p_result||jsonb_build_object('payoutPP',v_final_payout,'usedFreeSpin',v_use_free,
    'lockedPotPP',v_data->'lockedPotPP','spinsRemaining',v_data->'spinsRemaining','slotHistoryEntry',v_history);
  update public.cash_lab_spin_requests set response=v_response where request_id=p_request_id;
  return v_response;
end;
$$;
revoke all on function public.settle_cash_lab_spin(uuid,uuid,integer,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.settle_cash_lab_spin(uuid,uuid,integer,bigint,jsonb,jsonb) to service_role;

-- The current PWA uses user_profiles; lock down the unused legacy balance table.
drop policy if exists "Users access own data" on public.ptcl_user_data;
drop policy if exists "Users can insert their own row" on public.ptcl_user_data;
drop policy if exists "Users can read their own data" on public.ptcl_user_data;
drop policy if exists "Users can update their own data" on public.ptcl_user_data;
create policy "Authenticated users can read own legacy data" on public.ptcl_user_data
for select to authenticated using(id=(select auth.uid()));
revoke insert,update,delete on public.ptcl_user_data from anon,authenticated;
grant select on public.ptcl_user_data to authenticated;
