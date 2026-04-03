import { supabase } from '../lib/supabase';
import type { ListInvite, ListMember } from '../types';

export async function createListInvite(listId: string, userId: string): Promise<ListInvite> {
  const { data, error } = await supabase
    .from('list_invites')
    .insert({ list_id: listId, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data as ListInvite;
}

export async function getInviteByToken(token: string): Promise<ListInvite | null> {
  const { data, error } = await supabase
    .from('list_invites')
    .select('*')
    .eq('token', token)
    .single();

  if (error) return null;
  return data as ListInvite;
}

export async function getInviteWithList(token: string): Promise<{
  invite: ListInvite;
  list: { id: string; name: string; icon: string; group_id: string };
  itemCount: number;
  creatorName: string;
} | null> {
  const { data: invite } = await supabase
    .from('list_invites')
    .select('*')
    .eq('token', token)
    .single();

  if (!invite) return null;

  const { data: list } = await supabase
    .from('lists')
    .select('id, name, icon, group_id')
    .eq('id', invite.list_id)
    .single();

  if (!list) return null;

  const { count } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', invite.list_id);

  const { data: creator } = await supabase
    .from('group_members')
    .select('display_name')
    .eq('user_id', invite.created_by)
    .limit(1)
    .single();

  return {
    invite: invite as ListInvite,
    list: list as { id: string; name: string; icon: string; group_id: string },
    itemCount: count ?? 0,
    creatorName: creator?.display_name ?? 'Someone',
  };
}

export async function acceptInvite(token: string, displayName: string): Promise<{
  list_id: string;
  list_name: string;
  list_icon: string;
  group_id: string;
}> {
  const { data, error } = await supabase.rpc('accept_list_invite', {
    invite_token: token,
    member_display_name: displayName,
  });

  if (error) throw error;
  return data;
}

export async function getListMembers(listId: string): Promise<ListMember[]> {
  const { data, error } = await supabase
    .from('list_members')
    .select('*')
    .eq('list_id', listId);

  if (error) throw error;
  return (data ?? []) as ListMember[];
}

export function getInviteUrl(token: string): string {
  return `${window.location.origin}/join/${token}`;
}
