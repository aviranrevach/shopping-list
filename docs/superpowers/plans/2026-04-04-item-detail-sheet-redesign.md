# Item Detail Sheet Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the item detail sheet to be compact, scannable and comfortable — combined name+note box, inline qty+unit row with collapsible unit picker, flex-wrap category pills with pastel tints, image row, and delete button at the bottom.

**Architecture:** All changes are isolated to `ItemDetailSheet.tsx` (full visual redesign) and `ItemRow.tsx` (add three-dot trigger button). No new files, no new hooks, no data layer changes. The `useCategories` hook already provides `allCategories` and `addCategory` — we use them as-is.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, existing `useTheme`, `useCategories`, `useGroup`, `useAuth` hooks.

---

## File Map

| File | What changes |
|------|-------------|
| `src/components/ItemRow.tsx` | Add ⋯ button inside the row content div, right side |
| `src/components/ItemDetailSheet.tsx` | Full visual redesign — all sections |

---

### Task 1: Add three-dot button to ItemRow

**Files:**
- Modify: `src/components/ItemRow.tsx`

The row currently has: `[checkbox] [name + note] [spacer]`. We add a `⋯` button on the far right that calls `onOpenDetail()` without triggering the swipe logic.

- [ ] **Step 1: Add the three-dot button inside the row content div**

In `src/components/ItemRow.tsx`, find the row content `<div>` that contains the checkbox and item name. Add this button as the last child, after the name/note div:

```tsx
{/* Three-dot detail trigger */}
<button
  data-nodrag
  onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
  onPointerDown={(e) => e.stopPropagation()}
  className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 active:text-gray-500"
  style={{ touchAction: 'manipulation' }}
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
  </svg>
</button>
```

Also update `handlePointerDown` to skip when the target is `[data-nodrag]`:

```tsx
function handlePointerDown(e: React.PointerEvent) {
  if ((e.target as HTMLElement).closest('[data-checkbox]')) return;
  if ((e.target as HTMLElement).closest('[data-nodrag]')) return;  // add this line
  // ... rest unchanged
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`, open a list, confirm the ⋯ button appears on the right of every row, tapping it opens the detail sheet, and swipe-to-delete still works normally.

- [ ] **Step 3: Commit**

```bash
git add src/components/ItemRow.tsx
git commit -m "feat: add three-dot button to item row to open detail sheet"
```

---

### Task 2: Redesign the header

**Files:**
- Modify: `src/components/ItemDetailSheet.tsx`

The header currently has: `[back] [title] [avatar+time] [trash]`. New design: `[back] [title] [avatar stacked over time]` — trash removed from header (delete moves to bottom).

- [ ] **Step 1: Replace the header JSX**

Find the header `<div>` in `ItemDetailSheet.tsx` (the sticky div with `className="flex items-center px-4 py-3 border-b..."`) and replace it entirely:

```tsx
{/* Header */}
<div className="flex items-center px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10" style={{ direction: 'rtl' }}>
  {/* Back */}
  <button onClick={handleClose} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  </button>

  {/* Title */}
  <h2 className="text-[17px] font-semibold text-gray-900 flex-1 text-center">{item?.name ?? ''}</h2>

  {/* Avatar + time stacked, top-aligned */}
  {addedBy && (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0" style={{ alignSelf: 'flex-start', paddingTop: 2 }}>
      <Avatar name={addedBy.display_name} avatarUrl={addedBy.avatar_url} size="sm" />
      <span className="text-[9px] text-gray-300">{timeStr}</span>
    </div>
  )}
</div>
```

- [ ] **Step 2: Verify**

Run `npm run dev`, open item detail. Confirm: back button left, title centered, avatar+time stacked on the right. No trash icon in the header.

- [ ] **Step 3: Commit**

```bash
git add src/components/ItemDetailSheet.tsx
git commit -m "redesign: item detail header — avatar+time stacked, trash removed from header"
```

---

### Task 3: Combined name + note box

**Files:**
- Modify: `src/components/ItemDetailSheet.tsx`

Replace the separate "שם פריט" input and the separate note textarea with one combined box split by a divider.

- [ ] **Step 1: Replace name + note fields in the body**

Find the two separate field divs (the `<div>` with `label "שם פריט"` and the `<div>` with `label` for note). Replace both with:

```tsx
{/* Name + Note — combined box */}
<div>
  <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 block" style={{ letterSpacing: '0.06em' }}>פריט</label>
  <div className="bg-gray-50 border border-gray-200 rounded-[13px] overflow-hidden">
    <input
      value={localName}
      onChange={(e) => setLocalName(e.target.value)}
      onFocus={(e) => { e.currentTarget.parentElement!.style.borderColor = scheme.primaryLight; }}
      onBlur={(e) => {
        e.currentTarget.parentElement!.style.borderColor = '#e5e7eb';
        if (localName !== item.name) handleUpdate({ name: localName });
      }}
      className="w-full bg-transparent px-4 py-3 text-base font-semibold text-gray-900 outline-none border-b border-gray-200"
      style={{ direction: 'rtl' }}
    />
    <textarea
      value={localNote}
      onChange={(e) => setLocalNote(e.target.value)}
      onBlur={() => {
        const val = localNote || null;
        if (val !== (item.note ?? null)) handleUpdate({ note: val });
      }}
      placeholder="הוסף הערה..."
      rows={2}
      className="w-full bg-transparent px-4 py-2.5 text-sm text-gray-500 outline-none resize-none placeholder:text-gray-300"
      style={{ direction: 'rtl' }}
    />
  </div>
</div>
```

- [ ] **Step 2: Verify**

Open item detail. Confirm: one rounded box, name on top (bold), thin divider, note textarea below. Editing name and blurring saves to Supabase. Editing note and blurring saves.

- [ ] **Step 3: Commit**

```bash
git add src/components/ItemDetailSheet.tsx
git commit -m "redesign: combine name + note into one split box"
```

---

### Task 4: Quantity row with collapsible unit picker

**Files:**
- Modify: `src/components/ItemDetailSheet.tsx`

Replace the separate quantity stepper and unit `<select>` with one row: `− [num] [unit▾] spacer +`. Tapping the unit pill toggles a 3-column picker below.

- [ ] **Step 1: Add `showUnitPicker` state**

At the top of the component, with the other state declarations, add:

```tsx
const [showUnitPicker, setShowUnitPicker] = useState(false);
```

- [ ] **Step 2: Replace the quantity + unit section**

Find the `<div className="flex gap-3">` that wraps the quantity and unit blocks. Replace the entire div (both the quantity card and the unit select) with:

```tsx
{/* Quantity + Unit */}
<div>
  <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 block" style={{ letterSpacing: '0.06em' }}>{t('item_detail.quantity')}</label>

  {/* Main row */}
  <div className="bg-gray-50 border border-gray-200 rounded-[13px] px-3 py-2.5 flex items-center">
    <button
      onClick={() => handleUpdate({ quantity: Math.max(1, item.quantity - 1) })}
      className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
    >
      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12" /></svg>
    </button>
    <span className="text-2xl font-black text-gray-900 min-w-[44px] text-center">{item.quantity}</span>
    <button
      onClick={() => setShowUnitPicker(p => !p)}
      className="px-3 py-1.5 rounded-lg text-sm font-bold text-white flex-shrink-0 mx-2"
      style={{ background: scheme.primary }}
    >
      {t(`units.${item.unit ?? 'unit'}`)} {showUnitPicker ? '▴' : '▾'}
    </button>
    <div className="flex-1" />
    <button
      onClick={() => handleUpdate({ quantity: item.quantity + 1 })}
      className="w-9 h-9 bg-white rounded-xl flex items-center justify-content shadow-sm flex-shrink-0"
    >
      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
    </button>
  </div>

  {/* Unit picker — appears below when open */}
  {showUnitPicker && (
    <div
      className="mt-1.5 rounded-[13px] p-2 grid grid-cols-3 gap-1.5"
      style={{ border: `1.5px solid ${scheme.primaryLight}`, background: '#fafaf8' }}
    >
      {UNITS.map((u) => (
        <button
          key={u}
          onClick={() => { handleUpdate({ unit: u }); setShowUnitPicker(false); }}
          className="py-2 rounded-xl text-sm font-semibold text-center"
          style={
            (item.unit ?? 'unit') === u
              ? { background: scheme.primary, color: '#fff' }
              : { background: '#fff', color: '#666', border: '1px solid #e5e7eb' }
          }
        >
          {t(`units.${u}`)}
        </button>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 3: Verify**

Open item detail. Confirm: one row with `−`, number, amber unit pill, spacer, `+`. Tapping unit pill opens 3-column grid. Selecting a unit updates the item and closes the grid. The selected unit is highlighted.

- [ ] **Step 4: Commit**

```bash
git add src/components/ItemDetailSheet.tsx
git commit -m "redesign: qty row with collapsible unit picker"
```

---

### Task 5: Category pills with pastel tints + collapsible

**Files:**
- Modify: `src/components/ItemDetailSheet.tsx`

Replace the existing `grid grid-cols-2` category pills with flex-wrap pills with tints, collapsed to 2 rows by default.

- [ ] **Step 1: Add category tint map and collapse state**

At the top of the component body (after the existing state), add:

```tsx
const [catExpanded, setCatExpanded] = useState(false);
const catPillsRef = useRef<HTMLDivElement>(null);
const [catCollapseHeight, setCatCollapseHeight] = useState<number | null>(null);

const CATEGORY_TINTS: Record<string, { bg: string; color: string; activeBg: string }> = {
  produce:   { bg: '#f0fdf4', color: '#166534', activeBg: '#bbf7d0' },
  dairy:     { bg: '#eff6ff', color: '#1d4ed8', activeBg: '#bfdbfe' },
  meat_fish: { bg: '#fef2f2', color: '#b91c1c', activeBg: '#fecaca' },
  bakery:    { bg: '#fffbeb', color: '#92400e', activeBg: '#fde68a' },
  frozen:    { bg: '#f0f9ff', color: '#0369a1', activeBg: '#bae6fd' },
  canned:    { bg: '#fff7ed', color: '#c2410c', activeBg: '#fed7aa' },
  snacks:    { bg: '#fdf4ff', color: '#7e22ce', activeBg: '#e9d5ff' },
  household: { bg: '#f0fdfa', color: '#0f766e', activeBg: '#99f6e4' },
  hygiene:   { bg: '#fdf2f8', color: '#be185d', activeBg: '#fbcfe8' },
  spices:    { bg: '#fefce8', color: '#a16207', activeBg: '#fef08a' },
  baking:    { bg: '#fff1f2', color: '#be123c', activeBg: '#fda4af' },
  other:     { bg: '#f8fafc', color: '#475569', activeBg: '#cbd5e1' },
};

function getTint(key: string) {
  return CATEGORY_TINTS[key] ?? { bg: '#f5f5f5', color: '#555', activeBg: '#e0e0e0' };
}
```

- [ ] **Step 2: Measure 2-row height after pills render**

Add this effect after the state declarations:

```tsx
useEffect(() => {
  if (!catPillsRef.current) return;
  const pills = Array.from(catPillsRef.current.children) as HTMLElement[];
  if (pills.length < 3) return;
  // Find first pill whose offsetTop differs from the third pill's row
  const firstTop = pills[0].offsetTop;
  let thirdRowTop: number | null = null;
  let rowCount = 1;
  let lastTop = firstTop;
  for (const pill of pills) {
    if (pill.offsetTop > lastTop + 4) {
      rowCount++;
      lastTop = pill.offsetTop;
      if (rowCount === 3) { thirdRowTop = pill.offsetTop; break; }
    }
  }
  if (thirdRowTop !== null) {
    setCatCollapseHeight(thirdRowTop - 2); // clip just before 3rd row
  }
}, [allCategories, item]);
```

- [ ] **Step 3: Also add `newCatName` state for the inline input**

```tsx
const [newCatName, setNewCatName] = useState('');
```

- [ ] **Step 4: Replace the category section JSX**

Find the existing `{/* Category — pills grid */}` div and replace it entirely:

```tsx
{/* Category */}
<div>
  <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 block" style={{ letterSpacing: '0.06em' }}>{t('item_detail.category')}</label>

  <div
    ref={catPillsRef}
    className="flex flex-wrap"
    style={{
      gap: '5px',
      maxHeight: catExpanded || catCollapseHeight === null ? 'none' : `${catCollapseHeight}px`,
      overflow: catExpanded || catCollapseHeight === null ? 'visible' : 'hidden',
    }}
  >
    {allCategories.map((cat) => {
      const active = cat.key === item.category;
      const tint = getTint(cat.key);
      return (
        <button
          key={cat.key}
          onClick={() => handleUpdate({ category: cat.key })}
          className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-[10px] text-[13px] font-medium whitespace-nowrap"
          style={{
            flex: '1 1 auto',
            background: active ? tint.activeBg : tint.bg,
            color: tint.color,
            border: active ? '1.5px solid rgba(0,0,0,0.28)' : '1px solid rgba(0,0,0,0.10)',
            fontWeight: active ? 700 : 500,
          }}
        >
          <span style={{ fontSize: 14 }}>{cat.emoji}</span>
          {cat.isCustom ? cat.key : t(`categories.${cat.key}`)}
        </button>
      );
    })}

    {/* Inline "add new" input pill — only shown when expanded */}
    {catExpanded && (
      <div
        className="flex items-center gap-1 px-2.5 py-2 rounded-[10px]"
        style={{ flex: '1 1 auto', border: '1.5px dashed #d1d5db', minWidth: 120 }}
      >
        <span style={{ fontSize: 14, color: '#9ca3af' }}>＋</span>
        <input
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && newCatName.trim() && group) {
              const created = await createCustomCategory(group.id, newCatName.trim(), '📦');
              addCategory(created);
              handleUpdate({ category: created.name });
              setNewCatName('');
              setCatExpanded(false);
            }
          }}
          placeholder="קטגוריה חדשה"
          className="flex-1 bg-transparent outline-none text-[13px] text-gray-400 placeholder:text-gray-300 min-w-0"
          style={{ direction: 'rtl' }}
        />
      </div>
    )}
  </div>

  {/* Expand / collapse toggle */}
  {catCollapseHeight !== null && (
    <button
      onClick={() => setCatExpanded(p => !p)}
      className="mt-1.5 w-full text-center text-xs font-semibold"
      style={{ color: scheme.primary }}
    >
      {catExpanded
        ? '▴ פחות'
        : `+ עוד ${Math.max(0, allCategories.length - allCategories.slice(0, allCategories.findIndex((_, i, arr) => {
            // count pills that fit in 2 rows — approximate with catCollapseHeight
            return false;
          })).length)} ▾`}
    </button>
  )}
</div>
```

The "עוד X" count is hard to compute without layout info. Simplify it — just show `+ עוד ▾` when collapsed:

```tsx
  {catCollapseHeight !== null && (
    <button
      onClick={() => setCatExpanded(p => !p)}
      className="mt-1.5 w-full text-center text-xs font-semibold"
      style={{ color: scheme.primary }}
    >
      {catExpanded ? '▴ פחות' : '+ עוד ▾'}
    </button>
  )}
```

- [ ] **Step 5: Add the `createCustomCategory` import**

At the top of `ItemDetailSheet.tsx`, add to the imports:

```tsx
import { createCustomCategory } from '../data/categories';
```

- [ ] **Step 6: Verify**

Open item detail. Confirm:
- Pills are flex-wrap, short labels pack 3/row, long labels 2/row, all grow to fill
- Each pill has correct pastel tint, selected has stronger border + deeper tint
- "+ עוד ▾" shows when clipped, clicking expands all
- Expanded state shows inline input at end
- Typing a name + Enter creates the category and selects it

- [ ] **Step 7: Commit**

```bash
git add src/components/ItemDetailSheet.tsx
git commit -m "redesign: category pills — flex-wrap, pastel tints, collapsible, inline add"
```

---

### Task 6: Images row redesign + delete button at bottom

**Files:**
- Modify: `src/components/ItemDetailSheet.tsx`

Replace the vertical image list with a horizontal square-thumbnail row, and move delete to the bottom as a full-width button.

- [ ] **Step 1: Replace the images section**

Find the `{/* Images */}` section and replace it:

```tsx
{/* Images */}
<div>
  <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 block" style={{ letterSpacing: '0.06em' }}>{t('item_detail.images')}</label>
  <div className="flex gap-2 flex-wrap">
    {images.map((image) => (
      <div key={image.id} className="relative w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0">
        <img src={getImageUrl(image.storage_path)} alt="" className="w-full h-full object-cover" />
        <button
          onClick={() => handleDeleteImage(image)}
          className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    ))}
    <button
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading}
      className="w-[72px] h-[72px] rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 text-xs flex-shrink-0"
      style={{ border: '1.5px dashed #d1d5db' }}
    >
      {uploading
        ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: scheme.primaryLight, borderTopColor: 'transparent' }} />
        : <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            הוסף
          </>
      }
    </button>
    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
  </div>
</div>
```

- [ ] **Step 2: Add the delete button at the very bottom of the body**

After the images section, as the last item in the body `<div>`:

```tsx
{/* Delete — full width at bottom */}
<button
  onClick={handleDelete}
  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[13px] text-[15px] font-semibold text-red-500"
  style={{ background: '#fff0f0', marginTop: 4 }}
>
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
  מחק פריט
</button>
```

- [ ] **Step 3: Verify**

Open an item with images. Confirm:
- Images show as 72×72 square thumbnails in a horizontal row
- `+` add button is the last item, dashed border
- מחק פריט is at the very bottom, full width, red

- [ ] **Step 4: Commit**

```bash
git add src/components/ItemDetailSheet.tsx
git commit -m "redesign: horizontal image thumbnails + delete button at bottom"
```

---

### Task 7: TypeScript check + final cleanup

**Files:**
- Modify: `src/components/ItemDetailSheet.tsx`

- [ ] **Step 1: Run TypeScript check**

```bash
cd "/Users/aviranrevach/AI Projects Aviran/Shopping list" && npx tsc --noEmit 2>&1
```

Expected: no errors. Fix any type errors found.

- [ ] **Step 2: Verify full flow end-to-end**

1. Open a list → swipe right on an item → detail sheet slides in ✓
2. Tap ⋯ on any row → same sheet opens ✓
3. Edit name, blur → saves ✓
4. Edit note, blur → saves ✓
5. Tap −/+ → quantity updates ✓
6. Tap unit pill → picker opens; tap a unit → updates and closes ✓
7. Category pills wrap correctly; short words 3/row, long 2/row ✓
8. Selected category has stronger border + deeper tint ✓
9. "+ עוד ▾" collapses after expanding ✓
10. Type in add-category input + Enter → creates custom category, selects it ✓
11. Tap image + → file picker opens ✓
12. מחק פריט → item deleted, sheet closes ✓

- [ ] **Step 3: Push**

```bash
git push
```
