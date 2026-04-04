# Members Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated members screen where the list owner can remove members and any member can leave the list.

**Architecture:** A new `MembersSheet` component (portal-based, slides in from right over the settings modal) is triggered by tapping the שותפים section in the list settings modal. Remove/leave use a Supabase DELETE backed by two new RLS policies, called via a new `removeListMember` function. `ListDetailScreen` passes `listMembers` + `setListMembers` as props to the sheet so state stays in sync.

**Tech Stack:** React 18 + TypeScript, Supabase (RLS policies), Tailwind CSS v4, `createPortal` for overlay layering.

---

## File Map

| File | Role |
|---|---|
| `supabase/migrations/005_member_remove_policy.sql` | **New** — two DELETE RLS policies on `list_members` |
| `src/data/invites.ts` | **Modify** — add `removeListMember` function |
| `src/components/MembersSheet.tsx` | **New** — full members screen component |
| `src/screens/ListDetailScreen.tsx` | **Modify** — `showMembersSheet` state + tappable שותפים section + render `MembersSheet` |

---

## Task 1: DB migration + `removeListMember` function

**Files:**
- Create: `supabase/migrations/005_member_remove_policy.sql`
- Modify: `src/data/invites.ts`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/005_member_remove_policy.sql` with this exact content:

```sql
-- Owner can remove any member from their list
create policy "Owner can remove members"
  on list_members for delete
  using (
    list_id in (
      select list_id from list_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Member can remove themselves (leave)
create policy "Member can leave list"
  on list_members for delete
  using (user_id = auth.uid());
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase dashboard SQL editor (paste the SQL above and run), or if the Supabase CLI is set up locally:

```bash
supabase db push
```

Verify in the Supabase dashboard → Authentication → Policies → `list_members` table that both new policies appear.

- [ ] **Step 3: Add `removeListMember` to `src/data/invites.ts`**

Append this function to the end of `src/data/invites.ts`:

```ts
export async function removeListMember(listId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('list_members')
    .delete()
    .eq('id', memberId)
    .eq('list_id', listId);
  if (error) throw error;
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "/Users/aviranrevach/AI Projects Aviran/Shopping list" && npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_member_remove_policy.sql src/data/invites.ts
git commit -m "feat: add RLS delete policies and removeListMember function"
```

---

## Task 2: MembersSheet component

**Files:**
- Create: `src/components/MembersSheet.tsx`

- [ ] **Step 1: Create `src/components/MembersSheet.tsx`**

```tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { removeListMember } from '../data/invites';
import { Avatar } from './Avatar';
import { InviteSheet } from './InviteSheet';
import type { ListMember } from '../types/database';

interface MembersSheetProps {
  listId: string;
  listName: string;
  listIcon: string;
  members: ListMember[];
  onClose: () => void;
  onMembersChange: (members: ListMember[]) => void;
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
  return `לפני ${Math.floor(diff / 86400)} ימים`;
}

export function MembersSheet({
  listId,
  listName,
  listIcon,
  members,
  onClose,
  onMembersChange,
}: MembersSheetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showInviteSheet, setShowInviteSheet] = useState(false);

  const ownerMember = members.find((m) => m.role === 'owner') ?? null;
  const isOwner = ownerMember?.user_id === user?.id;

  function handleXTap(memberId: string) {
    setExpandedMemberId((prev) => (prev === memberId ? null : memberId));
  }

  async function handleConfirmRemove(member: ListMember) {
    setRemovingId(member.id);
    try {
      await removeListMember(listId, member.id);
      const updated = members.filter((m) => m.id !== member.id);
      onMembersChange(updated);
      setExpandedMemberId(null);
      // If the current user just left, close everything and go to lists
      if (member.user_id === user?.id) {
        onClose();
        navigate('/lists');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingId(null);
    }
  }

  function showXButton(member: ListMember): boolean {
    if (member.role === 'owner') return false;
    // Owner can remove any non-owner; non-owner can only remove themselves
    if (isOwner) return true;
    return member.user_id === user?.id;
  }

  return createPortal(
    <>
      {/* Full-screen backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />

      {/* Sheet — slides in from right */}
      <div
        className="fixed inset-0 z-[61] bg-white flex flex-col"
        style={{ animation: 'sheet-slide-in 0.28s cubic-bezier(0.16,1,0.3,1) forwards' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0"
          style={{ background: '#fafaf8' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-semibold text-blue-500 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            הגדרות
          </button>
          <span className="text-[15px] font-bold text-gray-900">שותפים</span>
          {isOwner ? (
            <button
              type="button"
              onClick={() => setShowInviteSheet(true)}
              className="text-[13px] font-semibold text-blue-500"
            >
              + הוסף
            </button>
          ) : (
            <div className="w-12" />
          )}
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto">
          <p
            className="text-[9px] font-bold uppercase tracking-wider px-4 pt-3 pb-1"
            style={{ color: '#c0c0bc' }}
          >
            חברים ברשימה
          </p>

          {members.map((member) => {
            const isCurrentUser = member.user_id === user?.id;
            const isExpanded = expandedMemberId === member.id;
            const isRemoving = removingId === member.id;

            return (
              <div key={member.id}>
                {/* Member row */}
                <div
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50"
                  style={{
                    background: isExpanded ? '#fff5f5' : isCurrentUser && member.role !== 'owner' ? '#f0f7ff' : 'white',
                  }}
                >
                  <Avatar name={member.display_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-gray-900 truncate">
                        {member.display_name}
                      </span>
                      {isCurrentUser && member.role !== 'owner' && (
                        <span className="text-[10px] font-semibold text-blue-400">(את/ה)</span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {member.role === 'owner'
                        ? 'בעלים'
                        : isCurrentUser
                        ? `הצטרפת ${relativeTime(member.joined_at)}`
                        : `הצטרף ${relativeTime(member.joined_at)}`}
                    </span>
                  </div>
                  {member.role === 'owner' ? (
                    <span className="text-[11px]">👑</span>
                  ) : showXButton(member) ? (
                    <button
                      type="button"
                      onClick={() => handleXTap(member.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: isExpanded ? '#ef4444' : '#fee2e2' }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none"
                        stroke={isExpanded ? 'white' : '#ef4444'} strokeWidth={2.5}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  ) : null}
                </div>

                {/* Confirm panel — expands below this row */}
                {isExpanded && (
                  <div
                    className="px-4 pb-3 pt-2.5 border-b border-red-200"
                    style={{ background: '#fff5f5' }}
                  >
                    <p
                      className="text-[11px] font-semibold text-center mb-2.5"
                      style={{ color: '#7f1d1d' }}
                    >
                      {isCurrentUser
                        ? 'לעזוב את הרשימה?\nלא תוכל/י לראות אותה יותר'
                        : `להסיר את ${member.display_name} מהרשימה?`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedMemberId(null)}
                        className="flex-1 py-2 rounded-[9px] text-[12px] font-semibold text-gray-600"
                        style={{ background: '#f0f0ea' }}
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmRemove(member)}
                        disabled={isRemoving}
                        className="flex-1 py-2 rounded-[9px] text-[12px] font-semibold text-white"
                        style={{ background: '#ef4444', opacity: isRemoving ? 0.6 : 1 }}
                      >
                        {isCurrentUser ? 'עזוב' : 'הסר'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* הוסף חברים row */}
          <button
            type="button"
            onClick={() => setShowInviteSheet(true)}
            className="w-full flex items-center gap-3 px-4 py-3 mt-1"
            style={{ background: '#f4f4f0', borderRadius: '0' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ border: '2px dashed #d1d5db', background: 'white' }}
            >
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-[12px] font-semibold text-gray-600">הוסף חברים</div>
              <div className="text-[10px] text-gray-400">שתף קישור / QR</div>
            </div>
          </button>
        </div>
      </div>

      {/* InviteSheet stacked on top */}
      {showInviteSheet && (
        <InviteSheet
          listId={listId}
          listName={listName}
          listIcon={listIcon}
          onClose={() => setShowInviteSheet(false)}
        />
      )}
    </>,
    document.body,
  );
}
```

- [ ] **Step 2: Add `sheet-slide-in` keyframe to global CSS**

Find the global CSS file (likely `src/index.css` or `src/App.css`) and add this keyframe:

```css
@keyframes sheet-slide-in {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/aviranrevach/AI Projects Aviran/Shopping list" && npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add src/components/MembersSheet.tsx src/index.css
git commit -m "feat: add MembersSheet component with remove/leave functionality"
```

---

## Task 3: Wire MembersSheet into ListDetailScreen

**Files:**
- Modify: `src/screens/ListDetailScreen.tsx`

- [ ] **Step 1: Add import**

Add to the imports at the top of `src/screens/ListDetailScreen.tsx`:

```ts
import { MembersSheet } from '../components/MembersSheet';
```

- [ ] **Step 2: Add `showMembersSheet` state**

After the existing `const [listMembers, setListMembers] = useState<ListMember[]>([]);` line (line ~61), add:

```ts
const [showMembersSheet, setShowMembersSheet] = useState(false);
```

- [ ] **Step 3: Make the שותפים section tappable**

In the שותפים section of the `showMenu` block (around line 472–509), replace the outer `<div>` with a `<button>` that opens the members sheet. The current JSX is:

```tsx
{/* שותפים */}
<div>
  <p
    className="text-[9px] font-bold uppercase tracking-wider mb-2"
    style={{ color: '#c0c0bc' }}
  >
    שותפים
  </p>
  <div className="flex gap-2.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
    {/* Add button */}
    <button
      type="button"
      onClick={() => { setShowMenu(false); setShowInviteSheet(true); }}
      className="flex flex-col items-center gap-1 flex-shrink-0"
    >
```

Replace that entire שותפים `<div>` block (from `{/* שותפים */}` through the closing `</div>`) with:

```tsx
{/* שותפים */}
<button
  type="button"
  onClick={() => setShowMembersSheet(true)}
  className="w-full text-right"
>
  <div className="flex items-center justify-between mb-2">
    <p
      className="text-[9px] font-bold uppercase tracking-wider"
      style={{ color: '#c0c0bc' }}
    >
      שותפים
    </p>
    <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </div>
  <div className="flex gap-2.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
    <div
      className="w-[46px] h-[46px] rounded-full flex items-center justify-center flex-shrink-0"
      style={{ border: '2px dashed #d1d5db', background: '#fafaf8' }}
    >
      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </div>
    {nonOwnerMembers.map((m) => (
      <div key={m.id} className="flex flex-col items-center gap-1 flex-shrink-0">
        <Avatar name={m.display_name} size="xl" />
        <span
          className="text-[10px] font-medium text-center"
          style={{ color: '#555', maxWidth: 52 }}
        >
          {m.display_name.split(' ')[0]}
        </span>
      </div>
    ))}
  </div>
</button>
```

- [ ] **Step 4: Render MembersSheet**

After the existing `{showInviteSheet && listId && (<InviteSheet .../>)}` block (around line 405–412), add:

```tsx
{showMembersSheet && listId && (
  <MembersSheet
    listId={listId}
    listName={listName}
    listIcon={listIcon}
    members={listMembers}
    onClose={() => setShowMembersSheet(false)}
    onMembersChange={setListMembers}
  />
)}
```

- [ ] **Step 5: TypeScript check**

```bash
cd "/Users/aviranrevach/AI Projects Aviran/Shopping list" && npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/screens/ListDetailScreen.tsx
git commit -m "feat: open MembersSheet from list settings שותפים section"
```

---

## Verification

1. Open a shared list → tap ⋯ → settings modal opens
2. שותפים section shows avatars + chevron → tap it → `MembersSheet` slides in from right
3. Header shows "← הגדרות" on right, "שותפים" center, "+ הוסף" on left (owner only)
4. Owner: each non-owner row has a red × circle; tap × → confirm panel expands below with centered question + full-width ביטול/הסר buttons; tap ביטול → collapses; tap הסר → row disappears
5. Non-owner: own row is blue-tinted with × → tap × → confirm with "עזוב" button → tapping עזוב closes sheet and navigates to /lists
6. "+ הוסף" and "הוסף חברים" row both open InviteSheet
7. `npx tsc --noEmit` passes clean
