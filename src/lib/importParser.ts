/**
 * Parse Apple Notes-style shopping list.
 *
 * Handles:
 * - [x] / [ ] checkbox syntax
 * - Category headers (lines without checkbox prefix)
 * - Quantity prefix (e.g., "2 לחם" → qty 2)
 * - Maps Hebrew category names to app category keys
 */

export interface ParsedItem {
  name: string;
  quantity: number;
  checked: boolean;
  category: string;
}

// Map Hebrew category headers to app category keys
const CATEGORY_MAP: Record<string, string> = {
  // Exact matches
  'מאפייה': 'bakery',
  'מאפים': 'bakery',
  'לחם': 'bakery',
  'גבינות וחלב': 'dairy',
  'מוצרי חלב': 'dairy',
  'חלב וגבינות': 'dairy',
  'חלבי': 'dairy',
  'נקיון': 'household',
  'ניקיון': 'household',
  'משק בית': 'household',
  'נקיון בית': 'household',
  'נקיון ומשק בית': 'household',
  'הגיינה': 'hygiene',
  'טיפוח': 'hygiene',
  'טיפוח וגוף': 'hygiene',
  'הגיינה טיפוח וגוף': 'hygiene',
  'תבלינים': 'spices',
  'רטבים': 'spices',
  'תבלינים ורטבים': 'spices',
  'אפיה': 'baking',
  'בישול': 'baking',
  'אפיה ובישול': 'baking',
  'שימורים': 'canned',
  'שימורים / קטניות': 'canned',
  'שימורים וקטניות': 'canned',
  'שימורים קטניות ופסטה': 'canned',
  'קטניות': 'canned',
  'פסטה': 'canned',
  'ירקות': 'produce',
  'ירקות ופירות': 'produce',
  'פירות': 'produce',
  'פירות וירקות': 'produce',
  'בשר': 'meat_fish',
  'בשר ודגים': 'meat_fish',
  'דגים': 'meat_fish',
  'קפואים': 'frozen',
  'חטיפים': 'snacks',
  'מתוקים': 'snacks',
  'חטיפים ומתוקים': 'snacks',
  'משקאות': 'other',
  'השאר': 'other',
  'כללי': 'other',
  'שונות': 'other',
};

function normalizeCategory(header: string): string | null {
  const clean = header.trim().toLowerCase();
  // Try exact match first
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (key.toLowerCase() === clean) return value;
  }
  // Try partial match
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (clean.includes(key.toLowerCase()) || key.toLowerCase().includes(clean)) return value;
  }
  return null;
}

function isCheckboxLine(line: string): boolean {
  return /^\s*-\s*\[[ xX]\]/.test(line);
}

function isCategoryHeader(line: string): boolean {
  const trimmed = line.trim();
  // Not a checkbox line, not empty, no special prefix, likely a header
  if (isCheckboxLine(trimmed)) return false;
  if (trimmed.length === 0) return false;
  // Headers are typically short and don't start with numbers
  if (/^\d/.test(trimmed)) return false;
  // Skip very long lines (likely not headers)
  if (trimmed.length > 40) return false;
  return true;
}

function parseCheckboxLine(line: string): { name: string; quantity: number; checked: boolean } | null {
  const match = line.match(/^\s*-\s*\[([xX ])\]\s*(.+)/);
  if (!match) return null;

  const checked = match[1].toLowerCase() === 'x';
  let text = match[2].trim();

  // Extract quantity prefix: "2 לחם" → qty 2, name "לחם"
  let quantity = 1;
  const qtyMatch = text.match(/^(\d+)\s+(.+)/);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
    text = qtyMatch[2].trim();
  }

  if (!text) return null;

  return { name: text, quantity, checked };
}

export function parseAppleNotes(text: string): ParsedItem[] {
  const lines = text.split('\n');
  const items: ParsedItem[] = [];
  let currentCategory = 'other';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isCheckboxLine(trimmed)) {
      const parsed = parseCheckboxLine(trimmed);
      if (parsed) {
        items.push({ ...parsed, category: currentCategory });
      }
    } else if (isCategoryHeader(trimmed)) {
      const mapped = normalizeCategory(trimmed);
      if (mapped) {
        currentCategory = mapped;
      }
      // If no match, keep current category (skip unknown headers like "קניות")
    }
  }

  return items;
}

export function parsePlainList(text: string): ParsedItem[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      quantity: 1,
      checked: false,
      category: 'other',
    }));
}
