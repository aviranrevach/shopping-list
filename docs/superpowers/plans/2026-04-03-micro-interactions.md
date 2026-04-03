# Micro-Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make check/uncheck, item adding, delete, and item detail interactions feel instant and satisfying with optimistic updates, phased animations, and gesture-driven UX.

**Architecture:** Optimistic state updates in `useRealtimeItems` with a pending-updates buffer that survives realtime refetches. `ListDetailScreen` manages animation state via `transitioningIds` and `isAddMode`. The old `SwipeableRow` with fixed buttons is replaced by a stretching-delete gesture + long-press-to-detail pattern in `ItemRow`. Rapid add becomes an inline overlay at the top of the list, not a separate route. Item detail becomes a bottom sheet, not a separate page.

**Tech Stack:** React 18, TypeScript, CSS keyframes + transitions (no animation libraries), Pointer Events API (unified mouse + touch)

**Spec:** `docs/superpowers/specs/2026-04-03-micro-interactions-design.md`

---

## File Structure

```
src/
├── index.css                          # Add keyframes: checkbox-spring, ripple-expand, row-enter, row-exit
├── App.tsx                            # Remove /lists/:listId/add and /lists/:listId/items/:itemId routes
├── hooks/
│   └── useRealtimeItems.ts            # Add optimisticToggle + pendingUpdates merge
├── components/
│   ├── SwipeableRow.tsx               # DELETE — no longer used
│   ├── ItemRow.tsx                    # REWRITE — checkbox-only tap, long-press, swipe-to-delete, phased animation
│   ├── CategoryGroup.tsx              # Add transitioningIds prop
│   ├── AddZone.tsx                    # NEW — rapid-add overlay component
│   └── ItemDetailSheet.tsx            # NEW — bottom sheet for item detail
├── screens/
│   ├── ListDetailScreen.tsx           # REWRITE — optimistic toggle, transitioningIds, add-mode, sheet state
│   ├── RapidAddScreen.tsx             # DELETE — replaced by AddZone inline
│   └── ItemDetailScreen.tsx           # DELETE — replaced by ItemDetailSheet
```

---

## Task 1: CSS Keyframes + Utility Classes

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add all animation keyframes and utility classes**

Replace the entire contents of `src/index.css` with:

```css
@import "tailwindcss";

html {
  overflow: hidden;
  height: 100%;
}

body {
  overflow: hidden;
  height: 100%;
  position: relative;
}

#root {
  height: 100%;
  overflow: hidden;
}

/* Checkbox spring pop */
@keyframes checkbox-spring {
  0% { transform: scale(0.7); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
.checkbox-pop {
  animation: checkbox-spring 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* Ripple expand from tap point */
@keyframes ripple-expand {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(5); opacity: 0; }
}

/* Row slide-in entrance (used for new items, uncheck reappear, merge) */
@keyframes row-enter {
  0% { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; margin-bottom: 0; }
  100% { opacity: 1; max-height: 80px; padding-top: 14px; padding-bottom: 14px; margin-bottom: 2px; }
}
.row-entering {
  animation: row-enter 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  overflow: hidden;
}

/* Row with amber glow that settles */
.row-glow {
  background: rgba(245, 158, 11, 0.08);
  transition: background 0.8s ease 0.3s;
}
.row-glow.settled {
  background: transparent;
}

/* Add zone collapse */
.add-zone-exit {
  transition: opacity 0.25s ease, max-height 0.35s ease 0.1s;
}
.add-zone-exit.collapsing {
  opacity: 0;
  max-height: 0 !important;
  overflow: hidden;
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add CSS keyframes for micro-interaction animations"
```

---

## Task 2: Optimistic Updates in useRealtimeItems

**Files:**
- Modify: `src/hooks/useRealtimeItems.ts`

- [ ] **Step 1: Rewrite useRealtimeItems with optimistic toggle and pending updates**

Replace the entire contents of `src/hooks/useRealtimeItems.ts` with:

```ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchItems } from '../data/items';
import type { Item } from '../types';

interface PendingUpdate {
  checked: boolean;
  checked_by: string | null;
  timestamp: number;
}

const PENDING_TTL = 3000; // 3 seconds

export function useRealtimeItems(listId: string | undefined) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());

  const refresh = useCallback(async () => {
    if (!listId) return;
    const fetched = await fetchItems(listId);

    // Merge with pending optimistic updates
    const now = Date.now();
    const merged = fetched.map((item) => {
      const pending = pendingUpdates.current.get(item.id);
      if (pending && now - pending.timestamp < PENDING_TTL) {
        // Keep optimistic value — server hasn't caught up yet
        return { ...item, checked: pending.checked, checked_by: pending.checked_by };
      }
      // Server value wins — clear stale pending
      if (pending) pendingUpdates.current.delete(item.id);
      return item;
    });

    setItems(merged);
    setLoading(false);
  }, [listId]);

  const optimisticToggle = useCallback((itemId: string, checked: boolean, checkedBy: string | null) => {
    pendingUpdates.current.set(itemId, { checked, checked_by: checkedBy, timestamp: Date.now() });
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, checked, checked_by: checkedBy } : item,
      ),
    );
  }, []);

  const optimisticDelete = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const optimisticAdd = useCallback((item: Item) => {
    setItems((prev) => [...prev, item]);
  }, []);

  useEffect(() => {
    if (!listId) return;

    refresh();

    const channel = supabase
      .channel(`items:${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${listId}` },
        () => { refresh(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [listId, refresh]);

  return { items, loading, refresh, optimisticToggle, optimisticDelete, optimisticAdd };
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useRealtimeItems.ts
git commit -m "feat: add optimistic updates to useRealtimeItems with pending buffer"
```

---

## Task 3: Rewrite ItemRow — Checkbox-Only Tap, Gestures, Phased Animation

**Files:**
- Modify: `src/components/ItemRow.tsx`
- Delete: `src/components/SwipeableRow.tsx`

- [ ] **Step 1: Delete SwipeableRow**

```bash
rm src/components/SwipeableRow.tsx
```

- [ ] **Step 2: Rewrite ItemRow**

Replace the entire contents of `src/components/ItemRow.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { Item } from '../types';

type AnimPhase = 'idle' | 'checkbox-pop' | 'text-strike' | 'row-exit';

interface ItemRowProps {
  item: Item;
  onToggleCheck: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
  isTransitioning: boolean;
}

export function ItemRow({ item, onToggleCheck, onDelete, onOpenDetail, isTransitioning }: ItemRowProps) {
  const hasNote = !!item.note;
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const prevChecked = useRef(item.checked);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wasTransitioning = useRef(false);
  const [isEntering, setIsEntering] = useState(false);

  // Swipe state
  const rowRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointerState = useRef({
    startX: 0, startY: 0, dx: 0, dy: 0,
    isH: null as boolean | null,
    isV: null as boolean | null,
    pressing: false,
    longTimer: null as ReturnType<typeof setTimeout> | null,
    longFired: false,
    pointerId: 0,
  });

  // Clean up timers on unmount
  useEffect(() => {
    return () => { timers.current.forEach(clearTimeout); };
  }, []);

  // Detect check/uncheck change → start animation phases
  useEffect(() => {
    if (item.checked !== prevChecked.current) {
      prevChecked.current = item.checked;
      if (isTransitioning) {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setPhase('checkbox-pop');
        timers.current.push(setTimeout(() => setPhase('text-strike'), 200));
        timers.current.push(setTimeout(() => setPhase('row-exit'), item.checked ? 500 : 500));
        timers.current.push(setTimeout(() => setPhase('idle'), item.checked ? 700 : 700));
      }
    }
  }, [item.checked, isTransitioning]);

  // Detect entrance (transitioning → not transitioning)
  useEffect(() => {
    if (wasTransitioning.current && !isTransitioning) {
      setIsEntering(true);
      const t = setTimeout(() => setIsEntering(false), 300);
      return () => clearTimeout(t);
    }
    wasTransitioning.current = isTransitioning;
  }, [isTransitioning]);

  // Ripple effect
  function createRipple() {
    if (!wrapRef.current || !rowRef.current) return;
    const row = rowRef.current;
    const cb = wrapRef.current;
    const rect = row.getBoundingClientRect();
    const cbRect = cb.getBoundingClientRect();
    const cx = cbRect.left - rect.left + cbRect.width / 2;
    const cy = cbRect.top - rect.top + cbRect.height / 2;
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position:absolute; border-radius:50%; pointer-events:none; z-index:1;
      width:${size}px; height:${size}px;
      left:${cx - size / 2}px; top:${cy - size / 2}px;
      background: radial-gradient(circle, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0) 70%);
      animation: ripple-expand 0.5s ease-out forwards;
    `;
    row.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  function handleCheckboxClick(e: React.MouseEvent) {
    e.stopPropagation();
    createRipple();
    onToggleCheck();
  }

  // Pointer handlers for swipe-to-delete + long-press
  function handlePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-checkbox]')) return;
    const s = pointerState.current;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.dx = 0; s.dy = 0;
    s.isH = null; s.isV = null;
    s.longFired = false;
    s.pressing = true;
    s.pointerId = e.pointerId;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    rowRef.current?.classList.add('bg-amber-50');

    s.longTimer = setTimeout(() => {
      if (!s.pressing || s.isH) return;
      s.longFired = true;
      rowRef.current?.classList.remove('bg-amber-50');
      onOpenDetail();
    }, 400);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const s = pointerState.current;
    if (!s.pressing) return;
    s.dx = e.clientX - s.startX;
    s.dy = e.clientY - s.startY;

    if (Math.abs(s.dx) > 5 || Math.abs(s.dy) > 5) {
      if (s.longTimer) { clearTimeout(s.longTimer); s.longTimer = null; }
      rowRef.current?.classList.remove('bg-amber-50');
    }

    if (s.isH === null && s.isV === null && (Math.abs(s.dx) > 8 || Math.abs(s.dy) > 8)) {
      if (Math.abs(s.dx) > Math.abs(s.dy)) {
        s.isH = true;
      } else {
        s.isV = true;
        if (s.dy > 30 && !s.longFired) {
          s.longFired = true;
          s.pressing = false;
          onOpenDetail();
          return;
        }
      }
    }

    if (s.isV && s.dy > 30 && !s.longFired) {
      s.longFired = true;
      s.pressing = false;
      onOpenDetail();
      return;
    }

    // Horizontal swipe: stretch delete
    if (s.isH && rowRef.current && wrapRef.current) {
      e.preventDefault();
      const swipeDx = Math.max(0, s.dx); // RTL: positive = visual left swipe
      const row = rowRef.current;
      const wrap = wrapRef.current.closest('[data-swipe-wrap]') as HTMLElement;
      row.style.transition = 'none';
      row.style.transform = `translateX(${swipeDx}px)`;

      if (wrap) {
        const screenW = window.innerWidth;
        const deleteThreshold = screenW * 0.55;
        const intensity = Math.min(1, swipeDx / 200);
        wrap.style.background = `rgba(239, 68, 68, ${0.6 + intensity * 0.4})`;

        const dlab = wrap.querySelector('[data-delete-label]') as HTMLElement;
        if (dlab) {
          dlab.style.opacity = swipeDx > 40 ? '1' : '0';
          const nearThreshold = swipeDx > deleteThreshold * 0.85;
          dlab.style.transform = nearThreshold ? 'scale(1.25)' : 'scale(1)';
        }
      }
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const s = pointerState.current;
    if (s.longTimer) { clearTimeout(s.longTimer); s.longTimer = null; }
    s.pressing = false;
    rowRef.current?.classList.remove('bg-amber-50');

    if (s.isH && rowRef.current) {
      const swipeDx = Math.max(0, s.dx);
      const screenW = window.innerWidth;
      const row = rowRef.current;
      const wrap = row.closest('[data-swipe-wrap]') as HTMLElement;

      if (swipeDx > screenW * 0.55) {
        // Delete
        row.style.transition = 'transform 0.2s ease';
        row.style.transform = `translateX(${screenW}px)`;
        setTimeout(() => onDelete(), 200);
      } else {
        // Snap back
        row.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        row.style.transform = 'translateX(0)';
        if (wrap) {
          wrap.style.background = '';
          const dlab = wrap.querySelector('[data-delete-label]') as HTMLElement;
          if (dlab) { dlab.style.opacity = '0'; dlab.style.transform = 'scale(1)'; }
        }
      }
    }

    s.isH = null;
    s.isV = null;
  }

  // Row style based on animation phase
  const rowExitStyle: React.CSSProperties = phase === 'row-exit'
    ? { opacity: 0, maxHeight: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, overflow: 'hidden',
        transition: 'opacity 0.2s ease, max-height 0.25s ease, padding 0.25s ease, margin 0.25s ease' }
    : {};

  const rowFadeStyle: React.CSSProperties =
    (phase === 'text-strike' && item.checked) ? { opacity: 0.2, transition: 'opacity 0.3s ease' } : {};

  const textClass =
    phase === 'text-strike' || phase === 'row-exit'
      ? item.checked
        ? 'line-through text-gray-400 transition-all duration-200'
        : 'no-underline text-gray-900 transition-all duration-200'
      : item.checked
        ? 'line-through text-gray-500'
        : '';

  return (
    <div
      data-swipe-wrap
      className={`relative overflow-hidden rounded-xl mb-0.5 ${isEntering ? 'row-entering' : ''}`}
      style={rowExitStyle}
    >
      {/* Delete background */}
      <div className="absolute inset-0 bg-red-500/0">
        <div
          data-delete-label
          className="absolute top-0 bottom-0 left-5 flex items-center gap-2 text-white font-semibold text-[15px]"
          style={{ opacity: 0, transition: 'opacity 0.15s, transform 0.15s', transform: 'scale(1)' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          מחיקה
        </div>
      </div>

      {/* Row content */}
      <div
        ref={rowRef}
        className="relative z-[1] bg-gray-50 flex items-center gap-3 px-4 py-3.5 transition-colors duration-100"
        style={{ ...rowFadeStyle, touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Checkbox — separate tap target */}
        <div
          ref={wrapRef}
          data-checkbox
          className="flex-shrink-0 cursor-pointer w-9 h-9 flex items-center justify-center"
          onClick={handleCheckboxClick}
        >
          {item.checked ? (
            <div className={`w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center ${phase === 'checkbox-pop' ? 'checkbox-pop' : ''}`}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : (
            <div className={`w-7 h-7 border-2 border-gray-300 rounded-lg hover:border-amber-400 transition-colors duration-100 ${phase === 'checkbox-pop' ? 'checkbox-pop' : ''}`} />
          )}
        </div>

        {/* Item name */}
        <span className={`text-[17px] text-gray-900 flex-1 ${textClass}`}>
          {item.name}
        </span>

        {/* Quantity pill */}
        {item.quantity > 1 && (
          <span className="bg-gray-200 text-gray-600 text-sm px-2.5 py-0.5 rounded-lg font-medium">
            x{item.quantity}
          </span>
        )}

        {/* Note indicator */}
        {hasNote && (
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: May have errors in files that import `SwipeableRow` — those are fixed in later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/components/ItemRow.tsx
git rm src/components/SwipeableRow.tsx
git commit -m "feat: rewrite ItemRow with checkbox-only tap, swipe-to-delete, long-press, phased animation"
```

---

## Task 4: Update CategoryGroup to Pass transitioningIds

**Files:**
- Modify: `src/components/CategoryGroup.tsx`

- [ ] **Step 1: Update CategoryGroup**

Replace the entire contents of `src/components/CategoryGroup.tsx` with:

```tsx
import { useI18n } from '../i18n';
import type { Item } from '../types';
import { ItemRow } from './ItemRow';

interface CategoryGroupProps {
  category: string;
  items: Item[];
  onToggleCheck: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onOpenDetail: (itemId: string) => void;
  transitioningIds: Set<string>;
}

export function CategoryGroup({ category, items, onToggleCheck, onDelete, onOpenDetail, transitioningIds }: CategoryGroupProps) {
  const { t } = useI18n();

  return (
    <div className="mb-4">
      <div className="text-[15px] text-gray-400 font-medium mb-2 px-1">
        {category === 'checked_section' ? t('list_detail.checked_section') : t(`categories.${category}`)}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            isTransitioning={transitioningIds.has(item.id)}
            onToggleCheck={() => onToggleCheck(item.id)}
            onDelete={() => onDelete(item.id)}
            onOpenDetail={() => onOpenDetail(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/CategoryGroup.tsx
git commit -m "feat: update CategoryGroup to pass transitioningIds to ItemRow"
```

---

## Task 5: Create AddZone Component (Inline Rapid Add)

**Files:**
- Create: `src/components/AddZone.tsx`

- [ ] **Step 1: Create AddZone**

Create `src/components/AddZone.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n';
import { useItemSuggestions } from '../hooks/useItemSuggestions';
import { createItem } from '../data/items';
import { SuggestionChips } from './SuggestionChips';
import type { Item } from '../types';

interface AddedItem {
  id: string;
  name: string;
  category: string;
}

interface AddZoneProps {
  listId: string;
  userId: string;
  groupId: string;
  existingItemNames: string[];
  onDone: (newItems: AddedItem[]) => void;
  onItemAdded: (item: Item) => void;
}

export function AddZone({ listId, userId, groupId, existingItemNames, onDone, onItemAdded }: AddZoneProps) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const suggestions = useItemSuggestions(groupId, input);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Live category based on best match
  const liveCategory = (() => {
    if (!input.trim()) return 'לא ממוין';
    const exact = suggestions.find((s) => s.name === input.trim());
    if (exact) return exact.category === 'other' ? 'לא ממוין' : exact.category;
    if (suggestions.length === 1) {
      const cat = suggestions[0].category;
      return cat === 'other' ? 'לא ממוין' : cat;
    }
    return 'לא ממוין';
  })();

  const liveCategoryLabel = liveCategory === 'לא ממוין' ? 'לא ממוין' : t(`categories.${liveCategory}`);

  async function handleSubmit() {
    if (!input.trim()) return;
    const name = input.trim();
    const match = suggestions.find((s) => s.name === name);
    const category = match?.category ?? 'other';

    const item = await createItem(listId, userId, name, category);
    const added = { id: item.id, name: item.name, category: item.category };
    setAddedItems((prev) => [...prev, added]);
    onItemAdded(item);
    setInput('');
    inputRef.current?.focus();
  }

  function handleSelectSuggestion(suggestion: { name: string; category: string }) {
    createItem(listId, userId, suggestion.name, suggestion.category).then((item) => {
      const added = { id: item.id, name: item.name, category: item.category };
      setAddedItems((prev) => [...prev, added]);
      onItemAdded(item);
    });
    setInput('');
    inputRef.current?.focus();
  }

  function handleDone() {
    if (zoneRef.current) {
      zoneRef.current.style.maxHeight = zoneRef.current.offsetHeight + 'px';
    }
    setIsCollapsing(true);
    setTimeout(() => onDone(addedItems), 350);
  }

  // Mark suggestions that are already on the list
  const enrichedSuggestions = suggestions.map((s) => ({
    ...s,
    onList: existingItemNames.includes(s.name),
  }));

  return (
    <>
      <div
        ref={zoneRef}
        className={`bg-amber-50/30 border-b-2 border-amber-100 add-zone-exit ${isCollapsing ? 'collapsing' : ''}`}
      >
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-amber-100/50">
          <button onClick={handleDone} className="text-amber-600 font-semibold text-[15px]">
            {t('rapid_add.done')}
          </button>
          <h2 className="text-[17px] font-semibold text-gray-900 flex-1 text-center">
            {t('rapid_add.title')}
          </h2>
          <div className="w-10" />
        </div>

        {/* Added items */}
        {addedItems.length > 0 && (
          <div className="px-4 pt-2">
            <div className="text-xs text-gray-300 font-medium mb-1">פריטים חדשים</div>
          </div>
        )}
        {addedItems.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100/50 row-glow"
            style={{ animationDelay: `${i * 50}ms` }}
            ref={(el) => { if (el) setTimeout(() => el.classList.add('settled'), 100); }}
          >
            <div className="w-5 h-5 border-2 border-gray-300 rounded-md flex-shrink-0" />
            <span className="text-[17px] text-gray-500">{item.name}</span>
            <div className="flex-1" />
            <span className={`text-sm px-2.5 py-0.5 rounded-lg ${
              item.category === 'other' ? 'bg-gray-200 text-gray-400' : 'bg-gray-200 text-gray-500'
            }`}>
              {item.category === 'other' ? 'לא ממוין' : t(`categories.${item.category}`)}
            </span>
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <div className="w-5 h-5 border-2 border-gray-200 rounded-md flex-shrink-0 opacity-30" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
            }}
            placeholder={t('rapid_add.input_placeholder')}
            className="flex-1 text-[17px] outline-none bg-transparent text-gray-900 placeholder:text-gray-300"
          />
          <span className={`text-sm px-2.5 py-0.5 rounded-lg ${
            liveCategoryLabel === 'לא ממוין' ? 'bg-gray-200 text-gray-400' : 'bg-gray-200 text-gray-500'
          }`}>
            {liveCategoryLabel}
          </span>
        </div>
      </div>

      {/* Suggestion chips */}
      <SuggestionChips suggestions={enrichedSuggestions} onSelect={handleSelectSuggestion} />
    </>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/AddZone.tsx
git commit -m "feat: create AddZone component for inline rapid-add overlay"
```

---

## Task 6: Create ItemDetailSheet (Bottom Sheet)

**Files:**
- Create: `src/components/ItemDetailSheet.tsx`

- [ ] **Step 1: Create ItemDetailSheet**

Create `src/components/ItemDetailSheet.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { supabase } from '../lib/supabase';
import { updateItem } from '../data/items';
import { fetchItemImages, uploadItemImage, deleteItemImage, getImageUrl } from '../data/images';
import { Avatar } from './Avatar';
import { CATEGORIES, UNITS } from '../types';
import type { Item, ItemImage, GroupMember } from '../types';

interface ItemDetailSheetProps {
  itemId: string;
  onClose: () => void;
}

export function ItemDetailSheet({ itemId, onClose }: ItemDetailSheetProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { group } = useGroup(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [item, setItem] = useState<Item | null>(null);
  const [images, setImages] = useState<ItemImage[]>([]);
  const [addedBy, setAddedBy] = useState<GroupMember | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Drag-to-dismiss
  const dragStart = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    supabase.from('items').select('*').eq('id', itemId).single().then(({ data }) => {
      if (data) setItem(data as Item);
    });
    fetchItemImages(itemId).then(setImages);

    // Animate in
    requestAnimationFrame(() => setIsOpen(true));
  }, [itemId]);

  useEffect(() => {
    if (!item?.added_by) return;
    supabase.from('group_members').select('*').eq('user_id', item.added_by).single().then(({ data }) => {
      if (data) setAddedBy(data as GroupMember);
    });
  }, [item?.added_by]);

  function handleClose() {
    setIsOpen(false);
    setTimeout(onClose, 300);
  }

  async function handleUpdate(updates: Partial<Item>) {
    if (!item) return;
    const updated = await updateItem(itemId, updates);
    setItem(updated);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !group) return;
    setUploading(true);
    try {
      const image = await uploadItemImage(group.id, itemId, file);
      setImages((prev) => [...prev, image]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteImage(img: ItemImage) {
    await deleteItemImage(img);
    setImages((prev) => prev.filter((i) => i.id !== img.id));
  }

  function handleSheetPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-sheet-body]')) return;
    dragStart.current = e.clientY;
    dragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }

  function handleSheetPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !sheetRef.current) return;
    const dy = e.clientY - dragStart.current;
    if (dy > 0) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  }

  function handleSheetPointerUp(e: React.PointerEvent) {
    if (!dragging.current || !sheetRef.current) return;
    dragging.current = false;
    sheetRef.current.style.transition = '';
    const dy = e.clientY - dragStart.current;
    if (dy > 100) {
      handleClose();
    } else {
      sheetRef.current.style.transform = '';
    }
  }

  if (!item) return null;

  const timeStr = new Date(item.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-colors duration-300 ${isOpen ? 'bg-black/50' : 'bg-black/0'}`}
        style={{ backdropFilter: isOpen ? 'blur(2px)' : 'none', WebkitBackdropFilter: isOpen ? 'blur(2px)' : 'none' }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 bottom-0 z-[51] bg-white rounded-t-2xl transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ minHeight: '70vh', maxHeight: '90vh', overflowY: 'auto' }}
        onPointerDown={handleSheetPointerDown}
        onPointerMove={handleSheetPointerMove}
        onPointerUp={handleSheetPointerUp}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-1.5 min-w-[60px]">
            {addedBy && <Avatar name={addedBy.display_name} avatarUrl={addedBy.avatar_url} size="sm" />}
            <span className="text-xs text-gray-300">{timeStr}</span>
          </div>
          <h2 className="text-[17px] font-semibold text-gray-900 flex-1 text-center">{item.name}</h2>
          <button onClick={handleClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div data-sheet-body className="p-4 space-y-4 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
          {/* Quantity + Unit */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.quantity')}</label>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <button onClick={() => handleUpdate({ quantity: Math.max(1, item.quantity - 1) })} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
                <span className="text-xl font-bold text-gray-900">{item.quantity}</span>
                <button onClick={() => handleUpdate({ quantity: item.quantity + 1 })} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.unit')}</label>
              <select value={item.unit ?? 'unit'} onChange={(e) => handleUpdate({ unit: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none text-gray-700">
                {UNITS.map((u) => (<option key={u} value={u}>{t(`units.${u}`)}</option>))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.category')}</label>
            <select value={item.category} onChange={(e) => handleUpdate({ category: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none text-gray-700">
              {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{t(`categories.${cat}`)}</option>))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.note')}</label>
            <textarea value={item.note ?? ''} onChange={(e) => handleUpdate({ note: e.target.value || null })} placeholder="..." rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none text-gray-700 resize-none" />
          </div>

          {/* Images */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.images')}</label>
            <div className="space-y-2">
              {images.map((image) => (
                <div key={image.id} className="relative rounded-xl overflow-hidden">
                  <img src={getImageUrl(image.storage_path)} alt="" className="w-full h-auto rounded-xl" />
                  <button onClick={() => handleDeleteImage(image)} className="absolute top-2 end-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full h-14 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 text-sm">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    {t('item_detail.add_image')}
                  </>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/ItemDetailSheet.tsx
git commit -m "feat: create ItemDetailSheet bottom sheet component"
```

---

## Task 7: Rewrite ListDetailScreen — Orchestrate Everything

**Files:**
- Modify: `src/screens/ListDetailScreen.tsx`

- [ ] **Step 1: Rewrite ListDetailScreen**

Replace the entire contents of `src/screens/ListDetailScreen.tsx` with:

```tsx
import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { useRealtimeItems } from '../hooks/useRealtimeItems';
import { toggleItemChecked, deleteItem } from '../data/items';
import { CategoryGroup } from '../components/CategoryGroup';
import { BottomNav } from '../components/BottomNav';
import { AddZone } from '../components/AddZone';
import { ItemDetailSheet } from '../components/ItemDetailSheet';
import { CATEGORIES } from '../types';

export function ListDetailScreen() {
  const { t } = useI18n();
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const { group } = useGroup(user?.id);
  const { items, loading, optimisticToggle, optimisticDelete, optimisticAdd } = useRealtimeItems(listId);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isAddMode, setIsAddMode] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [transitioningIds, setTransitioningIds] = useState<Set<string>>(new Set());
  const [mergingIds, setMergingIds] = useState<Set<string>>(new Set());
  const transitionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  // Grouping with transitioning awareness
  const { unchecked, checked } = useMemo(() => {
    const unchecked = filteredItems.filter((i) => {
      if (transitioningIds.has(i.id)) {
        // Item is animating — keep in previous section
        return i.checked; // was just checked → was unchecked → keep here
      }
      return !i.checked;
    });
    const checked = filteredItems.filter((i) => {
      if (transitioningIds.has(i.id)) {
        return !i.checked; // was just unchecked → was checked → keep here
      }
      return i.checked;
    });
    return { unchecked, checked };
  }, [filteredItems, transitioningIds]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, typeof unchecked>();
    for (const cat of CATEGORIES) {
      const catItems = unchecked.filter((i) => i.category === cat);
      if (catItems.length > 0) groups.set(cat, catItems);
    }
    return groups;
  }, [unchecked]);

  const handleToggleCheck = useCallback((itemId: string) => {
    if (!user) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const newChecked = !item.checked;

    // 1. Optimistic update
    optimisticToggle(itemId, newChecked, newChecked ? user.id : null);

    // 2. Mark as transitioning
    setTransitioningIds((prev) => new Set(prev).add(itemId));

    // Cancel previous timer for this item
    const existing = transitionTimers.current.get(itemId);
    if (existing) clearTimeout(existing);

    // 3. Remove from transitioning after animation
    const timer = setTimeout(() => {
      setTransitioningIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      transitionTimers.current.delete(itemId);
    }, newChecked ? 950 : 750);
    transitionTimers.current.set(itemId, timer);

    // 4. Fire-and-forget to Supabase
    toggleItemChecked(itemId, newChecked, user.id).catch((err) => {
      console.error('Toggle failed, reverting', err);
      optimisticToggle(itemId, !newChecked, !newChecked ? user.id : null);
    });
  }, [user, items, optimisticToggle]);

  const handleDelete = useCallback((itemId: string) => {
    optimisticDelete(itemId);
    deleteItem(itemId).catch((err) => {
      console.error('Delete failed', err);
    });
  }, [optimisticDelete]);

  function handleOpenDetail(itemId: string) {
    setDetailItemId(itemId);
  }

  function handleAddDone(newItems: { id: string; name: string; category: string }[]) {
    setIsAddMode(false);
    // Trigger merge animation for new items
    const ids = new Set(newItems.map((i) => i.id));
    setMergingIds(ids);
    setTimeout(() => setMergingIds(new Set()), 1500);
  }

  const existingItemNames = useMemo(() => items.map((i) => i.name), [items]);

  return (
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      {/* Top bar */}
      {!isAddMode && (
        <header className="bg-white px-3 py-2.5 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
          <button onClick={() => navigate('/lists')} className="p-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="font-semibold text-base text-gray-900 whitespace-nowrap">🕯️ List</span>
          <div className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('list_detail.search_placeholder')}
              className="bg-transparent text-base outline-none flex-1 text-gray-700 placeholder:text-gray-300"
            />
          </div>
          <button
            onClick={() => setIsAddMode(true)}
            className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </header>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {/* Add zone overlay at top */}
        {isAddMode && listId && user && group && (
          <AddZone
            listId={listId}
            userId={user.id}
            groupId={group.id}
            existingItemNames={existingItemNames}
            onDone={handleAddDone}
            onItemAdded={optimisticAdd}
          />
        )}

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {Array.from(groupedByCategory.entries()).map(([category, catItems]) => (
                <CategoryGroup
                  key={category}
                  category={category}
                  items={catItems}
                  onToggleCheck={handleToggleCheck}
                  onDelete={handleDelete}
                  onOpenDetail={handleOpenDetail}
                  transitioningIds={transitioningIds}
                />
              ))}
              {checked.length > 0 && (
                <CategoryGroup
                  category="checked_section"
                  items={checked}
                  onToggleCheck={handleToggleCheck}
                  onDelete={handleDelete}
                  onOpenDetail={handleOpenDetail}
                  transitioningIds={transitioningIds}
                />
              )}
              {items.length === 0 && !isAddMode && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  {t('rapid_add.input_placeholder')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!isAddMode && <BottomNav />}

      {/* Item detail sheet */}
      {detailItemId && (
        <ItemDetailSheet itemId={detailItemId} onClose={() => setDetailItemId(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/screens/ListDetailScreen.tsx
git commit -m "feat: rewrite ListDetailScreen with optimistic toggle, add-mode overlay, and detail sheet"
```

---

## Task 8: Clean Up Routes and Remove Old Files

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/screens/RapidAddScreen.tsx`
- Delete: `src/screens/ItemDetailScreen.tsx`

- [ ] **Step 1: Update App.tsx to remove old routes**

Replace the entire contents of `src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useGroup } from './hooks/useGroup';
import { LoginScreen } from './screens/LoginScreen';
import { ListsScreen } from './screens/ListsScreen';
import { ListDetailScreen } from './screens/ListDetailScreen';

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { loading: groupLoading, error: groupError } = useGroup(user?.id);

  if (groupError) {
    console.error('[App] group error:', groupError);
  }

  if (authLoading || (user && groupLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/lists" element={<ListsScreen />} />
      <Route path="/lists/:listId" element={<ListDetailScreen />} />
      <Route path="*" element={<Navigate to="/lists" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Delete old screen files**

```bash
rm src/screens/RapidAddScreen.tsx
rm src/screens/ItemDetailScreen.tsx
```

- [ ] **Step 3: Verify full build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git rm src/screens/RapidAddScreen.tsx src/screens/ItemDetailScreen.tsx
git commit -m "feat: clean up routes, remove old RapidAdd and ItemDetail screens"
```

- [ ] **Step 5: Push**

```bash
git push
```

---

## Verification

After all tasks, test in the browser:

1. **Check item**: Tap checkbox → ripple + pop → text strikes → row fades → row collapses → appears in checked section with slide-in
2. **Uncheck item**: Tap checkbox in checked section → pop → text restores → row fades from checked → appears in original category with slide-up
3. **Rapid toggle**: Check, immediately uncheck → animations cancel cleanly, no broken state
4. **Swipe to delete**: Swipe left → red zone stretches → "מחיקה" appears → keep going → throb at threshold → full swipe deletes with collapse
5. **Swipe and release**: Partial swipe → snaps back cleanly
6. **Long-press**: Hold item → warm tint → detail sheet slides up from bottom
7. **Detail sheet dismiss**: Drag sheet down → dismisses. Tap X → dismisses. Tap backdrop → dismisses.
8. **Rapid add (+)**: Tap + → add zone appears at top. Type, Enter → item added with slide-in. Tap סיום → zone fades, items appear in categories with amber glow
9. **Optimistic feel**: All actions instant — no waiting for Supabase
10. **Mobile Safari**: Test on iPhone — no page bouncing, smooth gestures
