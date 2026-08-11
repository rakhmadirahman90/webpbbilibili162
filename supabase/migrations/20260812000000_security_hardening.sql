-- Security hardening for PB Bilibili 162.
-- This migration is intentionally limited to the known site_settings table.
-- Other application tables should be reviewed individually because their ownership
-- and public/member access model must be preserved.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin', 'owner'),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

do $$
begin
  if to_regclass('public.site_settings') is not null then
    alter table public.site_settings enable row level security;

    -- Public website clients need to read site settings.
    drop policy if exists "pb162_site_settings_public_read" on public.site_settings;
    create policy "pb162_site_settings_public_read"
      on public.site_settings
      for select
      to anon, authenticated
      using (true);

    -- This restrictive policy protects writes even if an older permissive policy
    -- exists on the table. Only users with an admin role in app_metadata may write.
    drop policy if exists "pb162_site_settings_admin_write" on public.site_settings;
    create policy "pb162_site_settings_admin_write"
      on public.site_settings
      as restrictive
      for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end
$$;

comment on function public.is_admin() is
  'PB162 authorization helper. Reads only immutable Supabase app_metadata for admin authorization; never user_metadata.';
