-- Run in Supabase SQL Editor to add NPC tracking

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
create policy "Users manage own npcs" on campaign_npcs for all
  using (auth.uid() = (select user_id from campaigns where id = campaign_id));
