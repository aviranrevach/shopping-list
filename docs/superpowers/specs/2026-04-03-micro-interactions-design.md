# Micro-Interactions Design Spec

## Context

The shopping list app's core interactions (checking items, adding items) feel laggy and unfinished. The UI waits for Supabase round-trips before updating, animations are killed by re-renders, and transitions between states are jarring. This spec defines the exact animation sequences, timing, and architecture needed to make these interactions feel instant and satisfying. The app is used while walking around a store — every tap must feel responsive.

## Design Principles (consistent across all interactions)

- **Optimistic updates** — UI changes instantly, Supabase syncs in the background
- **Consistent animation language** — new items appearing anywhere use the same slide-in + amber glow pattern
- **Checkbox is the tap target** — not the full row. Swiping is the other way to check.
- **Radial ripple from checkbox** — Material Design-inspired amber ripple on check
- **No toasts or floating feedback** — the animation IS the confirmation

---

## 1. Check Item

**Tap target:** Checkbox only (not full row)

### Animation Sequence (0ms → 950ms)

| Time | What happens |
|------|-------------|
| **0ms** | Amber radial ripple expands from checkbox center. Checkbox fills amber + checkmark appears with spring pop (`scale 0.7 → 1.3 → 1`, `cubic-bezier(0.34, 1.56, 0.64, 1)`, 300ms) |
| **150ms** | Text gets strikethrough + color fades to gray (`transition: all 0.2s ease`) |
| **400ms** | Row opacity fades to 0.2 (`transition: opacity 0.3s ease`) |
| **700ms** | Row height collapses to 0 (`transition: all 0.25s ease` on max-height, padding, margin) |
| **950ms** | Item appears in "✓ סומנו" section at bottom: slides in with height expand from 0, opacity 0 → 0.35, translateY(-8px → 0) over 0.3s |

### CSS Keyframes

```css
@keyframes checkbox-spring {
  0% { transform: scale(0.7); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

@keyframes ripple-expand {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(5); opacity: 0; }
}
```

### Ripple Implementation

- Ripple is an absolutely-positioned `div` inside the row, centered on the checkbox
- `border-radius: 50%`, `radial-gradient(circle, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0) 70%)`
- Size: `Math.max(rowWidth, rowHeight)`
- Duration: 0.5s, removed from DOM after completion

---

## 2. Uncheck Item

**Tap target:** Checkbox in the "checked" section

### Animation Sequence (0ms → 750ms)

| Time | What happens |
|------|-------------|
| **0ms** | Checkbox empties with spring pop animation (same keyframe as check) |
| **200ms** | Text un-strikes, row brightens to full opacity (item is now **fully visually restored**) |
| **500ms** | Row fades out + height collapses from checked section |
| **750ms** | Item reappears in its original category position: already in normal state (unchecked, full color), slides up into position (`translateY(12px → 0)`, `opacity 0 → 1`, 0.35s `cubic-bezier(0.25, 0.46, 0.45, 0.94)`) |

**Key principle:** Item must be fully visible and restored before it moves. The user sees it "become unchecked" in the checked section, then it transitions to its proper place.

---

## 3. Rapid Add Flow

### Layout Change

The rapid-add canvas opens **above the existing list** (not as a separate screen). The existing list items are visible below the add zone.

### Add Zone Structure

```
┌─────────────────────────────┐
│ סיום     הוספת פריטים        │  ← header (סיום on LEFT in RTL)
├─────────────────────────────┤
│ פריטים חדשים                │  ← zone label
│ ☐ חלב           מוצרי חלב  │  ← added items
│ ☐ חלה              מאפים   │
│ ☐ נייר כסף       לא ממוין  │
│ ○ הקלד פריט...   לא ממוין  │  ← active input line
├─────────────────────────────┤
│ [suggestion chips]          │  ← above keyboard
├─────────────────────────────┤
│         existing list        │  ← existing items below
│ ירקות ופירות                │
│ ☐ עגבניות          x3      │
│ ...                         │
└─────────────────────────────┘
```

### Input Line Behavior

- **Auto-focus** on entry — keyboard opens immediately
- **Font size: 17px** — prevents iOS zoom
- **Live category pill** on the right of the input line:
  - Default: "לא ממוין" (unsorted) in light gray
  - Updates as you type if the text matches a known item from history
  - No chevron — just the label
- **Enter** → adds item with slide-in animation, input clears, stays focused
- **Tap suggestion chip** → replaces input with that item (including its category from history)
- Suggestions include items already on the current list, marked with "ברשימה" tag

### Added Item Row

- Unchecked box, item name, category pill (right-aligned)
- Slides in with `translateY(-6px → 0)`, `opacity 0 → 1`, 0.3s
- Subtle amber background tint that fades to transparent over ~1s
- **No toast or flash confirmation** — the row animation is the confirmation

### Merge on "סיום" (Done)

When user taps סיום:

1. **Add zone fades out** — opacity 0 + max-height collapses (0.35s)
2. **350ms later** — New items appear in their category positions in the list below
   - Same slide-in animation as check/uncheck: height expands from 0, opacity 0 → 1, subtle amber glow
   - Staggered 150ms apart for each item
   - Amber glow settles to normal background after 0.4s
3. **Header switches** back to list view (list name + search + back button)

### Duplicate Handling

- **Tap suggestion for existing item** → replaces the input text with that item (adds it with its known category)
- **Hit Enter on raw text** → always adds a fresh new item regardless of duplicates

---

## 4. Technical Architecture

### Optimistic Updates (`useRealtimeItems`)

- Add `pendingUpdates` ref: `Map<itemId, { checked, checked_by, timestamp }>`
- Export `optimisticToggle(itemId, checked, checkedBy)` — updates local state immediately
- In `refresh()`: merge fetched data with pending updates (keep optimistic values for items updated < 3s ago)
- Prevents realtime refetch from reverting the optimistic change mid-animation

### Delayed Reclassification (`ListDetailScreen`)

- `transitioningIds` state: `Set<string>` of items currently animating between sections
- Items in `transitioningIds` stay in their **previous** section during animation
- After animation completes (700-950ms), item removed from set and reclassified into correct section
- Supabase update fired as fire-and-forget with `.catch()` that reverts on failure

### Animation Phases (`ItemRow`)

- `isTransitioning` prop from parent
- `animationPhase` state: `'idle' | 'checkbox-pop' | 'text-strike' | 'row-exit'`
- `useEffect` drives phase sequence with timers, cleanup on unmount or rapid re-toggle
- Entrance animation when `isTransitioning` goes `true → false`

### Rapid Add as Overlay

- Add zone rendered at the top of `ListDetailScreen`, not a separate route
- State: `isAddMode: boolean` toggled by `+` button and "סיום"
- New items stored in local state during add mode
- On "סיום": items already persisted to Supabase (each Enter saves), add zone fades out, items slide into their positions in the category groups

---

## 5. Item Actions — Gestures

Replaces the current broken swipe-to-reveal pattern with three distinct gestures:

### Three Gestures

| Gesture | Action |
|---------|--------|
| **Tap checkbox** | Check/uncheck (with ripple + phased animation from sections 1-2) |
| **Long-press row** (0.4s) or **press + drag down** | Opens item detail as a bottom sheet |
| **Swipe left** | Stretching delete — full swipe erases |

### Swipe-to-Delete

- No fixed-size button. The red delete zone **stretches** with the swipe.
- Background red intensity increases as you drag further (`rgba(239,68,68, 0.6→1.0)`)
- "מחיקה" label + trash icon appears at 40px, positioned on the left (start of revealed zone)
- At ~85% of delete threshold: label **throbs** (scales to 1.25) as a "you're about to delete" signal
- **Swipe past 55% of screen width** → item slides off screen, row collapses with height animation, deleted
- **Release before threshold** → snaps back with spring easing
- Row background during press: subtle warm tint (`#f5f0e5`) as press feedback

### Item Detail Sheet (replaces swipe-right-to-detail)

- Opens as a **bottom sheet** sliding up from the bottom (like FB image/post viewer)
- Covers ~70-90% of viewport height
- Rounded top corners (`16px`)
- **Handle bar** at top for drag affordance
- **Header**: avatar + timestamp (left), item name centered, X close button (right)
- **Content**: quantity stepper, unit, category, note textarea, image upload — same as current ItemDetailScreen but inline
- **Dismiss**: swipe the sheet down (100px threshold) or tap X or tap backdrop
- **Backdrop**: semi-transparent black with blur

### Visual Press Feedback

- Row gets warm tint (`#f5f0e5`) immediately on press-down
- Tint clears when:
  - Finger moves (horizontal or vertical) — gesture detected
  - Long-press timer fires — sheet opens
  - Finger lifts — no action taken

---

## 6. Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useRealtimeItems.ts` | Add `optimisticToggle`, `pendingUpdates` merge logic |
| `src/screens/ListDetailScreen.tsx` | `transitioningIds`, fire-and-forget toggle, add-mode overlay, merge animation |
| `src/components/ItemRow.tsx` | `isTransitioning` prop, phased animation, ripple, checkbox-only tap target, long-press + drag-down to open sheet |
| `src/components/SwipeableRow.tsx` | Rewrite — stretching delete with threshold, remove old fixed-button pattern |
| `src/components/CategoryGroup.tsx` | Pass `transitioningIds` through |
| `src/components/ItemDetailSheet.tsx` | New — bottom sheet component for item detail (replaces `ItemDetailScreen` for inline use) |
| `src/index.css` | CSS keyframes for checkbox-spring, ripple-expand, row-enter, sheet transitions |
| `src/screens/RapidAddScreen.tsx` | Remove — rapid add becomes an inline overlay within ListDetailScreen (no separate route) |
| `src/screens/ItemDetailScreen.tsx` | Remove or keep as fallback — detail now opens as a sheet from ListDetailScreen |
| `src/App.tsx` | Remove `/lists/:listId/add` and `/lists/:listId/items/:itemId` routes |

---

## 7. What's NOT Changing

- Lists screen — unchanged
- Login screen — unchanged
- Data model / Supabase schema — unchanged
- Bottom navigation — unchanged
