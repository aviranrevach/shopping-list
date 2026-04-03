# List Sharing, Invite Flow & Header Redesign

## Context

Users need to share specific lists with family members (like sharing a note in Apple Notes). The current header layout also needs a redesign — search should be an icon that expands, not a persistent box. This spec covers: new header layout, list-based invite flow, join page for invitees, and email branding for magic links.

## 1. Header Redesign

### Default State

```
[ + ]  [ 🔍 ]    🕯️ שבת    [ ↗ ]  [ ‹ ]
 amber  ghost     centered    ghost  ghost
```

- **Right (RTL start)**: `+` button (amber, opens add zone) + 🔍 search icon (ghost)
- **Center**: list emoji + name
- **Left (RTL end)**: ↗ share icon (ghost) + ‹ back arrow (ghost)
- All icon buttons: 36×36px, rounded-lg

### Search Expanded State

Tapping 🔍 replaces the entire header with:
```
[ חיפוש... input field        ]  ביטול
```
- Full-width input, 16px font (prevents iOS zoom)
- "ביטול" (Cancel) text link in amber to return to default header
- Search filters items in real-time (existing behavior)

## 2. List-Based Invites

### Data Model Changes

The existing `group_invites` table needs to become `list_invites` or we add a `list_id` column:

**`list_invites`** (new table, replaces `group_invites` for this flow)
- id (uuid, PK)
- list_id (uuid, FK → lists)
- token (text, unique)
- created_by (uuid, FK → auth.users)
- expires_at (timestamptz) — default: 7 days from creation
- created_at (timestamptz)

RLS: list owner/members can create and read invites. Anyone can read by token (for join flow).

### Invite Creation Flow

1. User taps ↗ share icon in list header
2. **Invite sheet** slides up (bottom sheet or full overlay):
   - Title: `שתף את "🕯️ שבת"`
   - Subtitle: "כל מי שמקבל יוכל לראות ולערוך"
   - Member avatars showing who already has access
   - QR code (encodes the invite URL)
   - Shareable link with copy button
   - Share action buttons: WhatsApp, iMessage, More (uses Web Share API)
   - Validity note: "תקף ל-7 ימים"
3. Tapping "העתק" copies the link to clipboard
4. Tapping WhatsApp/iMessage/More opens the native share sheet with the invite URL

### Invite URL Format

```
https://shopping-list-mdsv.vercel.app/join/{token}
```

### QR Code

Generated client-side from the invite URL. Use a lightweight QR library (e.g., `qrcode` npm package). No server-side generation needed.

## 3. Join Page (What Invitee Sees)

### Route: `/join/:token`

When someone opens an invite link:

1. App fetches the invite by token (public RLS policy)
2. If expired → show "הקישור פג תוקף" (link expired) with option to request a new one
3. If valid → show the join page:

### Join Page Layout

```
     🛒 (app icon)
  אבירן שיתף איתך רשימה
      🕯️ שבת
      5 פריטים

  ┌─────────────────────┐
  │ ✉️ כניסה עם אימייל    │  ← highlighted, recommended
  │ חשבון מלא עם רשימות משלך │
  └─────────────────────┘
  ┌─────────────────────┐
  │ 👤 כניסה כאורח       │
  │ רק שם — לילדים      │
  └─────────────────────┘
```

### Email Path (Adults)

1. Tap "כניסה עם אימייל"
2. Shows email input + "שלח קישור" button (same as login screen)
3. Magic link sent → user authenticates
4. After auth: auto-create group if new user, add list to user's account, redirect to the shared list
5. User now has their own account with their own lists AND access to the shared list

### Guest Path (Kids)

1. Tap "כניסה כאורח"
2. Shows name input + "הצטרף לרשימה" button
3. Creates an anonymous Supabase session
4. Adds user as a member with the entered display name
5. Redirects to the shared list
6. Guest only sees shared lists (no own account/lists)

## 4. Email Branding

### Magic Link Email Template

Customize in Supabase Dashboard → Authentication → Email Templates:

**Subject**: `🛒 קישור כניסה לרשימת קניות`

**Body** (HTML):
```
שלום,

לחץ על הקישור כדי להיכנס לרשימת הקניות שלך:

[כניסה לרשימה] ← button with invite URL

הקישור תקף לשעה אחת.

רשימת קניות 🛒
```

- Clean, minimal design
- Hebrew text, RTL
- Amber button color (#f59e0b)
- No heavy branding — just the app name + cart emoji

## 5. Shared List Indicators

### On Lists Screen

Lists that are shared show member avatars overlapping (like the mockup):
```
🕯️ שבת          [א][נ] ›
8 פריטים · 3 סומנו
```

### On List Detail

The share icon in the header gets an amber dot when the list has other members, indicating it's shared.

## 6. Files to Modify/Create

| File | Changes |
|------|---------|
| `src/screens/ListDetailScreen.tsx` | New header layout (icons, expandable search, share button) |
| `src/components/InviteSheet.tsx` | New — invite sheet with QR, link, share actions |
| `src/components/JoinPage.tsx` | New — join page for invitees (email + guest paths) |
| `src/data/invites.ts` | New — create invite, fetch invite by token, accept invite |
| `src/App.tsx` | Add `/join/:token` route |
| `supabase/migrations/002_list_invites.sql` | New table + RLS policies |
| `src/i18n/he.json` | Add invite-related strings |
| `src/i18n/en.json` | Add invite-related strings |
| `src/screens/ListsScreen.tsx` | Show member avatars on shared lists |
| `package.json` | Add `qrcode` dependency |

## 7. What's NOT Changing

- Check/uncheck animations
- Rapid add flow
- Item detail sheet
- Bottom navigation
- Login screen (reused for email join path)
