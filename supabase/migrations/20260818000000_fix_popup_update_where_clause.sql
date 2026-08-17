-- Fix PB Bilibili 162 popup creation functions.
-- Root cause: pb162_popup_create contained an UPDATE without a WHERE clause,
-- which is rejected by the project's SQL safety guard and caused both
-- "Tambah Pop-up" and related save flows to fail with:
-- UPDATE requires a WHERE clause.

create or replace function public.pb162_popup_create(
  p_url_gambar text,
  p_judul text default null::text,
  p_deskripsi text default null::text,
  p_file_url text default null::text
)
returns public.konfigurasi_popup
language plpgsql
set search_path to 'public'
as $$
declare
  v_row public.konfigurasi_popup;
begin
  -- New popup becomes the first item. Explicit WHERE is required.
  update public.konfigurasi_popup
     set urutan = coalesce(urutan, 0) + 1
   where id is not null;

  insert into public.konfigurasi_popup
    (url_gambar, judul, deskripsi, file_url, is_active, urutan)
  values
    (p_url_gambar, p_judul, p_deskripsi, p_file_url, true, 0)
  returning * into v_row;

  return v_row;
end;
$$;

-- Older popup creation RPC had the same class of unsafe UPDATE.
create or replace function public.pb162_add_popup(
  p_judul text,
  p_deskripsi text,
  p_url_gambar text,
  p_file_url text default null::text
)
returns public.konfigurasi_popup
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.konfigurasi_popup;
begin
  insert into public.konfigurasi_popup
    (id, judul, deskripsi, url_gambar, file_url, is_active, urutan)
  values
    (gen_random_uuid(), nullif(trim(p_judul), ''), coalesce(p_deskripsi, ''),
     trim(p_url_gambar), nullif(trim(coalesce(p_file_url, '')), ''), true,
     coalesce((select max(urutan) + 1 from public.konfigurasi_popup), 0))
  returning * into v_row;

  update public.konfigurasi_popup
     set is_active = false
   where id <> v_row.id;

  update public.konfigurasi_popup
     set is_active = true
   where id = v_row.id;

  select * into v_row
    from public.konfigurasi_popup
   where id = v_row.id;

  return v_row;
end;
$$;
