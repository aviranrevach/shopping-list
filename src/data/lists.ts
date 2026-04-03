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
  const { data: lists, error } = await supabase
    .from('lists')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;

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
): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .insert({ group_id: groupId, name, icon, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data as List;
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
