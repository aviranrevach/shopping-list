import { supabase } from '../lib/supabase';
import type { Group, GroupMember } from '../types';

export async function updateMemberName(memberId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .update({ display_name: displayName })
    .eq('id', memberId);
  if (error) throw error;
}

export async function getOrCreateGroup(userId: string, displayName: string): Promise<{
  group: Group;
  member: GroupMember;
}> {
  // Prefer a group the user owns (created themselves).
  // A user may be in multiple groups if they were added to group_members via invite
  // before migration 006 fixed accept_list_invite. Always use their own group.
  const { data: ownedMember } = await supabase
    .from('group_members')
    .select('*, group:groups(*)')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();

  if (ownedMember) {
    return {
      group: ownedMember.group as Group,
      member: ownedMember as GroupMember,
    };
  }

  // Fall back to any group membership (e.g. first-time user who only joined via invite)
  const { data: existingMember, error: fetchError } = await supabase
    .from('group_members')
    .select('*, group:groups(*)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  console.log('[groups] fetch existing member:', { existingMember, fetchError });

  if (existingMember) {
    return {
      group: existingMember.group as Group,
      member: existingMember as GroupMember,
    };
  }

  // Create new group via RPC to bypass RLS circular dependency
  // We use a database function that creates group + member in one transaction
  const { data: rpcResult, error: rpcError } = await supabase.rpc('create_group_with_member', {
    group_name: 'My Group',
    member_user_id: userId,
    member_display_name: displayName,
  });

  console.log('[groups] rpc create_group_with_member:', { rpcResult, rpcError });

  if (rpcError) throw rpcError;

  // Now fetch the member with group join (user is now in group, so RLS allows it)
  const { data: newMember, error: fetchNewError } = await supabase
    .from('group_members')
    .select('*, group:groups(*)')
    .eq('user_id', userId)
    .limit(1)
    .single();

  console.log('[groups] fetch new member:', { newMember, fetchNewError });
  if (fetchNewError || !newMember) throw fetchNewError ?? new Error('Failed to fetch new member');

  return {
    group: newMember.group as Group,
    member: newMember as GroupMember,
  };
}
