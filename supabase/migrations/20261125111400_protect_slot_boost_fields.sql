create or replace function public.guard_user_profile_economy()
returns trigger language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  k text;
  protected_keys text[] := array[
    'lockedPotPP','withdrawablePP','totalEarnedPP','ppEarnedToday',
    'spinsRemaining','freeSpinsClaimed','withdrawalHistory','lastWithdraw',
    'slotHistory','totalSpins','spinsToday','jackpotWins','potAccelUntil','hotStreakUntil'
  ];
begin
  if current_user in ('postgres','service_role') then return new; end if;
  if tg_op = 'INSERT' then
    new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object(
      'lockedPotPP',0,'withdrawablePP',0,'totalEarnedPP',0,'ppEarnedToday',0,
      'spinsRemaining',5,'freeSpinsClaimed',false,'withdrawalHistory','[]'::jsonb,
      'lastWithdraw',null,'slotHistory','[]'::jsonb,'totalSpins',0,'spinsToday',0,'jackpotWins',0,
      'potAccelUntil',null,'hotStreakUntil',null
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
