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
  invite: { id: string; token: string; expires_at: string; list_id: string };
  list: { id: string; name: string; icon: string; group_id: string };
  itemCount: number;
  creatorName: string;
} | null> {
  // Use RPC to bypass RLS — invitees are not authenticated yet
  const { data, error } = await supabase.rpc('get_invite_info', { invite_token: token });

  if (error || !data) return null;

  return {
    invite: {
      id: data.invite_id,
      token: data.token,
      expires_at: data.expires_at,
      list_id: data.list_id,
    },
    list: {
      id: data.list_id,
      name: data.list_name,
      icon: data.list_icon,
      group_id: data.group_id,
    },
    itemCount: data.item_count ?? 0,
    creatorName: data.creator_name ?? 'Someone',
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
