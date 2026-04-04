-- Owner can remove any non-owner member from their list
create policy "Owner can remove members"
  on list_members for delete
  using (
    role != 'owner'
    and list_id in (
      select list_id from list_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Member can remove themselves (leave) — only non-owner rows
create policy "Member can leave list"
  on list_members for delete
  using (user_id = auth.uid() and role != 'owner');
