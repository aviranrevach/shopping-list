import { useEffect, useState } from 'react';
import { fetchItemSuggestions } from '../data/items';

export function useItemSuggestions(groupId: string | undefined, query: string) {
  const [suggestions, setSuggestions] = useState<{ name: string; category: string }[]>([]);

  useEffect(() => {
    if (!groupId || query.length < 1) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      const results = await fetchItemSuggestions(groupId, query);
      if (!cancelled) setSuggestions(results);
    }, 200); // debounce

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [groupId, query]);

  return suggestions;
}
