# Add Flow Fixes & Custom Categories

## Context

The adding items flow needs improvements: inline category selection while adding, tap-outside-to-close, and the ability to create custom categories with emojis. Currently categories are hardcoded in TypeScript — this spec makes them dynamic (stored in DB, per-group).

## 1. Add Flow Fixes

### Tap Outside to Close

When the add zone is open, tapping anywhere on the list area below (or scrolling down) auto-closes the add zone. Same effect as tapping "סיום".

Implementation: Add an `onClick` handler on the list content area that calls `handleAddDone` when `isAddMode` is true.

### Inline Category Selection

Each added item row shows a category pill. Tapping the pill opens a full-width 2-column category grid below that item row.

**Category picker layout:**
- 2-column CSS grid (`grid-template-columns: 1fr 1fr`)
- Each chip: 50px min-height, 16px font, 22px emoji, centered
- Selected chip: amber background
- Last chip: "+ חדשה" (dashed border) to create a new category
- Opens below the specific item row, not at the bottom of the zone

### Live Category Prediction (existing, unchanged)

As the user types, the category pill next to the input shows the predicted category from item history. This already works — no changes needed.

## 2. Custom Categories

### Data Model

New table `custom_categories` (per-group):

```sql
create table custom_categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  emoji text not null default '📦',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);
```

RLS: group members can CRUD.

### Default Categories

The 9 built-in categories (produce, dairy, meat_fish, etc.) remain as defaults. They're supplemented by custom categories from the DB. The combined list is: built-in categories + custom categories + "other" at the end.

Each built-in category gets a default emoji:
- 🥬 produce (ירקות ופירות)
- 🥛 dairy (מוצרי חלב)
- 🥩 meat_fish (בשר ודגים)
- 🍞 bakery (מאפים)
- 🧊 frozen (קפואים)
- 🥫 canned (שימורים)
- 🍿 snacks (חטיפים)
- 🧹 household (משק בית)
- 📦 other (אחר)

### Creating a New Category (Inline)

1. User taps "+ חדשה" in the category picker
2. Picker transforms into a creation form:
   - 52px emoji button (tap to open emoji picker — use native OS emoji input)
   - 17px name input
   - Full-width "שמור קטגוריה" button
3. On save: insert into `custom_categories`, assign to the current item
4. New category immediately available in all pickers across the app

### Category Management (Settings — future)

A settings screen for managing categories (reorder, rename, delete) is deferred. The inline "+ חדשה" is sufficient for MVP.

## 3. Category Display with Emojis

### In the List Detail Screen

Category group headers now show emoji:
```
🥬 ירקות ופירות
🥛 מוצרי חלב
💊 תוספי מזון (custom)
```

### In Category Pills

Category pills in the add zone and item detail show the emoji before the name.

### In the Category Picker

Full-width 2-column grid with emoji + name in each chip.

## 4. Files to Modify/Create

| File | Changes |
|------|---------|
| `supabase/migrations/003_custom_categories.sql` | New table + RLS |
| `src/types/database.ts` | Add `CustomCategory` type |
| `src/types/index.ts` | Add default category emojis map |
| `src/data/categories.ts` | New — CRUD for custom categories |
| `src/hooks/useCategories.ts` | New — fetch built-in + custom categories for current group |
| `src/components/AddZone.tsx` | Inline category picker, tap category pill to open grid |
| `src/components/CategoryPicker.tsx` | New — 2-column grid picker + new category form |
| `src/components/CategoryGroup.tsx` | Show emoji in section headers |
| `src/screens/ListDetailScreen.tsx` | Tap-outside-to-close behavior |
| `src/i18n/he.json` | Add category creation strings |
| `src/i18n/en.json` | Add category creation strings |

## 5. What's NOT Changing

- Check/uncheck animations
- Item detail sheet
- Invite flow
- Swipe gestures
- Login/join screens
