import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchListWithCounts } from '../data/lists';
import type { List } from '../types';
import { useAuth } from './useAuth';

type ListWithCounts = List & { item_count: number; checked_count: number; last_activity: string | null };

export function useRealtimeLists(groupId: string | undefined) {
  const [lists, setLists] = useState<ListWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    // Fetch even without a groupId — shared lists come from list_members
    if (!groupId && !user?.id) return;
    const data = await fetchListWithCounts(groupId);
    setLists(data);
    setLoading(false);
  }, [groupId, user?.id]);

  useEffect(() => {
    if (!groupId && !user?.id) return;

    refresh();

    const channel = supabase
      .channel(`lists:${groupId ?? 'shared'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lists', ...(groupId ? { filter: `group_id=eq.${groupId}` } : {}) },
        () => { refresh(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => { refresh(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_members' },
        () => { refresh(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, user?.id, refresh]);

  return { lists, loading, refresh };
}
