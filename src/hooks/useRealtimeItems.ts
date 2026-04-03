import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchItems } from '../data/items';
import type { Item } from '../types';

interface PendingUpdate {
  checked: boolean;
  checked_by: string | null;
  timestamp: number;
}

const PENDING_TTL = 3000; // 3 seconds

export function useRealtimeItems(listId: string | undefined) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());

  const refresh = useCallback(async () => {
    if (!listId) return;

    // Skip refresh if there are recent pending updates (animation in progress)
    const now = Date.now();
    for (const pending of pendingUpdates.current.values()) {
      if (now - pending.timestamp < 2000) return;
    }

    const fetched = await fetchItems(listId);

    // Merge with pending optimistic updates
    const mergeNow = Date.now();
    const merged = fetched.map((item) => {
      const pending = pendingUpdates.current.get(item.id);
      if (pending && mergeNow - pending.timestamp < PENDING_TTL) {
        // Keep optimistic value — server hasn't caught up yet
        return { ...item, checked: pending.checked, checked_by: pending.checked_by };
      }
      // Server value wins — clear stale pending
      if (pending) pendingUpdates.current.delete(item.id);
      return item;
    });

    setItems(merged);
    setLoading(false);
  }, [listId]);

  const optimisticToggle = useCallback((itemId: string, checked: boolean, checkedBy: string | null) => {
    pendingUpdates.current.set(itemId, { checked, checked_by: checkedBy, timestamp: Date.now() });
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, checked, checked_by: checkedBy } : item,
      ),
    );
  }, []);

  const optimisticDelete = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const optimisticAdd = useCallback((item: Item) => {
    setItems((prev) => [...prev, item]);
  }, []);

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

  return { items, loading, refresh, optimisticToggle, optimisticDelete, optimisticAdd };
}
