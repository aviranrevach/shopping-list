# Home Page Redesign

## Context

The home page (Lists screen) needs a redesign. Remove the bottom nav entirely (from both Lists and ListDetail screens). Bigger cards, Apple Notes-inspired, centered title with generous spacing.

## Changes

### Remove Bottom Nav

- Delete `src/components/BottomNav.tsx`
- Remove `<BottomNav />` from `ListsScreen.tsx` and `ListDetailScreen.tsx`

### Home Page Layout

**Header row** (top, horizontal):
- **Right (RTL start)**: `+` button — secondary style (gray rounded square `#f0f0ea`, 38px, `rounded-xl`)
- **Left (RTL end)**: Settings icon — tertiary, no fill, slider-with-dots icon, `#bbb` color

**Title area** (centered, generous spacing):
- Greeting: "שלום [name] 👋" — 15px, `#bbb`
- Title: "הרשימות שלי" — 28px bold
- 28px padding above, 32px below

**List cards**:
- White, `rounded-2xl`, subtle shadow
- **Top row**: emoji (26px) + list name (18px bold) + overlapping avatar stack (horizontal, 20px circles)
- **Bottom row**: "X נותרו" on right + "2m" time on left + amber progress bar below
- Progress bar = remaining todo items (full = all items need buying, shrinks as you check)
- Padding: 14px top, 16px sides, 12px bottom

**Single list behavior**: When only 1 list exists, the card is 50% larger (emoji 34px, name 22px, progress bar 4px thick)

**New list**: Tapping `+` opens an inline form (same as current behavior)

### Card Data

Each card shows:
- `icon` + `name` from the list
- Remaining unchecked count: `item_count - checked_count`
- Last activity time (relative)
- Avatar(s) of the last person who edited — overlapping horizontally
- Progress bar: `(item_count - checked_count) / item_count` as percentage

### Settings Button

Opens a preferences page (future). For now, can be a placeholder or open a simple menu with "share app" link.

## Files to Modify

| File | Changes |
|------|---------|
| `src/screens/ListsScreen.tsx` | Complete redesign — new layout, remove BottomNav |
| `src/screens/ListDetailScreen.tsx` | Remove BottomNav import and usage |
| `src/components/BottomNav.tsx` | Delete |
| `src/i18n/he.json` | Add "remaining" string, greeting |
| `src/i18n/en.json` | Add "remaining" string, greeting |

## What's NOT Changing

- List detail screen (except removing BottomNav)
- Item interactions
- Add flow
- Invite flow
