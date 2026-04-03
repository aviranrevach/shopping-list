import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchListWithCounts } from '../data/lists';
import type { List } from '../types';

type ListWithCounts = List & { item_count: number; checked_count: number; last_activity: string | null };

export function useRealtimeLists(groupId: string | undefined) {
  const [lists, setLists] = useState<ListWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    const data = await fetchListWithCounts(groupId);
    setLists(data);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;

    refresh();

    const channel = supabase
      .channel(`lists:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lists', filter: `group_id=eq.${groupId}` },
        () => { refresh(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => { refresh(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, refresh]);

  return { lists, loading, refresh };
}
