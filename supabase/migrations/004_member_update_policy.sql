-- Allow users to update their own group_member row (display_name, avatar_url)
create policy "Users can update own membership"
  on group_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
