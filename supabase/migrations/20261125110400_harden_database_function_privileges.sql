-- Tighten remaining database function privileges and search paths.
revoke execute on function public.create_ptcl_data_for_new_user() from public, anon, authenticated;
alter function public.update_updated_at() set search_path = public, pg_temp;
alter function public.update_updated_at_ptcl() set search_path = public, pg_temp;
