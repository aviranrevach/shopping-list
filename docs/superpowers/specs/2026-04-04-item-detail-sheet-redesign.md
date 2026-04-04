# Item Detail Sheet Redesign

## Overview

Redesign `ItemDetailSheet.tsx` — the full-screen slide-in panel for editing a shopping list item. Current version is cluttered, uses too much vertical space, and has broken unit display. New design is compact, scannable, and comfortable to use while shopping.

---

## Entry Points

- **Swipe** on item row (existing, keep as-is)
- **Three-dot button** (⋯) on the right end of each item row (new) — tapping opens the sheet

The three-dot button is added to `ItemRow.tsx`. It appears on every row, tapping calls `onOpenDetail`.

---

## Layout — Top to Bottom

### 1. Header (sticky)

```
‹       עגבניות שרי       [א]
                          [14:32]
```

- **Back button (‹)** — left side, 36×36 circle, `#f5f5f0` background
- **Item name** — centered, bold, 16px. This is display-only in the header; editing happens in the name field below.
- **Avatar + time** — right side, stacked vertically (avatar on top, time below), both top-aligned. Avatar is 28px circle with user initial. Time is 9px gray.
- No trash icon in the header — delete moved to the bottom.

### 2. Body (scrollable)

#### פריט (Name + Note — one combined box)

One rounded box (`border-radius: 13px`, `background: #f9f9f7`, `border: 1.5px solid #ebebeb`) split into two vertically by a thin horizontal divider:

- **Top half**: item name input — 16px, font-weight 600. Saves to Supabase on blur (existing `localName` pattern).
- **Bottom half**: note textarea — 13px, gray placeholder. Saves on blur (existing `localNote` pattern). Min-height ~48px.

Section label above: `פריט` (uppercase, 10px, `#c0c0bc`)

#### כמות (Quantity + Unit)

One row: `− [number] [unit▾] · · · +`

- Minus button (left), big number center, unit pill, spacer, plus button (right)
- All inside one rounded box (`#f9f9f7`, same border style)
- **Unit pill**: amber background (`scheme.primary`), white text, shows current unit + `▾`
- **Tapping unit pill** → toggles a unit picker grid open below the row (not replacing it)
- **Unit picker**: `display: grid; grid-template-columns: repeat(3, 1fr)` — all 6 units as pills. Active unit highlighted with `scheme.primary`. Selecting a unit closes the picker immediately.
- Unit picker has `border: 1.5px solid scheme.primaryLight` around the container to connect it visually to the row above.

#### קטגוריה (Category)

**Collapsed (default):** Shows first 2 natural rows of pills. "עוד X ▾" link below to expand.

**Expanded:** Shows all category pills + inline "add new" input pill at the end. "▴ פחות" to collapse.

**Pill layout:**
- `display: flex; flex-wrap: wrap; gap: 5px`
- Each pill: `flex: 1 1 auto` — content-based width. Short labels (מאפים, קפואים) fit 3/row; long labels (ירקות ופירות, בשר ודגים) fit 2/row. All pills in a row grow equally to fill full width.
- Pill style: `padding: 8px 8px`, `border-radius: 10px`, `font-size: 13px`, emoji + text inline with `gap: 4px`, `white-space: nowrap`
- **Border**: all pills have `border: 1px solid rgba(0,0,0,0.10)`
- **Selected**: `border: 1.5px solid rgba(0,0,0,0.28)`, font-weight 700, deeper tint background

**Pastel tints per category:**

| Category   | Background | Text color |
|------------|-----------|------------|
| produce    | #f0fdf4   | #166534    |
| dairy      | #eff6ff   | #1d4ed8    |
| meat_fish  | #fef2f2   | #b91c1c    |
| bakery     | #fffbeb   | #92400e    |
| frozen     | #f0f9ff   | #0369a1    |
| canned     | #fff7ed   | #c2410c    |
| snacks     | #fdf4ff   | #7e22ce    |
| household  | #f0fdfa   | #0f766e    |
| hygiene    | #fdf2f8   | #be185d    |
| spices     | #fefce8   | #a16207    |
| baking     | #fff1f2   | #be123c    |
| other      | #f8fafc   | #475569    |

Active background (deeper tint): produce `#bbf7d0`, dairy `#bfdbfe`, meat `#fecaca`, bakery `#fde68a`, frozen `#bae6fd`, canned `#fed7aa`, snacks `#e9d5ff`, household `#99f6e4`, hygiene `#fbcfe8`, spices `#fef08a`, baking `#fda4af`, other `#cbd5e1`.

**"Add new category" pill** — last pill in expanded state. Dashed border (`1.5px dashed #d1d5db`), transparent background. Contains a `+` icon and an inline text input (`placeholder: "קטגוריה חדשה"`). Pressing Enter or blurring with a non-empty value creates the custom category via the existing `useCategories` hook and selects it.

**Collapsed state logic**: Render all pills into the DOM but clip to 2 rows using `max-height` + `overflow: hidden`. Calculate 2-row height after mount using a `ref` on the pills container — measure the top of the 3rd row's first pill's `offsetTop`, use that as `maxHeight`. This avoids hardcoding a pixel value.

#### תמונות (Images)

Horizontal row of 72×72 square thumbnails (`border-radius: 12px`). Last item is always the "add" button: dashed border, `+` icon, "הוסף" label below. Tapping opens the file input (camera capture). Existing upload/delete logic unchanged.

#### מחק פריט (Delete)

Full-width button at the bottom of the scroll area:
- `background: #fff0f0`, `color: #ef4444`, `border-radius: 13px`, `padding: 14px`
- Trash icon + "מחק פריט" text, centered
- Tapping calls existing `handleDelete()` — no confirmation dialog (same as current trash icon behavior)

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/ItemDetailSheet.tsx` | Full redesign as described |
| `src/components/ItemRow.tsx` | Add three-dot (⋯) button on the right of each row |
| `src/components/CategoryGroup.tsx` | Pass `onOpenDetail` through (already exists, no change needed) |

---

## Preserved Behaviors

- Slide-in from left animation (unchanged)
- Drag-to-dismiss swipe (unchanged)
- `localName` / `localNote` pattern — save on blur, not on keystroke
- Optimistic delete via `onDelete` prop
- Image upload/delete via existing `fetchItemImages`, `uploadItemImage`, `deleteItemImage`
- `useCategories` hook for custom categories
- `UNITS` array for unit options
