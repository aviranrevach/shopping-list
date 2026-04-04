# Members Management

## Overview

Add a dedicated members screen accessible from the list settings modal. The owner can remove members; any member can leave the list. Both actions use an inline confirmation that expands below the member's own row.

---

## Entry Point

The שותפים section in the list settings modal (`ListDetailScreen.tsx`) becomes tappable. Tapping anywhere on the section (avatars row, label, or a new chevron) opens `MembersSheet` — a full-screen modal that slides in over the settings modal with a "← הגדרות" back button.

The existing dashed `+` circle stays and continues to open `InviteSheet`.

---

## MembersSheet Layout

### Header
- Right: `← הגדרות` back button (closes the sheet)
- Center: "שותפים" title
- Left: `+ הוסף` button — **owner only**, opens `InviteSheet`; hidden for non-owners

### Member Rows

Each row: 36px avatar · name + meta line · optional × button on the right

| Member type | Background | × button | Meta text |
|---|---|---|---|
| Owner | white | none (shows 👑 badge instead) | "בעלים" |
| Other member (owner viewing) | white | red circle × | "הצטרף לפני X" (relative time from `joined_at`) |
| Current user (non-owner) | `#f0f7ff` tint | red circle × | "הצטרפת לפני X" + "(את/ה)" label |
| Other member (non-owner viewing) | white | none | "הצטרף לפני X" |

### Confirm Panel (inline, expands below row)

When × is tapped on any row:
- That row's background turns `#fff5f5`
- The × button turns solid red
- A panel expands directly below the row:
  - `background: #fff5f5`, `border-bottom: 1px solid #fecaca`
  - Centered question text (`11px font-weight 600 color #7f1d1d`)
    - Remove: `"להסיר את <name> מהרשימה?"`
    - Leave: `"לעזוב את הרשימה?\nלא תוכל/י לראות אותה יותר"`
  - Full-width buttons row: `ביטול` (gray `#f0f0ea`) · `הסר` / `עזוב` (red `#ef4444`)
- Only one confirm open at a time — tapping × on another row closes the current confirm first
- Tapping ביטול collapses the panel and restores the row

### הוסף חברים Row (bottom, always shown)

Dashed circle + "הוסף חברים" / "שתף קישור / QR" — taps open `InviteSheet`. Same for owner and non-owner.

---

## Actions

### Remove member (owner only)

1. Owner taps × on a non-owner row
2. Confirm panel expands below that row
3. Owner taps "הסר" → call `removeListMember(listId, memberId)`
4. Row removed from list with fade-out animation
5. `listMembers` state refreshed

### Leave list (non-owner)

1. Non-owner taps × on their own highlighted row
2. Confirm panel expands below their row
3. Taps "עזוב" → call `removeListMember(listId, currentUserMemberId)`
4. Sheet closes, settings modal closes, navigate back to lists screen

---

## Data

### New Supabase migration (`005_member_remove_policy.sql`)

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

-- Member can remove themselves
create policy "Member can leave list"
  on list_members for delete
  using (user_id = auth.uid());
```

### New function in `src/data/invites.ts`

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

### `MembersSheet` state

```ts
const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
```

Tracks which member row has the confirm panel open. `null` = none open.

---

## Files to Change

| File | Change |
|---|---|
| `supabase/migrations/005_member_remove_policy.sql` | New file — two DELETE policies |
| `src/data/invites.ts` | Add `removeListMember` |
| `src/components/MembersSheet.tsx` | New component — the full members screen |
| `src/screens/ListDetailScreen.tsx` | Make שותפים section tappable; add `showMembersSheet` state; pass `listMembers` + `setListMembers` to sheet |

---

## Preserved Behaviors

- `InviteSheet` — unchanged, opened from `+ הוסף` / "הוסף חברים" row
- Owner strip in settings modal — unchanged
- `listMembers` fetch in `ListDetailScreen` — unchanged; sheet receives it as a prop and calls `setListMembers` after remove
