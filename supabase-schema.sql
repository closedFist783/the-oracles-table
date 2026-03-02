-- Run this entire file in your Supabase project: Dashboard → SQL Editor → New Query → Paste → Run
-- Safe to re-run at any time — all statements are idempotent.

-- ── Profiles (auto-created on signup) ────────────────────────────────────────
create table if not exists profiles (
  id               uuid references auth.users on delete cascade primary key,
  coins            int  not null default 10,
  character_slots  int  not null default 1,
  created_at       timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "Users manage own profile" on profiles;
create policy "Users manage own profile" on profiles for all using (auth.uid() = id);

-- Auto-create profile row when user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Characters ────────────────────────────────────────────────────────────────
create table if not exists characters (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  name       text not null,
  race       text not null,
  class      text not null,
  level      int  not null default 1,
  str_stat   int  not null default 10,
  dex_stat   int  not null default 10,
  con_stat   int  not null default 10,
  int_stat   int  not null default 10,
  wis_stat   int  not null default 10,
  cha_stat   int  not null default 10,
  background text not null default '',
  backstory  text not null default '',
  created_at timestamptz default now()
);
alter table characters enable row level security;
drop policy if exists "Users manage own characters" on characters;
create policy "Users manage own characters" on characters for all using (auth.uid() = user_id);

-- ── Campaigns ─────────────────────────────────────────────────────────────────
create table if not exists campaigns (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users    on delete cascade not null,
  character_id   uuid references characters    on delete cascade not null,
  title          text not null default 'New Adventure',
  created_at     timestamptz default now(),
  last_played_at timestamptz default now()
);
alter table campaigns enable row level security;
drop policy if exists "Users manage own campaigns" on campaigns;
create policy "Users manage own campaigns" on campaigns for all using (auth.uid() = user_id);

-- ── Campaign Messages ─────────────────────────────────────────────────────────
create table if not exists campaign_messages (
  id          uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns on delete cascade not null,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  created_at  timestamptz default now()
);
alter table campaign_messages enable row level security;
drop policy if exists "Users manage own messages" on campaign_messages;
create policy "Users manage own messages" on campaign_messages for all
  using (auth.uid() = (select user_id from campaigns where id = campaign_id));

-- ── Campaign NPCs ─────────────────────────────────────────────────────────────
create table if not exists campaign_npcs (
  id           uuid default gen_random_uuid() primary key,
  campaign_id  uuid references campaigns on delete cascade not null,
  name         text not null,
  type         text not null default 'neutral' check (type in ('friend', 'foe', 'neutral')),
  description  text not null default '',
  known_info   text not null default '',
  first_seen   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table campaign_npcs enable row level security;
drop policy if exists "Users manage own npcs" on campaign_npcs;
create policy "Users manage own npcs" on campaign_npcs for all
  using (auth.uid() = (select user_id from campaigns where id = campaign_id));

-- ── Quests ────────────────────────────────────────────────────────────────────
create table if not exists quests (
  id           uuid default gen_random_uuid() primary key,
  campaign_id  uuid references campaigns on delete cascade not null,
  title        text not null,
  description  text not null default '',
  status       text not null default 'active' check (status in ('active', 'completed')),
  created_at   timestamptz default now(),
  completed_at timestamptz
);
alter table quests enable row level security;
drop policy if exists "Users manage own quests" on quests;
create policy "Users manage own quests" on quests for all
  using (auth.uid() = (select user_id from campaigns where id = campaign_id));

-- ── Stripe / subscription additions (additive) ───────────────────────────────
alter table profiles add column if not exists subscription_tier text not null default 'none';

-- ── Character sheet additions (additive) ─────────────────────────────────────
alter table characters add column if not exists xp          int  not null default 0;
alter table characters add column if not exists max_hp      int  not null default 0;
alter table characters add column if not exists current_hp  int  not null default 0;
alter table characters add column if not exists ac_override int;          -- null = auto-calculate from DEX/armor

-- ── Inventory ─────────────────────────────────────────────────────────────────
create table if not exists inventory (
  id           uuid default gen_random_uuid() primary key,
  character_id uuid references characters on delete cascade not null,
  campaign_id  uuid references campaigns  on delete cascade not null,
  name         text not null,
  item_type    text not null default 'item' check (item_type in ('weapon','armor','spell','item','other')),
  description  text not null default '',
  buff         text not null default '',
  quantity     int  not null default 1,
  equipped     boolean not null default false,
  created_at   timestamptz default now()
);
alter table inventory enable row level security;
drop policy if exists "Users manage own inventory" on inventory;
create policy "Users manage own inventory" on inventory for all
  using (auth.uid() = (select user_id from characters where id = character_id));

-- ── Dev User: Unlimited Coins + Slots ─────────────────────────────────────────
-- Run once to set up the developer/test account
insert into public.profiles (id, coins, character_slots)
  values ('0b5648d4-110b-4edf-8728-e7bd0868255d', 100000, 100000)
  on conflict (id) do update set coins = 100000, character_slots = 100000;

-- Portrait & appearance (added for character creator portrait step)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS appearance TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS portrait_url TEXT;
