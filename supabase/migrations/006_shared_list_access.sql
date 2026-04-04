-- Fix shared list access: use list_members as the authority for per-list access.
-- Previously accept_list_invite added joiners to group_members, causing the
-- getOrCreateGroup .limit(1) to return the wrong group. Now list membership
-- is checked directly via list_members for all list/item RLS policies.

-- Helper: all list IDs accessible to the current user
create or replace function user_accessible_list_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select id from lists where group_id in (select user_group_ids())
  union
  select list_id from list_members where user_id = auth.uid()
$$;

-- Lists: allow read via list_members
drop policy if exists "Members can read group lists" on lists;
create policy "Members can read group lists"
  on lists for select using (
    id in (select user_accessible_list_ids())
  );

-- Items: allow CRUD via list_members
drop policy if exists "Members can read items" on items;
create policy "Members can read items"
  on items for select using (list_id in (select user_accessible_list_ids()));

drop policy if exists "Members can create items" on items;
create policy "Members can create items"
  on items for insert with check (list_id in (select user_accessible_list_ids()));

drop policy if exists "Members can update items" on items;
create policy "Members can update items"
  on items for update using (list_id in (select user_accessible_list_ids()));

drop policy if exists "Members can delete items" on items;
create policy "Members can delete items"
  on items for delete using (list_id in (select user_accessible_list_ids()));

-- Item images: allow CRUD via list_members
drop policy if exists "Members can read item images" on item_images;
create policy "Members can read item images"
  on item_images for select using (
    item_id in (select id from items where list_id in (select user_accessible_list_ids()))
  );

drop policy if exists "Members can create item images" on item_images;
create policy "Members can create item images"
  on item_images for insert with check (
    item_id in (select id from items where list_id in (select user_accessible_list_ids()))
  );

drop policy if exists "Members can delete item images" on item_images;
create policy "Members can delete item images"
  on item_images for delete using (
    item_id in (select id from items where list_id in (select user_accessible_list_ids()))
  );

-- Fix accept_list_invite: remove group_members insert (caused multi-group bug).
-- Joiners stay in their own group; access is granted via list_members + updated RLS above.
create or replace function accept_list_invite(
  invite_token text,
  member_display_name text
) returns json as $$
declare
  v_invite record;
  v_list record;
begin
  select * into v_invite from list_invites
    where token = invite_token and expires_at > now();

  if v_invite is null then
    raise exception 'Invalid or expired invite';
  end if;

  select * into v_list from lists where id = v_invite.list_id;

  insert into list_members (list_id, user_id, display_name, role)
    values (v_invite.list_id, auth.uid(), member_display_name, 'member')
    on conflict (list_id, user_id) do nothing;

  return json_build_object(
    'list_id', v_invite.list_id,
    'list_name', v_list.name,
    'list_icon', v_list.icon,
    'group_id', v_list.group_id
  );
end;
$$ language plpgsql security definer;
