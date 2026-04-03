-- Groups
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Group members
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  display_name text not null,
  avatar_url text,
  unique (group_id, user_id)
);

-- Lists
create table lists (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  icon text not null default '📋',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Items
create table items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  name text not null,
  quantity integer not null default 1,
  unit text,
  category text not null default 'other',
  checked boolean not null default false,
  checked_by uuid references auth.users(id),
  added_by uuid not null references auth.users(id),
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Item images
create table item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Group invites
create table group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Auto-update updated_at on items
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

-- Enable realtime on items and lists
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table lists;

-- Row-Level Security

alter table groups enable row level security;
alter table group_members enable row level security;
alter table lists enable row level security;
alter table items enable row level security;
alter table item_images enable row level security;
alter table group_invites enable row level security;

-- Helper: get user's group IDs
create or replace function user_group_ids()
returns setof uuid as $$
  select group_id from group_members where user_id = auth.uid()
$$ language sql security definer stable;

-- Groups: members can read their groups
create policy "Members can read own groups"
  on groups for select using (id in (select user_group_ids()));

-- Groups: anyone authenticated can create (for auto-create flow)
create policy "Authenticated users can create groups"
  on groups for insert with check (auth.uid() is not null);

-- Group members: members can read their group's members
create policy "Members can read group members"
  on group_members for select using (group_id in (select user_group_ids()));

-- Group members: allow inserting self (for join flow)
create policy "Users can add themselves to groups"
  on group_members for insert with check (user_id = auth.uid());

-- Lists: members can CRUD their group's lists
create policy "Members can read group lists"
  on lists for select using (group_id in (select user_group_ids()));

create policy "Members can create group lists"
  on lists for insert with check (group_id in (select user_group_ids()));

create policy "Members can update group lists"
  on lists for update using (group_id in (select user_group_ids()));

create policy "Members can delete group lists"
  on lists for delete using (group_id in (select user_group_ids()));

-- Items: members can CRUD items in their group's lists
create policy "Members can read items"
  on items for select using (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

create policy "Members can create items"
  on items for insert with check (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

create policy "Members can update items"
  on items for update using (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

create policy "Members can delete items"
  on items for delete using (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

-- Item images: same scoping as items
create policy "Members can read item images"
  on item_images for select using (
    item_id in (
      select i.id from items i
      join lists l on i.list_id = l.id
      where l.group_id in (select user_group_ids())
    )
  );

create policy "Members can create item images"
  on item_images for insert with check (
    item_id in (
      select i.id from items i
      join lists l on i.list_id = l.id
      where l.group_id in (select user_group_ids())
    )
  );

create policy "Members can delete item images"
  on item_images for delete using (
    item_id in (
      select i.id from items i
      join lists l on i.list_id = l.id
      where l.group_id in (select user_group_ids())
    )
  );

-- Group invites: members can read/create invites for their group
create policy "Members can read group invites"
  on group_invites for select using (group_id in (select user_group_ids()));

create policy "Members can create group invites"
  on group_invites for insert with check (group_id in (select user_group_ids()));

-- Group invites: anyone can read by token (for join flow — public)
create policy "Anyone can read invite by token"
  on group_invites for select using (true);

-- Storage bucket for item images (run via Supabase dashboard or API)
-- insert into storage.buckets (id, name, public) values ('item-images', 'item-images', false);
