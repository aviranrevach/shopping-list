import { supabase } from '../lib/supabase';
import type { CustomCategory } from '../types';

export async function fetchCustomCategories(groupId: string): Promise<CustomCategory[]> {
  const { data, error } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CustomCategory[];
}

export async function createCustomCategory(
  groupId: string,
  name: string,
  emoji: string,
): Promise<CustomCategory> {
  const { data, error } = await supabase
    .from('custom_categories')
    .insert({ group_id: groupId, name, emoji })
    .select()
    .single();
  if (error) throw error;
  return data as CustomCategory;
}
