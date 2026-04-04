import { supabase } from '../lib/supabase';
import type { List } from '../types';

export async function fetchLists(groupId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as List[];
}

export async function fetchListWithCounts(groupId: string): Promise<
  (List & { item_count: number; checked_count: number; last_activity: string | null })[]
> {
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: groupLists, error }, { data: memberRows }] = await Promise.all([
    supabase.from('lists').select('*').eq('group_id', groupId).order('created_at', { ascending: false }),
    user?.id
      ? supabase.from('list_members').select('list_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] as { list_id: string }[] }),
  ]);

  if (error) throw error;

  // Find lists the user joined via invite that belong to another group
  const ownIds = new Set((groupLists as List[] ?? []).map((l) => l.id));
  const sharedIds = (memberRows ?? [])
    .map((r) => r.list_id as string)
    .filter((id) => !ownIds.has(id));

  let sharedLists: List[] = [];
  if (sharedIds.length > 0) {
    const { data } = await supabase.from('lists').select('*').in('id', sharedIds);
    sharedLists = (data ?? []) as List[];
  }

  const lists = [...(groupLists as List[] ?? []), ...sharedLists].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Fetch counts and last activity for each list
  const results = await Promise.all(
    (lists as List[]).map(async (list) => {
      const { count: itemCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id);

      const { count: checkedCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id)
        .eq('checked', true);

      const { data: lastItem } = await supabase
        .from('items')
        .select('updated_at')
        .eq('list_id', list.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...list,
        item_count: itemCount ?? 0,
        checked_count: checkedCount ?? 0,
        last_activity: lastItem?.updated_at ?? null,
      };
    }),
  );

  return results;
}

export async function fetchListById(listId: string): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .single();
  if (error) throw error;
  return data as List;
}

export async function createList(
  groupId: string,
  userId: string,
  name: string,
  icon: string = '📋',
  displayName: string = 'User',
): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .insert({ group_id: groupId, name, icon, created_by: userId })
    .select()
    .single();

  if (error) throw error;

  const list = data as List;
  await supabase
    .from('list_members')
    .insert({ list_id: list.id, user_id: userId, display_name: displayName, role: 'owner' })
    .select()
    .single();

  return list;
}

export async function updateList(listId: string, updates: { name?: string; icon?: string }): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .update(updates)
    .eq('id', listId)
    .select()
    .single();

  if (error) throw error;
  return data as List;
}

export async function deleteList(listId: string): Promise<void> {
  const { error } = await supabase.from('lists').delete().eq('id', listId);
  if (error) throw error;
}
