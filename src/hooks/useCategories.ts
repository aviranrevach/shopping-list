import { useEffect, useState } from 'react';
import { CATEGORIES, DEFAULT_CATEGORY_EMOJIS } from '../types';
import { fetchCustomCategories } from '../data/categories';
import type { CustomCategory } from '../types';

export interface CategoryInfo {
  key: string;
  emoji: string;
  isCustom: boolean;
}

export function useCategories(groupId: string | undefined) {
  const [custom, setCustom] = useState<CustomCategory[]>([]);

  useEffect(() => {
    if (!groupId) return;
    fetchCustomCategories(groupId).then(setCustom);
  }, [groupId]);

  const allCategories: CategoryInfo[] = [
    ...CATEGORIES.filter(c => c !== 'other').map(c => ({
      key: c,
      emoji: DEFAULT_CATEGORY_EMOJIS[c] || '📦',
      isCustom: false,
    })),
    ...custom.map(c => ({
      key: c.name,
      emoji: c.emoji,
      isCustom: true,
    })),
    { key: 'other', emoji: '📦', isCustom: false },
  ];

  function addCategory(cat: CustomCategory) {
    setCustom(prev => [...prev, cat]);
  }

  function getCategoryEmoji(key: string): string {
    if (DEFAULT_CATEGORY_EMOJIS[key]) return DEFAULT_CATEGORY_EMOJIS[key];
    const found = custom.find(c => c.name === key);
    return found?.emoji ?? '📦';
  }

  return { allCategories, custom, addCategory, getCategoryEmoji };
}
