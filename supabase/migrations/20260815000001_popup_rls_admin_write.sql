-- Allow the authenticated PB Bilibili 162 admin to manage popup rows.
-- The website can read popup rows publicly, while writes require an admin role
-- in immutable Supabase app_metadata.

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

alter table public.konfigurasi_popup enable row level security;

drop policy if exists "pb162_konfigurasi_popup_public_read" on public.konfigurasi_popup;
create policy "pb162_konfigurasi_popup_public_read"
  on public.konfigurasi_popup
  for select
  to anon, authenticated
  using (true);

drop policy if exists "pb162_konfigurasi_popup_admin_write" on public.konfigurasi_popup;
create policy "pb162_konfigurasi_popup_admin_write"
  on public.konfigurasi_popup
  as restrictive
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
