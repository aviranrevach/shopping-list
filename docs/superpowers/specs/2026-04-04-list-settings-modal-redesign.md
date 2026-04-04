# List Settings Modal Redesign

## Overview

Redesign the list settings modal (`showMenu` in `ListDetailScreen.tsx`) to include member info (owner, shared-with avatars, last updated by) and replace the plain action rows with iOS-style circle buttons + tall segmented controls.

---

## Layout — Top to Bottom

### 1. Top Strip (member context)

```
[avatar 42px]  אבירן רבך
               עודכן לאחרונה
               [av16] מיכל · לפני 3 דקות
```

- Owner avatar: 42px circle, initial letter, color from `useTheme` (`scheme.primary`)
- Owner name: `font-size 13px font-weight 700`, next to the avatar
- "עודכן לאחרונה": `9px uppercase #c0c0bc` label
- Last-updated row: small 16px avatar + `"<name> · <relative time>"` in `10px #aaa`
- Background: `#fafaf8`, `border-bottom: 1px solid #f0f0ea`
- The "last updated by" person is resolved from `item.checked_by` or `item.added_by` on the most-recent item (already computed as `last_activity` timestamp in `fetchListWithCounts`; the user name comes from matching `ListMember` records)

### 2. Body (scrollable padding 14px, gap 10px)

#### שותפים

- Section label: `9px uppercase #c0c0bc`
- Horizontal scrollable row of 46px circle avatars + name labels below
- **First item always**: dashed `+` circle (`border: 2px dashed #d1d5db`, `background: #fafaf8`) with label "הוסף" — tapping opens `InviteSheet` (same as current "שתף רשימה")
- Each member: `av46` circle with initial + name label `10px #555` below
- Data source: `getListMembers(listId)` — already used in `InviteSheet`; load when menu opens
- The owner (`role: 'owner'`) is excluded from this row (already shown in the top strip)

#### תצוגה (View toggle)

Tall segmented control — two options stacked icon + label:

| Option | Icon | Label | State |
|--------|------|-------|-------|
| Left | 🛒 | פריטים לקנות | `viewAll = false` |
| Right | 📋 | כל הפריטים יחד | `viewAll = true` |

- Container: `bg: #f0f0ea`, `border-radius: 13px`, padding `4px`
- Active pill: `bg: white`, `border-radius: 9px`, `box-shadow: 0 1px 5px rgba(0,0,0,0.10)`
- Icon: `20px` emoji, label: `11px font-weight 600`

#### מיון (Sort toggle)

Same tall segmented style:

| Option | Icon | Label | State |
|--------|------|-------|-------|
| Left | 🕐 | לפי סדר הוספה | `sortMode = 'added'` |
| Right | 🔤 | לפי סדר אלפבית | `sortMode = 'alpha'` |

#### Divider

`height: 1px`, `background: #f0f0ea`

#### Action Circles (iOS-style)

4 circles in a row, `justify-content: space-around`:

| Circle | Icon | Label | Action |
|--------|------|-------|--------|
| שנה שם | pencil SVG | שנה שם | open edit-name modal (existing) |
| ייבא | download SVG | ייבא רשימה | open import modal (existing) |
| כפילויות | copy SVG | הסר כפילויות | existing dedupe logic |
| מחק | trash SVG | מחק רשימה | `deleteListApi` then navigate (existing) |

- Circle size: `52px`, `border-radius: 50%`, `background: #f4f4f0`
- Delete circle: `background: #fff0f0`, icon stroke `#ef4444`
- Label: `10px #555`, `text-align: center`, max-width `54px`

#### Close Button

Full-width pill: `background: #f4f4f0`, `border-radius: 12px`, `padding: 10px`, `font-size 14px #888`, text "סגור"

---

## Data Requirements

### Owner name + avatar
- `ListMember` with `role: 'owner'` from `getListMembers(listId)`
- Avatar initial = first letter of `display_name`; color = consistent hash of `user_id` (or `scheme.primary` for simplicity)

### Last updated by
- The most recent item's `updated_at` is already returned as `last_activity` in `fetchListWithCounts`
- The person who last touched it: query `items` table ordered by `updated_at desc limit 1`, get `checked_by` (if item is checked) else `added_by` as the user_id, match to `ListMember.user_id` → `display_name`
- Relative time: compute from `last_activity` timestamp (e.g. "לפני 3 דקות", "לפני שעה")
- **Simplification**: fetch this in a `useEffect` when `showMenu` becomes `true` — no need to always have it loaded

### Members list
- `getListMembers(listId)` — fetch on menu open, show owner in strip, show non-owners in שותפים row

---

## Files to Change

| File | Change |
|------|--------|
| `src/screens/ListDetailScreen.tsx` | Replace menu modal JSX; add `listMembers` state + fetch; add `lastUpdatedBy` state + fetch; update segment labels |

No new files. No new hooks. Data fetched inline with `useEffect` on `showMenu`.

---

## Preserved Behaviors

- `viewAll`, `sortMode` localStorage persistence — unchanged
- Edit name modal — unchanged, triggered from action circle
- Import modal — unchanged, triggered from action circle
- Deduplicate logic — unchanged, triggered from action circle
- Delete list — unchanged, triggered from action circle
- `InviteSheet` — unchanged, opened by tapping `+` in שותפים row
- Modal animation (`menu-fade-in`) — unchanged
- Backdrop click to close — unchanged
- `maxWidth: 480px` cap — unchanged

---

## Relative Time Helper

Add a small inline helper (inside the component or as a module-level function in the same file):

```ts
function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
  return `לפני ${Math.floor(diff / 86400)} ימים`;
}
```
