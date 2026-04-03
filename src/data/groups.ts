import { supabase } from '../lib/supabase';
import type { Group, GroupMember } from '../types';

export async function getOrCreateGroup(userId: string, displayName: string): Promise<{
  group: Group;
  member: GroupMember;
}> {
  // Check if user already belongs to a group
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('*, group:groups(*)')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (existingMember) {
    return {
      group: existingMember.group as Group,
      member: existingMember as GroupMember,
    };
  }

  // Create new group + add user as admin
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name: 'My Group' })
    .select()
    .single();

  if (groupError || !group) throw groupError ?? new Error('Failed to create group');

  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: userId,
      role: 'admin',
      display_name: displayName,
    })
    .select()
    .single();

  if (memberError || !member) throw memberError ?? new Error('Failed to create member');

  return { group: group as Group, member: member as GroupMember };
}
