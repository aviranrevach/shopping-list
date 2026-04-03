-- List invites (per-list sharing, like Apple Notes)
create table list_invites (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table list_invites enable row level security;

-- Members of the list's group can create and read invites
create policy "Group members can read list invites"
  on list_invites for select using (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

create policy "Group members can create list invites"
  on list_invites for insert with check (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

-- Anyone can read an invite by token (for join flow)
create policy "Anyone can read invite by token"
  on list_invites for select using (true);

-- Add a list_members table to track per-list sharing
-- (separate from group_members which is account-level)
create table list_members (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (list_id, user_id)
);

alter table list_members enable row level security;

-- Anyone in the list can read members
create policy "List members can read"
  on list_members for select using (
    list_id in (select list_id from list_members where user_id = auth.uid())
    or list_id in (select id from lists where group_id in (select user_group_ids()))
  );

-- Users can add themselves (for join flow)
create policy "Users can join lists"
  on list_members for insert with check (user_id = auth.uid());

-- RPC to accept an invite (validates token, adds member, returns list)
create or replace function accept_list_invite(
  invite_token text,
  member_display_name text
) returns json as $$
declare
  v_invite record;
  v_list record;
begin
  -- Find valid invite
  select * into v_invite from list_invites
    where token = invite_token and expires_at > now();

  if v_invite is null then
    raise exception 'Invalid or expired invite';
  end if;

  -- Get list info
  select * into v_list from lists where id = v_invite.list_id;

  -- Add user as list member (ignore if already member)
  insert into list_members (list_id, user_id, display_name, role)
    values (v_invite.list_id, auth.uid(), member_display_name, 'member')
    on conflict (list_id, user_id) do nothing;

  -- Also ensure user is in the list's group
  insert into group_members (group_id, user_id, display_name, role)
    values (v_list.group_id, auth.uid(), member_display_name, 'member')
    on conflict (group_id, user_id) do nothing;

  return json_build_object(
    'list_id', v_invite.list_id,
    'list_name', v_list.name,
    'list_icon', v_list.icon,
    'group_id', v_list.group_id
  );
end;
$$ language plpgsql security definer;
