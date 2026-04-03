export type { Group, GroupMember, List, Item, ItemImage, GroupInvite, ListInvite, ListMember, CustomCategory } from './database';

export const DEFAULT_CATEGORY_EMOJIS: Record<string, string> = {
  produce: '🥬',
  dairy: '🥛',
  meat_fish: '🥩',
  bakery: '🍞',
  frozen: '🧊',
  canned: '🥫',
  snacks: '🍿',
  household: '🧹',
  other: '📦',
};

export const CATEGORIES = [
  'produce',
  'dairy',
  'meat_fish',
  'bakery',
  'frozen',
  'canned',
  'snacks',
  'household',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const UNITS = ['unit', 'kg', 'g', 'liter', 'ml', 'pack'] as const;
export type Unit = (typeof UNITS)[number];
