import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchItems } from '../data/items';
import type { Item } from '../types';

export function useRealtimeItems(listId: string | undefined) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!listId) return;
    const data = await fetchItems(listId);
    setItems(data);
    setLoading(false);
  }, [listId]);

  useEffect(() => {
    if (!listId) return;

    refresh();

    const channel = supabase
      .channel(`items:${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${listId}` },
        () => { refresh(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [listId, refresh]);

  return { items, loading, refresh };
}
