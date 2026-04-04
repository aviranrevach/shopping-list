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
  hygiene: '🧴',
  spices: '🌶️',
  baking: '🧁',
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
  'hygiene',
  'spices',
  'baking',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; activeBg: string }> = {
  produce:   { bg: '#f0fdf4', text: '#166534', activeBg: '#bbf7d0' },
  dairy:     { bg: '#eff6ff', text: '#1d4ed8', activeBg: '#bfdbfe' },
  meat_fish: { bg: '#fef2f2', text: '#b91c1c', activeBg: '#fecaca' },
  bakery:    { bg: '#fffbeb', text: '#92400e', activeBg: '#fde68a' },
  frozen:    { bg: '#f0f9ff', text: '#0369a1', activeBg: '#bae6fd' },
  canned:    { bg: '#fff7ed', text: '#c2410c', activeBg: '#fed7aa' },
  snacks:    { bg: '#fdf4ff', text: '#7e22ce', activeBg: '#e9d5ff' },
  household: { bg: '#f0fdfa', text: '#0f766e', activeBg: '#99f6e4' },
  hygiene:   { bg: '#fdf2f8', text: '#be185d', activeBg: '#fbcfe8' },
  spices:    { bg: '#fefce8', text: '#a16207', activeBg: '#fef08a' },
  baking:    { bg: '#fff1f2', text: '#be123c', activeBg: '#fda4af' },
  other:     { bg: '#f8fafc', text: '#475569', activeBg: '#cbd5e1' },
};

export const UNITS = ['unit', 'kg', 'g', 'liter', 'ml', 'pack'] as const;
export type Unit = (typeof UNITS)[number];
