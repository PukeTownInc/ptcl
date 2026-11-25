update public.user_profiles
set data = jsonb_set(
  jsonb_set(data,'{potAccelUntil}','null'::jsonb,true),
  '{hotStreakUntil}','null'::jsonb,true
)
where coalesce(data->>'potAccelUntil','null') <> 'null'
   or coalesce(data->>'hotStreakUntil','null') <> 'null';
