-- 1. Create the missing RPC that groups.ts calls to bootstrap a new user's group.
--    Uses SECURITY DEFINER to bypass RLS circular dependency
--    (user needs a group_member row to read groups, but needs a group to insert into).
drop function if exists create_group_with_member(text, uuid, text);
create or replace function create_group_with_member(
  group_name text,
  member_user_id uuid,
  member_display_name text
) returns json as $$
declare
  v_group record;
  v_member record;
begin
  insert into groups (name) values (group_name) returning * into v_group;

  insert into group_members (group_id, user_id, display_name, role)
    values (v_group.id, member_user_id, member_display_name, 'owner')
    returning * into v_member;

  return json_build_object('group_id', v_group.id, 'member_id', v_member.id);
end;
$$ language plpgsql security definer;

-- 2. Backfill: ensure every list creator is in list_members as 'owner'.
--    Covers lists created before list_members was introduced.
insert into list_members (list_id, user_id, display_name, role)
select
  l.id,
  l.created_by,
  coalesce(gm.display_name, 'User'),
  'owner'
from lists l
left join group_members gm on gm.user_id = l.created_by and gm.group_id = l.group_id
where not exists (
  select 1 from list_members lm where lm.list_id = l.id and lm.user_id = l.created_by
);
