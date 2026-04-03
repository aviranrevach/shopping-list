create table custom_categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  emoji text not null default '📦',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);

alter table custom_categories enable row level security;

create policy "Group members can read categories"
  on custom_categories for select using (group_id in (select user_group_ids()));

create policy "Group members can create categories"
  on custom_categories for insert with check (group_id in (select user_group_ids()));

create policy "Group members can update categories"
  on custom_categories for update using (group_id in (select user_group_ids()));

create policy "Group members can delete categories"
  on custom_categories for delete using (group_id in (select user_group_ids()));
