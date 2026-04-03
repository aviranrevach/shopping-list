import { supabase } from '../lib/supabase';
import type { Item } from '../types';

export async function fetchItems(listId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data as Item[];
}

export async function createItem(
  listId: string,
  userId: string,
  name: string,
  category: string = 'other',
  quantity: number = 1,
): Promise<Item> {
  // Get next position
  const { count } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId);

  const { data, error } = await supabase
    .from('items')
    .insert({
      list_id: listId,
      name,
      category,
      quantity,
      added_by: userId,
      position: (count ?? 0),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function updateItem(
  itemId: string,
  updates: Partial<Pick<Item, 'name' | 'quantity' | 'unit' | 'category' | 'checked' | 'checked_by' | 'note' | 'position'>>,
): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function toggleItemChecked(itemId: string, checked: boolean, userId: string): Promise<Item> {
  return updateItem(itemId, {
    checked,
    checked_by: checked ? userId : null,
  });
}

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function fetchItemSuggestions(groupId: string, query: string): Promise<
  { name: string; category: string }[]
> {
  // Search distinct item names across all group lists
  const { data, error } = await supabase
    .from('items')
    .select('name, category, list:lists!inner(group_id)')
    .eq('lists.group_id', groupId)
    .ilike('name', `%${query}%`)
    .limit(10);

  if (error) throw error;

  // Deduplicate by name, keeping most recent category
  const seen = new Map<string, string>();
  for (const item of data ?? []) {
    if (!seen.has(item.name)) {
      seen.set(item.name, item.category);
    }
  }

  return Array.from(seen.entries()).map(([name, category]) => ({ name, category }));
}
