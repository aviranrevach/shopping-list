# Family Shopping List — Claude Code Project Plan

## Overview
A shared family shopping list PWA. Real-time sync so everyone in the family sees updates instantly. Add to home screen on iPhone for a native app feel.

## Tech Stack
- **React** (Vite) + TypeScript
- **Supabase** — auth, real-time Postgres, row-level security
- **Tailwind CSS** — styling
- **Vercel** — deploy
- **vite-plugin-pwa** — service worker, offline support, home screen install

## CLAUDE.md (paste this into your project root)

```markdown
# Shopping List PWA

## Project Context
Family shopping list app for 2 adults + kids. PWA that works on iPhone home screen.
Real-time sync via Supabase so all family members see changes instantly.

## Tech Stack
- React 18+ with Vite and TypeScript
- Supabase (auth + real-time Postgres)
- Tailwind CSS
- vite-plugin-pwa for offline/installability

## Architecture

### Database (Supabase)
Tables:
- `families` — id, name, created_at
- `family_members` — id, family_id (FK), user_id (FK), role (admin|member)
- `lists` — id, family_id (FK), name, icon, created_by, created_at
- `items` — id, list_id (FK), name, quantity, unit, category, checked, checked_by, added_by, created_at, position

Row-Level Security: all tables scoped to family_id via family_members join.

### Categories (predefined)
Produce, Dairy, Meat & Fish, Bakery, Frozen, Drinks, Snacks, Household, Other

### Screens
1. **Login** — magic link (email) via Supabase Auth. No passwords to remember.
2. **Lists** — grid of shopping lists (e.g. "Shabbat", "Weekly", "Costco"). Tap to open. Long press to edit/delete.
3. **List Detail** — items grouped by category. Tap to check/uncheck. Swipe to delete. Add item input at top with autocomplete from past items.
4. **Add/Edit Item** — name, quantity, unit (dropdown), category (dropdown)
5. **Family Settings** — invite family members via email link, manage members

### Key Behaviors
- Real-time: use Supabase realtime subscriptions on `items` table. When someone checks an item, all connected clients update immediately.
- Offline: service worker caches the app shell + last known list state. Queue changes and sync when back online.
- Smart autocomplete: when typing an item name, suggest from previously added items with their last-used category and unit.
- Checked items: move to bottom of list, shown in gray with strikethrough. "Clear checked" button.
- RTL support: the family speaks Hebrew. The app should support RTL layout with dir="rtl" and lang="he". All UI labels in Hebrew. Use a simple i18n approach with a locale file so English can be added later.

### Design
- Clean, minimal, mobile-first
- Large touch targets (48px minimum) — this will be used while walking around a store
- Bottom navigation bar (Lists, Settings)
- Floating action button for adding items
- Light/dark mode following system preference
- Use system font stack for performance

### Code Style
- Functional components with hooks
- Custom hooks for Supabase subscriptions (useRealtimeItems, useRealtimeList)
- Keep components small and focused
- Supabase client in a single lib/supabase.ts file
- Types in a types/ directory
- All Supabase queries through a data/ layer, not directly in components
```

## Step-by-Step with Claude Code

### Phase 1 — Scaffold
Open terminal in your project folder and start Claude Code:
```
claude
```

First prompt:
```
Read CLAUDE.md. Set up the project: Vite + React + TypeScript + Tailwind + vite-plugin-pwa. 
Create the Supabase types, client config, and data layer stubs. 
Set up routing with react-router. Create placeholder screens for all 5 screens. 
Don't implement any logic yet — just the skeleton with navigation working.
```

### Phase 2 — Supabase Setup (you do this manually)
1. Go to supabase.com → create a free project
2. Go to SQL Editor and run the schema (ask Claude Code to generate the SQL migration from the schema in CLAUDE.md)
3. Enable Realtime on the `items` table (Database → Replication → enable for `items`)
4. Copy your project URL + anon key into a `.env.local` file:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

### Phase 3 — Auth
```
Implement magic link auth using Supabase. Login screen with email input. 
After login, check if user belongs to a family. If not, show a "Create Family" 
or "Join Family" flow. Store the family association in family_members.
```

### Phase 4 — Lists CRUD
```
Implement the Lists screen. Show all lists for the user's family. 
Support creating, editing, and deleting lists. Each list has a name and emoji icon.
Use Supabase realtime so if another family member creates a list, it appears immediately.
```

### Phase 5 — Items (the core)
```
Implement the List Detail screen. Show items grouped by category. 
Tap an item to toggle checked. Add item input at top with autocomplete 
from past items (query distinct item names from the family's history). 
Real-time subscriptions so all family members see changes instantly. 
Checked items sink to the bottom with strikethrough styling. 
Add a "clear checked" button.
```

### Phase 6 — Offline + PWA
```
Configure vite-plugin-pwa with a proper manifest (app name "רשימת קניות", 
theme color, icons). Set up a service worker that caches the app shell. 
Implement offline detection — show a subtle banner when offline. 
Queue any changes made offline and sync when connection returns.
```

### Phase 7 — Polish
```
Add RTL support, Hebrew labels, pull-to-refresh, haptic feedback on check, 
swipe-to-delete on items, empty states, loading skeletons, 
and a proper app icon.
```

### Phase 8 — Deploy
```
Set up Vercel deployment. Add a vercel.json if needed. 
Make sure the PWA manifest and service worker are served correctly.
```

## Sharing with Family
Once deployed on Vercel, you get a URL like `shopping-list-abc.vercel.app`. 
Send it to your wife and kids. On iPhone:
1. Open in Safari
2. Tap Share → "Add to Home Screen"
3. It now looks and works like a native app

## Supabase Free Tier Limits (more than enough)
- 500MB database
- 50,000 monthly active users
- Realtime connections: 200 concurrent
- Unlimited API requests
