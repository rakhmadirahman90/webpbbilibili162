-- Flexible per-event tournament category configuration.
-- Applied to Supabase production as migration: tournament_category_management

create table if not exists public.tournament_categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id bigint not null references public.seeded_tournaments(id) on delete cascade,
  code text not null,
  name text not null,
  short_name text,
  event_type text not null default 'Ganda',
  gender text not null default 'Putra',
  age_group text,
  skill_class text,
  seeded_mode text not null default 'open',
  allowed_seeded_levels text[] not null default '{}',
  seeded_pair_rules jsonb not null default '[]'::jsonb,
  max_entries integer not null default 32,
  entry_fee numeric not null default 0,
  prize_pool numeric not null default 0,
  match_format text not null default 'Best of 3 x 21 poin',
  best_of integer not null default 3,
  points_per_game integer not null default 21,
  registration_open boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_categories_code_key unique (tournament_id, code),
  constraint tournament_categories_name_key unique (tournament_id, name),
  constraint tournament_categories_event_type_check check (event_type in ('Tunggal','Ganda','Beregu','Campuran','Lainnya')),
  constraint tournament_categories_gender_check check (gender in ('Putra','Putri','Campuran','Terbuka')),
  constraint tournament_categories_seeded_mode_check check (seeded_mode in ('open','single','pair')),
  constraint tournament_categories_max_entries_check check (max_entries > 0),
  constraint tournament_categories_entry_fee_check check (entry_fee >= 0),
  constraint tournament_categories_prize_pool_check check (prize_pool >= 0),
  constraint tournament_categories_best_of_check check (best_of in (1,3,5)),
  constraint tournament_categories_points_check check (points_per_game > 0)
);

create index if not exists idx_tournament_categories_tournament on public.tournament_categories(tournament_id, is_active, sort_order);

alter table public.pendaftaran_turnamen add column if not exists tournament_category_id uuid references public.tournament_categories(id) on delete set null;
create index if not exists idx_pendaftaran_turnamen_category on public.pendaftaran_turnamen(tournament_category_id);

alter table public.tournament_categories enable row level security;
drop policy if exists "public can read active tournament categories" on public.tournament_categories;
create policy "public can read active tournament categories" on public.tournament_categories for select to anon using (is_active = true and registration_open = true);
drop policy if exists "authenticated can read tournament categories" on public.tournament_categories;
create policy "authenticated can read tournament categories" on public.tournament_categories for select to authenticated using (true);
drop policy if exists "authenticated can insert tournament categories" on public.tournament_categories;
create policy "authenticated can insert tournament categories" on public.tournament_categories for insert to authenticated with check (true);
drop policy if exists "authenticated can update tournament categories" on public.tournament_categories;
create policy "authenticated can update tournament categories" on public.tournament_categories for update to authenticated using (true) with check (true);
drop policy if exists "authenticated can delete tournament categories" on public.tournament_categories;
create policy "authenticated can delete tournament categories" on public.tournament_categories for delete to authenticated using (true);

create or replace function public.set_tournament_categories_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists trg_tournament_categories_updated_at on public.tournament_categories;
create trigger trg_tournament_categories_updated_at before update on public.tournament_categories for each row execute function public.set_tournament_categories_updated_at();

insert into public.tournament_categories (tournament_id,code,name,short_name,event_type,gender,age_group,skill_class,seeded_mode,allowed_seeded_levels,seeded_pair_rules,max_entries,entry_fee,match_format,best_of,points_per_game,registration_open,is_active,sort_order,description)
select 2,'AD-BC-C-C-AJATAPPARENG','Ganda Putra AD/BC-/C+C Ajatappareng','AD/BC-/C+C Ajatappareng','Ganda','Putra','Dewasa','A/B/C+/C-/C/D','pair',array['A','B','C+','C-','C','D'],'[{"level1":"A","level2":"D"},{"level1":"B","level2":"C-"},{"level1":"B","level2":"D"},{"level1":"C+","level2":"C"},{"level1":"C+","level2":"C-"},{"level1":"C","level2":"C"},{"level1":"C","level2":"D"}]'::jsonb,64,150000,'Best of 3 x 21 poin',3,21,false,false,10,'Kategori historis Bilibili 162 Cup I 2026 dengan kombinasi seeded yang telah digunakan.'
where not exists (select 1 from public.tournament_categories where tournament_id=2 and code='AD-BC-C-C-AJATAPPARENG');

insert into public.tournament_categories (tournament_id,code,name,short_name,event_type,gender,age_group,skill_class,seeded_mode,allowed_seeded_levels,seeded_pair_rules,max_entries,entry_fee,match_format,best_of,points_per_game,registration_open,is_active,sort_order,description)
select 2,'CC-LOKAL-PAREPARE','Ganda Putra CC Lokal Parepare','CC Lokal Parepare','Ganda','Putra','Dewasa','C-/D','pair',array['C-','D'],'[{"level1":"C-","level2":"C-"},{"level1":"C-","level2":"D"},{"level1":"D","level2":"D"}]'::jsonb,128,150000,'Best of 3 x 21 poin',3,21,false,false,20,'Kategori historis Bilibili 162 Cup I 2026 khusus seeded C-/D wilayah Parepare.'
where not exists (select 1 from public.tournament_categories where tournament_id=2 and code='CC-LOKAL-PAREPARE');
