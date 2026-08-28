-- Seeded CRUD safety: normalized_name is maintained by the database,
-- but remains writable for compatibility with legacy clients.
-- The trigger always recalculates it from player_name.

do $$
begin
  if exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'seeded_players'
      and a.attname = 'normalized_name'
      and a.attgenerated = 's'
  ) then
    alter table public.seeded_players alter column normalized_name drop expression;
  end if;
end $$;

update public.seeded_players
set normalized_name = regexp_replace(lower(trim(player_name)), '[^a-z0-9]+', ' ', 'g')
where normalized_name is distinct from regexp_replace(lower(trim(player_name)), '[^a-z0-9]+', ' ', 'g');

create or replace function public.sync_seeded_normalized_name()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name := regexp_replace(lower(trim(coalesce(new.player_name, ''))), '[^a-z0-9]+', ' ', 'g');
  return new;
end;
$$;

drop trigger if exists trg_seeded_players_normalized_name on public.seeded_players;
create trigger trg_seeded_players_normalized_name
before insert or update of player_name on public.seeded_players
for each row execute function public.sync_seeded_normalized_name();
