-- Integrasi seeded BILIBILI 162 CUP I dengan master atlet PB BILIBILI 162.
-- Sumber kebenaran partisipasi: public.pendaftaran_turnamen (tournament_id = 2).
-- Sumber data seeded: public.seeded_players (tournament_id = 2).
-- View sengaja mempertahankan seluruh atlet pendaftaran; data seeded hanya ditempelkan
-- jika atlet tercatat sebagai peserta turnamen, dengan padanan nama yang aman untuk
-- perbedaan penulisan yang sudah teridentifikasi pada data turnamen.

create or replace view public.v_bilibili_162_cup1_athlete_seeded as
with p as (
  select id,nama,
    regexp_replace(lower(trim(nama)),'[^a-z0-9]','','g') as name_key
  from public.pendaftaran
),
r0 as (
  select id,kode_pendaftaran,nama_pemain_1,nama_pemain_2,kategori,
    regexp_replace(lower(trim(nama_pemain_1)),'[^a-z0-9]','','g') as p1_key,
    regexp_replace(lower(trim(nama_pemain_2)),'[^a-z0-9]','','g') as p2_key
  from public.pendaftaran_turnamen
  where tournament_id=2
    and status_pendaftaran='Diterima'
    and replace(replace(replace(upper(coalesce(asal_pb,'')),'.',''),'-',''),' ','') like '%BILIBILI162%'
),
r as (
  select p1_key as name_key,id,kode_pendaftaran,nama_pemain_2 as partner,kategori from r0
  union all
  select p2_key as name_key,id,kode_pendaftaran,nama_pemain_1 as partner,kategori from r0
),
rg as (
  select name_key,
    count(*) as registration_count,
    array_agg(distinct partner order by partner) as partners,
    array_agg(distinct kode_pendaftaran order by kode_pendaftaran) as registration_codes,
    array_agg(distinct kategori order by kategori) as categories
  from r group by name_key
),
seeded as (
  select sp.*,
    regexp_replace(lower(trim(sp.player_name)),'[^a-z0-9]','','g') as seed_key
  from public.seeded_players sp
  where sp.tournament_id=2
),
joined as (
  select p.id as pendaftaran_id,p.nama,
    rg.registration_count,rg.partners,rg.registration_codes,rg.categories,
    case
      when p.name_key='amansur' then 'amanzur'
      when p.name_key='abdkadir' then 'kadir'
      when p.name_key='haaarwan' then 'aarwan'
      when p.name_key='ustsyawal' then 'syawal'
      when p.name_key='drzainuddin' then 'zainuddin'
      when p.name_key='asiztaba' then 'azistaba'
      when p.name_key='luthfi' then 'lutfhi'
      else p.name_key
    end as seed_match_key
  from p left join rg on rg.name_key=p.name_key
)
select j.pendaftaran_id,j.nama,
  2::bigint as tournament_id,
  'BILIBILI 162 CUP I TAHUN 2026'::text as tournament_name,
  '08–12 September 2026'::text as tournament_period,
  'GOR Titik Kumpul Soreang'::text as venue,
  (j.registration_count is not null) as participated,
  coalesce(j.registration_count,0)::integer as registration_count,
  j.partners,j.registration_codes,j.categories as registration_categories,
  s.id as seeded_player_id,
  s.player_name as seeded_player_name,
  s.club_name as seeded_club_name,
  s.seeded_quality,
  s.division_level,
  s.tournament_qualification,
  s.region_status,
  s.validity_status,
  s.source_sheet,
  s.source_no,
  (j.registration_count is not null and s.id is not null) as is_seeded
from joined j
left join lateral (
  select s.*
  from seeded s
  where j.registration_count is not null and s.seed_key=j.seed_match_key
  order by
    case when replace(replace(replace(upper(coalesce(s.club_name,'')),'.',''),'-',''),' ','') like '%BILIBILI162%' then 0 else 1 end,
    case when s.source_no is null then 1 else 0 end,
    s.source_no nulls last,
    s.id
  limit 1
) s on true;
