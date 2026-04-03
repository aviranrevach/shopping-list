# Group Shopping List PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time shared shopping list PWA with Supabase backend, bilingual i18n, and a speed-first mobile UX.

**Architecture:** React SPA with Vite, Supabase for auth/DB/realtime/storage, Tailwind for styling. Data flows through a `data/` layer with custom realtime hooks. i18n with locale JSON files. PWA via vite-plugin-pwa.

**Tech Stack:** React 18+, TypeScript, Vite, Supabase (auth + Postgres + realtime + storage), Tailwind CSS, React Router, vite-plugin-pwa

**Spec:** `docs/superpowers/specs/2026-04-03-shopping-list-pwa-design.md`

---

## File Structure

```
src/
├── main.tsx                          # App entry, providers
├── App.tsx                           # Router + layout shell
├── lib/
│   ├── supabase.ts                   # Supabase client singleton
│   └── image.ts                      # Client-side image resize/compress
├── i18n/
│   ├── index.ts                      # i18n context + hook
│   ├── he.json                       # Hebrew locale (default)
│   └── en.json                       # English locale
├── types/
│   ├── database.ts                   # Supabase DB types (generated-style)
│   └── index.ts                      # App-level types (re-exports + helpers)
├── data/
│   ├── groups.ts                     # Group CRUD + auto-create
│   ├── lists.ts                      # Lists CRUD
│   ├── items.ts                      # Items CRUD + suggestions
│   └── images.ts                     # Image upload/delete via Storage
├── hooks/
│   ├── useAuth.ts                    # Auth state + login/logout
│   ├── useGroup.ts                   # Current user's group
│   ├── useRealtimeLists.ts           # Realtime subscription on lists
│   ├── useRealtimeItems.ts           # Realtime subscription on items
│   └── useItemSuggestions.ts         # Autocomplete from history
├── components/
│   ├── BottomNav.tsx                 # Bottom navigation bar
│   ├── SwipeableRow.tsx              # Swipe-to-reveal actions
│   ├── QuantityPill.tsx              # Collapsed pill + expanded stepper
│   ├── CategoryPill.tsx              # Collapsed pill + expanded picker
│   ├── ItemRow.tsx                   # Single item in list detail
│   ├── CategoryGroup.tsx             # Category header + item rows
│   ├── SuggestionChips.tsx           # Horizontal scrollable chips
│   └── Avatar.tsx                    # User avatar (image or initial)
├── screens/
│   ├── LoginScreen.tsx               # Magic link login
│   ├── ListsScreen.tsx               # All lists for the group
│   ├── ListDetailScreen.tsx          # Items in a list + search + top bar
│   ├── RapidAddScreen.tsx            # Full-screen rapid add canvas
│   └── ItemDetailScreen.tsx          # Full-screen item detail
├── index.css                         # Tailwind imports + base styles
supabase/
└── migrations/
    └── 001_initial_schema.sql        # Full DB schema + RLS + triggers
public/
├── icons/                            # PWA icons (192, 512)
.env.local                            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `index.html`, `.env.local`, `.gitignore`

- [ ] **Step 1: Initialize Vite project**

Run:
```bash
npm create vite@latest . -- --template react-ts
```

Expected: Vite scaffolds React+TS into current directory.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install @supabase/supabase-js react-router-dom
npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa
```

- [ ] **Step 3: Configure Tailwind via Vite plugin**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'רשימת קניות',
        short_name: 'קניות',
        description: 'Shared shopping list for your group',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        dir: 'rtl',
        lang: 'he',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

- [ ] **Step 4: Set up Tailwind base styles**

`src/index.css`:
```css
@import "tailwindcss";
```

- [ ] **Step 5: Set up index.html with RTL**

`index.html`:
```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <title>רשימת קניות</title>
  </head>
  <body class="bg-white text-gray-900 font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Set up App shell with router**

`src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/lists" element={<div>Lists</div>} />
        <Route path="/lists/:listId" element={<div>List Detail</div>} />
        <Route path="/lists/:listId/add" element={<div>Rapid Add</div>} />
        <Route path="/lists/:listId/items/:itemId" element={<div>Item Detail</div>} />
        <Route path="*" element={<Navigate to="/lists" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Create .env.local and .gitignore**

`.env.local`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Add to `.gitignore` (append to Vite default):
```
.env.local
.superpowers/
```

- [ ] **Step 8: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: Vite starts on port 5173, page shows "Lists" placeholder text.

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Vite + React + TS + Tailwind + PWA + routing"
```

---

## Task 2: Supabase Schema & Types

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`, `src/types/database.ts`, `src/types/index.ts`, `src/lib/supabase.ts`

- [ ] **Step 1: Write the full SQL migration**

`supabase/migrations/001_initial_schema.sql`:
```sql
-- Groups
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Group members
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  display_name text not null,
  avatar_url text,
  unique (group_id, user_id)
);

-- Lists
create table lists (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  icon text not null default '📋',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Items
create table items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  name text not null,
  quantity integer not null default 1,
  unit text,
  category text not null default 'other',
  checked boolean not null default false,
  checked_by uuid references auth.users(id),
  added_by uuid not null references auth.users(id),
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Item images
create table item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Group invites
create table group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Auto-update updated_at on items
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

-- Enable realtime on items and lists
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table lists;

-- Row-Level Security

alter table groups enable row level security;
alter table group_members enable row level security;
alter table lists enable row level security;
alter table items enable row level security;
alter table item_images enable row level security;
alter table group_invites enable row level security;

-- Helper: get user's group IDs
create or replace function user_group_ids()
returns setof uuid as $$
  select group_id from group_members where user_id = auth.uid()
$$ language sql security definer stable;

-- Groups: members can read their groups
create policy "Members can read own groups"
  on groups for select using (id in (select user_group_ids()));

-- Groups: anyone authenticated can create (for auto-create flow)
create policy "Authenticated users can create groups"
  on groups for insert with check (auth.uid() is not null);

-- Group members: members can read their group's members
create policy "Members can read group members"
  on group_members for select using (group_id in (select user_group_ids()));

-- Group members: allow inserting self (for join flow)
create policy "Users can add themselves to groups"
  on group_members for insert with check (user_id = auth.uid());

-- Lists: members can CRUD their group's lists
create policy "Members can read group lists"
  on lists for select using (group_id in (select user_group_ids()));

create policy "Members can create group lists"
  on lists for insert with check (group_id in (select user_group_ids()));

create policy "Members can update group lists"
  on lists for update using (group_id in (select user_group_ids()));

create policy "Members can delete group lists"
  on lists for delete using (group_id in (select user_group_ids()));

-- Items: members can CRUD items in their group's lists
create policy "Members can read items"
  on items for select using (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

create policy "Members can create items"
  on items for insert with check (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

create policy "Members can update items"
  on items for update using (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

create policy "Members can delete items"
  on items for delete using (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

-- Item images: same scoping as items
create policy "Members can read item images"
  on item_images for select using (
    item_id in (
      select i.id from items i
      join lists l on i.list_id = l.id
      where l.group_id in (select user_group_ids())
    )
  );

create policy "Members can create item images"
  on item_images for insert with check (
    item_id in (
      select i.id from items i
      join lists l on i.list_id = l.id
      where l.group_id in (select user_group_ids())
    )
  );

create policy "Members can delete item images"
  on item_images for delete using (
    item_id in (
      select i.id from items i
      join lists l on i.list_id = l.id
      where l.group_id in (select user_group_ids())
    )
  );

-- Group invites: members can read/create invites for their group
create policy "Members can read group invites"
  on group_invites for select using (group_id in (select user_group_ids()));

create policy "Members can create group invites"
  on group_invites for insert with check (group_id in (select user_group_ids()));

-- Group invites: anyone can read by token (for join flow — public)
create policy "Anyone can read invite by token"
  on group_invites for select using (true);

-- Storage bucket for item images (run via Supabase dashboard or API)
-- insert into storage.buckets (id, name, public) values ('item-images', 'item-images', false);
```

- [ ] **Step 2: Write TypeScript types**

`src/types/database.ts`:
```ts
export interface Group {
  id: string;
  name: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  display_name: string;
  avatar_url: string | null;
}

export interface List {
  id: string;
  group_id: string;
  name: string;
  icon: string;
  created_by: string;
  created_at: string;
}

export interface Item {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  checked: boolean;
  checked_by: string | null;
  added_by: string;
  note: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ItemImage {
  id: string;
  item_id: string;
  storage_path: string;
  created_at: string;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  created_at: string;
}
```

`src/types/index.ts`:
```ts
export type { Group, GroupMember, List, Item, ItemImage, GroupInvite } from './database';

export const CATEGORIES = [
  'produce',
  'dairy',
  'meat_fish',
  'bakery',
  'frozen',
  'canned',
  'snacks',
  'household',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const UNITS = ['unit', 'kg', 'g', 'liter', 'ml', 'pack'] as const;
export type Unit = (typeof UNITS)[number];
```

- [ ] **Step 3: Create Supabase client**

`src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 4: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/ src/types/ src/lib/supabase.ts
git commit -m "feat: add Supabase schema, RLS policies, TypeScript types, and client"
```

---

## Task 3: i18n Infrastructure

**Files:**
- Create: `src/i18n/index.ts`, `src/i18n/he.json`, `src/i18n/en.json`

- [ ] **Step 1: Create Hebrew locale file**

`src/i18n/he.json`:
```json
{
  "app_name": "רשימת קניות",
  "login": {
    "title": "רשימת קניות",
    "subtitle": "Shopping List",
    "email_label": "אימייל",
    "email_placeholder": "your@email.com",
    "send_link": "שלח לי קישור",
    "link_sent": "קישור נשלח למייל שלך",
    "link_hint": "קישור חד-פעמי יישלח למייל שלך"
  },
  "lists": {
    "title": "הרשימות שלי",
    "new_list": "רשימה חדשה",
    "items_count": "{{count}} פריטים",
    "checked_count": "{{count}} סומנו"
  },
  "list_detail": {
    "search_placeholder": "חיפוש...",
    "checked_section": "✓ סומנו"
  },
  "rapid_add": {
    "title": "הוספת פריטים",
    "done": "סיום",
    "input_placeholder": "הקלד פריט..."
  },
  "item_detail": {
    "quantity": "כמות",
    "unit": "יחידה",
    "category": "קטגוריה",
    "category_hint": "הקלד או בחר מהרשימה",
    "note": "הערה",
    "images": "תמונות",
    "add_image": "הוסף תמונה"
  },
  "categories": {
    "produce": "ירקות ופירות",
    "dairy": "מוצרי חלב",
    "meat_fish": "בשר ודגים",
    "bakery": "מאפים",
    "frozen": "קפואים",
    "canned": "שימורים",
    "snacks": "חטיפים",
    "household": "משק בית",
    "other": "אחר"
  },
  "units": {
    "unit": "יח׳",
    "kg": "ק״ג",
    "g": "גרם",
    "liter": "ליטר",
    "ml": "מ״ל",
    "pack": "חבילה"
  },
  "nav": {
    "lists": "רשימות",
    "settings": "הגדרות"
  },
  "actions": {
    "delete": "מחיקה",
    "check": "סימון"
  }
}
```

- [ ] **Step 2: Create English locale file**

`src/i18n/en.json`:
```json
{
  "app_name": "Shopping List",
  "login": {
    "title": "Shopping List",
    "subtitle": "רשימת קניות",
    "email_label": "Email",
    "email_placeholder": "your@email.com",
    "send_link": "Send me a link",
    "link_sent": "Link sent to your email",
    "link_hint": "A one-time link will be sent to your email"
  },
  "lists": {
    "title": "My Lists",
    "new_list": "New list",
    "items_count": "{{count}} items",
    "checked_count": "{{count}} checked"
  },
  "list_detail": {
    "search_placeholder": "Search...",
    "checked_section": "✓ Checked"
  },
  "rapid_add": {
    "title": "Add Items",
    "done": "Done",
    "input_placeholder": "Type an item..."
  },
  "item_detail": {
    "quantity": "Quantity",
    "unit": "Unit",
    "category": "Category",
    "category_hint": "Type or pick from list",
    "note": "Note",
    "images": "Images",
    "add_image": "Add image"
  },
  "categories": {
    "produce": "Produce",
    "dairy": "Dairy",
    "meat_fish": "Meat & Fish",
    "bakery": "Bakery",
    "frozen": "Frozen",
    "canned": "Canned Goods",
    "snacks": "Snacks",
    "household": "Household",
    "other": "Other"
  },
  "units": {
    "unit": "pcs",
    "kg": "kg",
    "g": "g",
    "liter": "L",
    "ml": "mL",
    "pack": "pack"
  },
  "nav": {
    "lists": "Lists",
    "settings": "Settings"
  },
  "actions": {
    "delete": "Delete",
    "check": "Check"
  }
}
```

- [ ] **Step 3: Create i18n context and hook**

`src/i18n/index.ts`:
```ts
import { createContext, useContext } from 'react';
import he from './he.json';
import en from './en.json';

const locales = { he, en } as const;
type Locale = keyof typeof locales;
type Translations = typeof he;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'rtl' | 'ltr';
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function getTranslation(
  translations: Translations,
  key: string,
  params?: Record<string, string | number>,
): string {
  const keys = key.split('.');
  let value: unknown = translations;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // fallback to key if not found
    }
  }
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`));
}

export { locales };
export type { Locale, Translations };
```

- [ ] **Step 4: Add I18nProvider to main.tsx**

Update `src/main.tsx`:
```tsx
import { StrictMode, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nContext, locales, getTranslation } from './i18n';
import type { Locale } from './i18n';
import './index.css';

function Root() {
  const [locale, setLocale] = useState<Locale>('he');

  const i18n = useMemo(() => ({
    locale,
    setLocale: (newLocale: Locale) => {
      setLocale(newLocale);
      document.documentElement.lang = newLocale;
      document.documentElement.dir = newLocale === 'he' ? 'rtl' : 'ltr';
    },
    t: (key: string, params?: Record<string, string | number>) =>
      getTranslation(locales[locale], key, params),
    dir: (locale === 'he' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  }), [locale]);

  return (
    <StrictMode>
      <I18nContext.Provider value={i18n}>
        <App />
      </I18nContext.Provider>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
```

- [ ] **Step 5: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/ src/main.tsx
git commit -m "feat: add i18n infrastructure with Hebrew and English locales"
```

---

## Task 4: Auth — Login Screen + Auto-Create Group

**Files:**
- Create: `src/hooks/useAuth.ts`, `src/data/groups.ts`, `src/hooks/useGroup.ts`, `src/screens/LoginScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create useAuth hook**

`src/hooks/useAuth.ts`:
```ts
import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({ user: session?.user ?? null, session, loading: false });
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  async function sendMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return { ...state, sendMagicLink, signOut };
}
```

- [ ] **Step 2: Create groups data layer**

`src/data/groups.ts`:
```ts
import { supabase } from '../lib/supabase';
import type { Group, GroupMember } from '../types';

export async function getOrCreateGroup(userId: string, displayName: string): Promise<{
  group: Group;
  member: GroupMember;
}> {
  // Check if user already belongs to a group
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('*, group:groups(*)')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (existingMember) {
    return {
      group: existingMember.group as Group,
      member: existingMember as GroupMember,
    };
  }

  // Create new group + add user as admin
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name: 'My Group' })
    .select()
    .single();

  if (groupError || !group) throw groupError ?? new Error('Failed to create group');

  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: userId,
      role: 'admin',
      display_name: displayName,
    })
    .select()
    .single();

  if (memberError || !member) throw memberError ?? new Error('Failed to create member');

  return { group: group as Group, member: member as GroupMember };
}
```

- [ ] **Step 3: Create useGroup hook**

`src/hooks/useGroup.ts`:
```ts
import { useEffect, useState } from 'react';
import type { Group, GroupMember } from '../types';
import { getOrCreateGroup } from '../data/groups';

interface GroupState {
  group: Group | null;
  member: GroupMember | null;
  loading: boolean;
  error: Error | null;
}

export function useGroup(userId: string | undefined) {
  const [state, setState] = useState<GroupState>({
    group: null,
    member: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId) {
      setState({ group: null, member: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    getOrCreateGroup(userId, 'User')
      .then(({ group, member }) => {
        if (!cancelled) setState({ group, member, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ group: null, member: null, loading: false, error });
      });

    return () => { cancelled = true; };
  }, [userId]);

  return state;
}
```

- [ ] **Step 4: Create LoginScreen**

`src/screens/LoginScreen.tsx`:
```tsx
import { useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';

export function LoginScreen() {
  const { t } = useI18n();
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendMagicLink(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('login.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('login.subtitle')}</p>
        </div>

        {sent ? (
          <div className="text-center bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-800 font-medium">{t('login.link_sent')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm text-gray-500 mb-1.5">{t('login.email_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.email_placeholder')}
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
              dir="ltr"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-4 py-3 text-base transition disabled:opacity-50"
            >
              {loading ? '...' : t('login.send_link')}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">{t('login.link_hint')}</p>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire auth into App.tsx with route protection**

`src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useGroup } from './hooks/useGroup';
import { LoginScreen } from './screens/LoginScreen';

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { group, loading: groupLoading } = useGroup(user?.id);

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
      <Route path="/lists" element={<div>Lists — Group: {group?.name}</div>} />
      <Route path="/lists/:listId" element={<div>List Detail</div>} />
      <Route path="/lists/:listId/add" element={<div>Rapid Add</div>} />
      <Route path="/lists/:listId/items/:itemId" element={<div>Item Detail</div>} />
      <Route path="*" element={<Navigate to="/lists" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 6: Verify it compiles and renders login**

Run:
```bash
npx tsc --noEmit && npm run dev
```

Expected: Opens to login screen with email input, styled with warm Apple Notes-like theme.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/ src/data/ src/screens/LoginScreen.tsx src/App.tsx
git commit -m "feat: add auth flow with magic link login and auto-create group"
```

---

## Task 5: Data Layer — Lists & Items CRUD

**Files:**
- Create: `src/data/lists.ts`, `src/data/items.ts`

- [ ] **Step 1: Create lists data layer**

`src/data/lists.ts`:
```ts
import { supabase } from '../lib/supabase';
import type { List } from '../types';

export async function fetchLists(groupId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as List[];
}

export async function fetchListWithCounts(groupId: string): Promise<
  (List & { item_count: number; checked_count: number; last_activity: string | null })[]
> {
  const { data: lists, error } = await supabase
    .from('lists')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Fetch counts and last activity for each list
  const results = await Promise.all(
    (lists as List[]).map(async (list) => {
      const { count: itemCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id);

      const { count: checkedCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id)
        .eq('checked', true);

      const { data: lastItem } = await supabase
        .from('items')
        .select('updated_at')
        .eq('list_id', list.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...list,
        item_count: itemCount ?? 0,
        checked_count: checkedCount ?? 0,
        last_activity: lastItem?.updated_at ?? null,
      };
    }),
  );

  return results;
}

export async function createList(
  groupId: string,
  userId: string,
  name: string,
  icon: string = '📋',
): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .insert({ group_id: groupId, name, icon, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data as List;
}

export async function updateList(listId: string, updates: { name?: string; icon?: string }): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .update(updates)
    .eq('id', listId)
    .select()
    .single();

  if (error) throw error;
  return data as List;
}

export async function deleteList(listId: string): Promise<void> {
  const { error } = await supabase.from('lists').delete().eq('id', listId);
  if (error) throw error;
}
```

- [ ] **Step 2: Create items data layer**

`src/data/items.ts`:
```ts
import { supabase } from '../lib/supabase';
import type { Item } from '../types';

export async function fetchItems(listId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data as Item[];
}

export async function createItem(
  listId: string,
  userId: string,
  name: string,
  category: string = 'other',
  quantity: number = 1,
): Promise<Item> {
  // Get next position
  const { count } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId);

  const { data, error } = await supabase
    .from('items')
    .insert({
      list_id: listId,
      name,
      category,
      quantity,
      added_by: userId,
      position: (count ?? 0),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function updateItem(
  itemId: string,
  updates: Partial<Pick<Item, 'name' | 'quantity' | 'unit' | 'category' | 'checked' | 'checked_by' | 'note' | 'position'>>,
): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function toggleItemChecked(itemId: string, checked: boolean, userId: string): Promise<Item> {
  return updateItem(itemId, {
    checked,
    checked_by: checked ? userId : null,
  });
}

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function fetchItemSuggestions(groupId: string, query: string): Promise<
  { name: string; category: string }[]
> {
  // Search distinct item names across all group lists
  const { data, error } = await supabase
    .from('items')
    .select('name, category, list:lists!inner(group_id)')
    .eq('lists.group_id', groupId)
    .ilike('name', `%${query}%`)
    .limit(10);

  if (error) throw error;

  // Deduplicate by name, keeping most recent category
  const seen = new Map<string, string>();
  for (const item of data ?? []) {
    if (!seen.has(item.name)) {
      seen.set(item.name, item.category);
    }
  }

  return Array.from(seen.entries()).map(([name, category]) => ({ name, category }));
}
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/
git commit -m "feat: add lists and items data layer with CRUD and suggestions"
```

---

## Task 6: Realtime Hooks

**Files:**
- Create: `src/hooks/useRealtimeLists.ts`, `src/hooks/useRealtimeItems.ts`, `src/hooks/useItemSuggestions.ts`

- [ ] **Step 1: Create useRealtimeLists hook**

`src/hooks/useRealtimeLists.ts`:
```ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchListWithCounts } from '../data/lists';
import type { List } from '../types';

type ListWithCounts = List & { item_count: number; checked_count: number; last_activity: string | null };

export function useRealtimeLists(groupId: string | undefined) {
  const [lists, setLists] = useState<ListWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    const data = await fetchListWithCounts(groupId);
    setLists(data);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;

    refresh();

    const channel = supabase
      .channel(`lists:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lists', filter: `group_id=eq.${groupId}` },
        () => { refresh(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => { refresh(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, refresh]);

  return { lists, loading, refresh };
}
```

- [ ] **Step 2: Create useRealtimeItems hook**

`src/hooks/useRealtimeItems.ts`:
```ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchItems } from '../data/items';
import type { Item } from '../types';

export function useRealtimeItems(listId: string | undefined) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!listId) return;
    const data = await fetchItems(listId);
    setItems(data);
    setLoading(false);
  }, [listId]);

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

  return { items, loading, refresh };
}
```

- [ ] **Step 3: Create useItemSuggestions hook**

`src/hooks/useItemSuggestions.ts`:
```ts
import { useEffect, useState } from 'react';
import { fetchItemSuggestions } from '../data/items';

export function useItemSuggestions(groupId: string | undefined, query: string) {
  const [suggestions, setSuggestions] = useState<{ name: string; category: string }[]>([]);

  useEffect(() => {
    if (!groupId || query.length < 1) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      const results = await fetchItemSuggestions(groupId, query);
      if (!cancelled) setSuggestions(results);
    }, 200); // debounce

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [groupId, query]);

  return suggestions;
}
```

- [ ] **Step 4: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: add realtime hooks for lists, items, and item suggestions"
```

---

## Task 7: Shared Components

**Files:**
- Create: `src/components/BottomNav.tsx`, `src/components/Avatar.tsx`, `src/components/SwipeableRow.tsx`, `src/components/QuantityPill.tsx`, `src/components/CategoryPill.tsx`, `src/components/SuggestionChips.tsx`

- [ ] **Step 1: Create BottomNav**

`src/components/BottomNav.tsx`:
```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';

export function BottomNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const isLists = location.pathname === '/lists';

  return (
    <nav className="flex border-t border-gray-200 bg-white">
      <button
        onClick={() => navigate('/lists')}
        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs ${
          isLists ? 'text-amber-600' : 'text-gray-400'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        {t('nav.lists')}
      </button>
      <button
        className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs text-gray-400"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {t('nav.settings')}
      </button>
    </nav>
  );
}
```

- [ ] **Step 2: Create Avatar**

`src/components/Avatar.tsx`:
```tsx
interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
}

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444'];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name, avatarUrl, size = 'sm' }: AvatarProps) {
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
  const initial = name.charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: getColor(name) }}
    >
      {initial}
    </div>
  );
}
```

- [ ] **Step 3: Create SwipeableRow**

`src/components/SwipeableRow.tsx`:
```tsx
import { useRef, useState } from 'react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;   // delete
  onSwipeRight?: () => void;  // open detail
  onCheck?: () => void;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export function SwipeableRow({
  children,
  onSwipeRight,
  leftActions,
  rightActions,
}: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = true;
    isHorizontal.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!swiping.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determine direction on first significant movement
    if (isHorizontal.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }

    if (!isHorizontal.current) return;
    setOffset(dx);
  }

  function handleTouchEnd() {
    swiping.current = false;
    // Threshold: 80px to trigger action
    if (offset > 80 && onSwipeRight) {
      onSwipeRight();
    }
    setOffset(0);
    isHorizontal.current = null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left actions (revealed on swipe right) */}
      {leftActions && (
        <div className="absolute inset-0 flex items-stretch">
          {leftActions}
          <div className="flex-1" />
        </div>
      )}
      {/* Right actions (revealed on swipe left) */}
      {rightActions && (
        <div className="absolute inset-0 flex items-stretch">
          <div className="flex-1" />
          {rightActions}
        </div>
      )}
      {/* Content */}
      <div
        className="relative bg-gray-50 transition-transform"
        style={{
          transform: offset !== 0 ? `translateX(${offset}px)` : undefined,
          transition: swiping.current ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create QuantityPill**

`src/components/QuantityPill.tsx`:
```tsx
import { useState } from 'react';

interface QuantityPillProps {
  quantity: number;
  onChange: (quantity: number) => void;
}

export function QuantityPill({ quantity, onChange }: QuantityPillProps) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setExpanded(true)}
          className="bg-amber-500 text-white text-xs px-2.5 py-0.5 rounded-lg font-medium"
        >
          x{quantity}
        </button>
        <div className="flex items-center justify-between bg-gray-100 border border-amber-400 rounded-xl px-4 py-2.5">
          <button
            onClick={() => { onChange(Math.max(1, quantity - 1)); }}
            className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm active:bg-gray-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="text-xl font-bold text-gray-900 min-w-[2rem] text-center">{quantity}</span>
          <button
            onClick={() => { onChange(quantity + 1); }}
            className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm active:bg-gray-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (quantity <= 1) {
    return (
      <button
        onClick={() => { onChange(2); setExpanded(true); }}
        className="bg-gray-200 text-gray-400 text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      className="bg-gray-300 text-gray-700 text-xs px-2.5 py-0.5 rounded-lg font-medium"
    >
      x{quantity}
    </button>
  );
}
```

- [ ] **Step 5: Create CategoryPill**

`src/components/CategoryPill.tsx`:
```tsx
import { useState } from 'react';
import { useI18n } from '../i18n';
import { CATEGORIES } from '../types';

interface CategoryPillProps {
  category: string;
  onChange: (category: string) => void;
}

export function CategoryPill({ category, onChange }: CategoryPillProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-gray-200 text-gray-500 text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1"
      >
        {t(`categories.${category}`)}
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-1.5 bg-gray-100 rounded-xl p-3 border border-gray-200">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { onChange(cat); setExpanded(false); }}
              className={`text-xs px-3 py-1.5 rounded-lg transition ${
                cat === category
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {t(`categories.${cat}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create SuggestionChips**

`src/components/SuggestionChips.tsx`:
```tsx
interface SuggestionChipsProps {
  suggestions: { name: string; category: string }[];
  onSelect: (suggestion: { name: string; category: string }) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 bg-gray-100 border-t border-gray-200 scrollbar-hide">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.name}
          onClick={() => onSelect(suggestion)}
          className="flex-shrink-0 bg-white border border-gray-200 rounded-full px-3.5 py-1.5 text-sm text-gray-700 active:bg-gray-50"
        >
          {suggestion.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/components/
git commit -m "feat: add shared components — BottomNav, Avatar, SwipeableRow, QuantityPill, CategoryPill, SuggestionChips"
```

---

## Task 8: Lists Screen

**Files:**
- Create: `src/screens/ListsScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create ListsScreen**

`src/screens/ListsScreen.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { useRealtimeLists } from '../hooks/useRealtimeLists';
import { createList } from '../data/lists';
import { BottomNav } from '../components/BottomNav';

export function ListsScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { group } = useGroup(user?.id);
  const { lists, loading } = useRealtimeLists(group?.id);
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📋');

  async function handleCreateList() {
    if (!group || !user || !newName.trim()) return;
    await createList(group.id, user.id, newName.trim(), newIcon);
    setNewName('');
    setNewIcon('📋');
    setShowNew(false);
  }

  function formatActivity(date: string | null): string {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('lists.just_now') ?? 'now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white px-4 py-3.5 border-b border-gray-200 flex items-center">
        <h1 className="text-lg font-bold text-gray-900 flex-1">{t('lists.title')}</h1>
        <button className="text-gray-400 p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </header>

      {/* List cards */}
      <div className="flex-1 p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => navigate(`/lists/${list.id}`)}
                className="w-full bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 active:bg-gray-50 text-start"
              >
                <span className="text-2xl">{list.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{list.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {t('lists.items_count', { count: list.item_count })}
                    {list.checked_count > 0 && ` · ${t('lists.checked_count', { count: list.checked_count })}`}
                    {list.last_activity && ` · ${formatActivity(list.last_activity)}`}
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}

            {/* New list */}
            {showNew ? (
              <div className="bg-white rounded-xl p-4 border border-amber-200 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewIcon(newIcon === '📋' ? '🛒' : '📋')}
                    className="text-2xl w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"
                  >
                    {newIcon}
                  </button>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                    placeholder={t('lists.new_list')}
                    className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none border border-gray-200 focus:border-amber-400"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-gray-500">
                    Cancel
                  </button>
                  <button onClick={handleCreateList} className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg">
                    {t('lists.new_list')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNew(true)}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center gap-3 text-gray-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="text-sm">{t('lists.new_list')}</span>
              </button>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Wire ListsScreen into App.tsx**

Replace the `/lists` route placeholder in `src/App.tsx`:
```tsx
import { ListsScreen } from './screens/ListsScreen';
// ... in Routes:
<Route path="/lists" element={<ListsScreen />} />
```

- [ ] **Step 3: Verify it compiles and renders**

Run:
```bash
npx tsc --noEmit && npm run dev
```

Expected: After login, shows Lists screen with empty state and "New list" dashed row.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ListsScreen.tsx src/App.tsx
git commit -m "feat: add Lists screen with realtime updates and create list flow"
```

---

## Task 9: List Detail Screen

**Files:**
- Create: `src/components/ItemRow.tsx`, `src/components/CategoryGroup.tsx`, `src/screens/ListDetailScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create ItemRow**

`src/components/ItemRow.tsx`:
```tsx
import type { Item } from '../types';
import { SwipeableRow } from './SwipeableRow';

interface ItemRowProps {
  item: Item;
  onToggleCheck: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
}

export function ItemRow({ item, onToggleCheck, onDelete, onOpenDetail }: ItemRowProps) {
  const hasNote = !!item.note;
  // hasImages would require a join or count — for now derive from data layer later

  return (
    <SwipeableRow
      onSwipeRight={onOpenDetail}
      rightActions={
        <>
          <button
            onClick={onDelete}
            className="w-[68px] bg-red-500 flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
          <button
            onClick={onToggleCheck}
            className="w-[68px] bg-amber-500 flex items-center justify-center rounded-e-xl"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </>
      }
      leftActions={
        <button
          onClick={onOpenDetail}
          className="w-[68px] bg-blue-500 flex items-center justify-center rounded-s-xl"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </button>
      }
    >
      <div
        className={`flex items-center gap-2.5 px-3.5 py-3 ${item.checked ? 'opacity-40' : ''}`}
      >
        <button onClick={onToggleCheck} className="flex-shrink-0">
          {item.checked ? (
            <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : (
            <div className="w-6 h-6 border-2 border-gray-300 rounded-md" />
          )}
        </button>
        <span className={`text-sm text-gray-900 ${item.checked ? 'line-through' : ''}`}>
          {item.name}
        </span>
        {item.quantity > 1 && (
          <span className="bg-gray-300 text-gray-700 text-xs px-2 py-0.5 rounded-lg font-medium">
            x{item.quantity}
          </span>
        )}
        {hasNote && (
          <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        )}
      </div>
    </SwipeableRow>
  );
}
```

- [ ] **Step 2: Create CategoryGroup**

`src/components/CategoryGroup.tsx`:
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
}

export function CategoryGroup({ category, items, onToggleCheck, onDelete, onOpenDetail }: CategoryGroupProps) {
  const { t } = useI18n();

  return (
    <div className="mb-4">
      <div className="text-xs text-gray-400 font-medium mb-1.5 px-1">
        {t(`categories.${category}`)}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
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

- [ ] **Step 3: Create ListDetailScreen**

`src/screens/ListDetailScreen.tsx`:
```tsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useRealtimeItems } from '../hooks/useRealtimeItems';
import { toggleItemChecked, deleteItem } from '../data/items';
import { CategoryGroup } from '../components/CategoryGroup';
import { BottomNav } from '../components/BottomNav';
import { CATEGORIES } from '../types';

export function ListDetailScreen() {
  const { t } = useI18n();
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const { items, loading } = useRealtimeItems(listId);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  const { unchecked, checked } = useMemo(() => {
    const unchecked = filteredItems.filter((i) => !i.checked);
    const checked = filteredItems.filter((i) => i.checked);
    return { unchecked, checked };
  }, [filteredItems]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, typeof unchecked>();
    for (const cat of CATEGORIES) {
      const catItems = unchecked.filter((i) => i.category === cat);
      if (catItems.length > 0) groups.set(cat, catItems);
    }
    return groups;
  }, [unchecked]);

  async function handleToggleCheck(itemId: string) {
    if (!user) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    await toggleItemChecked(itemId, !item.checked, user.id);
  }

  async function handleDelete(itemId: string) {
    await deleteItem(itemId);
  }

  function handleOpenDetail(itemId: string) {
    navigate(`/lists/${listId}/items/${itemId}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Top bar */}
      <header className="bg-white px-3 py-2.5 border-b border-gray-200 flex items-center gap-2">
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
            className="bg-transparent text-sm outline-none flex-1 text-gray-700 placeholder:text-gray-300"
          />
        </div>
        <button
          onClick={() => navigate(`/lists/${listId}/add`)}
          className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button className="p-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </header>

      {/* Items */}
      <div className="flex-1 p-4 overflow-y-auto">
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
              />
            ))}
            {checked.length > 0 && (
              <CategoryGroup
                category="checked_section"
                items={checked}
                onToggleCheck={handleToggleCheck}
                onDelete={handleDelete}
                onOpenDetail={handleOpenDetail}
              />
            )}
            {items.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">
                {t('rapid_add.input_placeholder')}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 4: Wire into App.tsx**

```tsx
import { ListDetailScreen } from './screens/ListDetailScreen';
// ... in Routes:
<Route path="/lists/:listId" element={<ListDetailScreen />} />
```

- [ ] **Step 5: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ItemRow.tsx src/components/CategoryGroup.tsx src/screens/ListDetailScreen.tsx src/App.tsx
git commit -m "feat: add List Detail screen with category groups, search, and swipe actions"
```

---

## Task 10: Rapid Add Screen

**Files:**
- Create: `src/screens/RapidAddScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create RapidAddScreen**

`src/screens/RapidAddScreen.tsx`:
```tsx
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { useItemSuggestions } from '../hooks/useItemSuggestions';
import { createItem, updateItem } from '../data/items';
import { QuantityPill } from '../components/QuantityPill';
import { CategoryPill } from '../components/CategoryPill';
import { SuggestionChips } from '../components/SuggestionChips';

interface AddedItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
}

export function RapidAddScreen() {
  const { t } = useI18n();
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const { group } = useGroup(user?.id);
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useItemSuggestions(group?.id, input);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!listId || !user || !input.trim()) return;
    const name = input.trim();

    // Check if suggestion matches
    const match = suggestions.find((s) => s.name === name);
    const category = match?.category ?? 'other';

    const item = await createItem(listId, user.id, name, category);
    setAddedItems((prev) => [...prev, { id: item.id, name: item.name, quantity: item.quantity, category: item.category }]);
    setInput('');
    inputRef.current?.focus();
  }

  function handleSelectSuggestion(suggestion: { name: string; category: string }) {
    if (!listId || !user) return;
    createItem(listId, user.id, suggestion.name, suggestion.category).then((item) => {
      setAddedItems((prev) => [...prev, { id: item.id, name: item.name, quantity: item.quantity, category: item.category }]);
    });
    setInput('');
    inputRef.current?.focus();
  }

  async function handleQuantityChange(itemId: string, quantity: number) {
    await updateItem(itemId, { quantity });
    setAddedItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
    );
  }

  async function handleCategoryChange(itemId: string, category: string) {
    await updateItem(itemId, { category });
    setAddedItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, category } : i)),
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-200 flex items-center">
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('rapid_add.title')}</h1>
        <button
          onClick={() => navigate(`/lists/${listId}`)}
          className="text-amber-600 font-semibold text-sm"
        >
          {t('rapid_add.done')}
        </button>
      </header>

      {/* Canvas */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        {addedItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 py-2.5 border-b border-gray-100">
            <div className="w-5 h-5 border-2 border-gray-300 rounded-md flex-shrink-0" />
            <span className="text-sm text-gray-500">{item.name}</span>
            <QuantityPill
              quantity={item.quantity}
              onChange={(q) => handleQuantityChange(item.id, q)}
            />
            <div className="flex-1" />
            <CategoryPill
              category={item.category}
              onChange={(c) => handleCategoryChange(item.id, c)}
            />
          </div>
        ))}

        {/* Current input line */}
        <div className="flex items-center gap-2 py-2.5">
          <div className="w-5 h-5 border-2 border-gray-200 rounded-md flex-shrink-0 opacity-30" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={t('rapid_add.input_placeholder')}
            className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-300"
          />
        </div>
      </div>

      {/* Suggestion chips above keyboard */}
      <SuggestionChips suggestions={suggestions} onSelect={handleSelectSuggestion} />
    </div>
  );
}
```

- [ ] **Step 2: Wire into App.tsx**

```tsx
import { RapidAddScreen } from './screens/RapidAddScreen';
// ... in Routes:
<Route path="/lists/:listId/add" element={<RapidAddScreen />} />
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/RapidAddScreen.tsx src/App.tsx
git commit -m "feat: add Rapid Add screen with notes-like canvas and suggestion chips"
```

---

## Task 11: Item Detail Screen

**Files:**
- Create: `src/screens/ItemDetailScreen.tsx`, `src/data/images.ts`, `src/lib/image.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create image compression utility**

`src/lib/image.ts`:
```ts
export async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => { blob ? resolve(blob) : reject(new Error('Compression failed')); },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
```

- [ ] **Step 2: Create images data layer**

`src/data/images.ts`:
```ts
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/image';
import type { ItemImage } from '../types';

export async function fetchItemImages(itemId: string): Promise<ItemImage[]> {
  const { data, error } = await supabase
    .from('item_images')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as ItemImage[];
}

export async function uploadItemImage(
  groupId: string,
  itemId: string,
  file: File,
): Promise<ItemImage> {
  const compressed = await compressImage(file);
  const filename = `${Date.now()}.jpg`;
  const storagePath = `${groupId}/${itemId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('item-images')
    .upload(storagePath, compressed, { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('item_images')
    .insert({ item_id: itemId, storage_path: storagePath })
    .select()
    .single();

  if (error) throw error;
  return data as ItemImage;
}

export async function deleteItemImage(image: ItemImage): Promise<void> {
  await supabase.storage.from('item-images').remove([image.storage_path]);
  await supabase.from('item_images').delete().eq('id', image.id);
}

export function getImageUrl(storagePath: string): string {
  const { data } = supabase.storage.from('item-images').getPublicUrl(storagePath);
  return data.publicUrl;
}
```

- [ ] **Step 3: Create ItemDetailScreen**

`src/screens/ItemDetailScreen.tsx`:
```tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { supabase } from '../lib/supabase';
import { updateItem } from '../data/items';
import { fetchItemImages, uploadItemImage, deleteItemImage, getImageUrl } from '../data/images';
import { Avatar } from '../components/Avatar';
import { CATEGORIES, UNITS } from '../types';
import type { Item, ItemImage, GroupMember } from '../types';

export function ItemDetailScreen() {
  const { t } = useI18n();
  const { listId, itemId } = useParams<{ listId: string; itemId: string }>();
  const { user } = useAuth();
  const { group } = useGroup(user?.id);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<Item | null>(null);
  const [images, setImages] = useState<ItemImage[]>([]);
  const [addedBy, setAddedBy] = useState<GroupMember | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!itemId) return;

    supabase.from('items').select('*').eq('id', itemId).single().then(({ data }) => {
      if (data) setItem(data as Item);
    });

    fetchItemImages(itemId).then(setImages);
  }, [itemId]);

  useEffect(() => {
    if (!item?.added_by) return;
    supabase.from('group_members').select('*').eq('user_id', item.added_by).single().then(({ data }) => {
      if (data) setAddedBy(data as GroupMember);
    });
  }, [item?.added_by]);

  async function handleUpdate(updates: Partial<Item>) {
    if (!itemId || !item) return;
    const updated = await updateItem(itemId, updates);
    setItem(updated);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !group || !itemId) return;
    setUploading(true);
    try {
      const image = await uploadItemImage(group.id, itemId, file);
      setImages((prev) => [...prev, image]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteImage(image: ItemImage) {
    await deleteItemImage(image);
    setImages((prev) => prev.filter((i) => i.id !== image.id));
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const createdDate = new Date(item.created_at);
  const timeStr = createdDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-200 flex items-center">
        <div className="flex items-center gap-1.5 min-w-[60px]">
          {addedBy && <Avatar name={addedBy.display_name} avatarUrl={addedBy.avatar_url} size="sm" />}
          <span className="text-xs text-gray-300">{timeStr}</span>
        </div>
        <h1 className="text-base font-semibold text-gray-900 flex-1 text-center">{item.name}</h1>
        <div className="min-w-[60px] flex justify-end">
          <button onClick={() => navigate(`/lists/${listId}`)} className="p-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quantity + Unit */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.quantity')}</label>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <button
                onClick={() => handleUpdate({ quantity: Math.max(1, item.quantity - 1) })}
                className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span className="text-lg font-bold text-gray-900">{item.quantity}</span>
              <button
                onClick={() => handleUpdate({ quantity: item.quantity + 1 })}
                className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.unit')}</label>
            <select
              value={item.unit ?? 'unit'}
              onChange={(e) => handleUpdate({ unit: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none text-gray-700"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{t(`units.${u}`)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.category')}</label>
          <select
            value={item.category}
            onChange={(e) => handleUpdate({ category: e.target.value })}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none text-gray-700"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
            ))}
          </select>
          <p className="text-xs text-gray-300 mt-1">{t('item_detail.category_hint')}</p>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.note')}</label>
          <textarea
            value={item.note ?? ''}
            onChange={(e) => handleUpdate({ note: e.target.value || null })}
            placeholder="..."
            rows={3}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none text-gray-700 resize-none"
          />
        </div>

        {/* Images */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">{t('item_detail.images')}</label>
          <div className="space-y-2">
            {images.map((image) => (
              <div key={image.id} className="relative rounded-xl overflow-hidden">
                <img
                  src={getImageUrl(image.storage_path)}
                  alt=""
                  className="w-full h-auto rounded-xl"
                />
                <button
                  onClick={() => handleDeleteImage(image)}
                  className="absolute top-2 end-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 text-sm"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {t('item_detail.add_image')}
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into App.tsx**

```tsx
import { ItemDetailScreen } from './screens/ItemDetailScreen';
// ... in Routes:
<Route path="/lists/:listId/items/:itemId" element={<ItemDetailScreen />} />
```

- [ ] **Step 5: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/image.ts src/data/images.ts src/screens/ItemDetailScreen.tsx src/App.tsx
git commit -m "feat: add Item Detail screen with quantity stepper, category, notes, and image upload"
```

---

## Task 12: PWA Icons & Final Wiring

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `src/App.tsx` (final cleanup)

- [ ] **Step 1: Generate placeholder PWA icons**

Run:
```bash
mkdir -p public/icons
# Generate simple colored square icons using a canvas approach or download placeholders
# For now, create minimal SVG-based PNGs:
npx --yes sharp-cli -i <(echo '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192"><rect width="192" height="192" rx="32" fill="#F59E0B"/><text x="96" y="120" text-anchor="middle" font-size="80" fill="white" font-family="sans-serif">🛒</text></svg>') -o public/icons/icon-192.png
npx --yes sharp-cli -i <(echo '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="80" fill="#F59E0B"/><text x="256" y="310" text-anchor="middle" font-size="200" fill="white" font-family="sans-serif">🛒</text></svg>') -o public/icons/icon-512.png
```

If sharp-cli isn't available, create simple placeholder PNGs manually or use any 192x192 and 512x512 amber-colored images. The icons can be replaced with proper designs later.

- [ ] **Step 2: Final App.tsx with all routes**

`src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useGroup } from './hooks/useGroup';
import { LoginScreen } from './screens/LoginScreen';
import { ListsScreen } from './screens/ListsScreen';
import { ListDetailScreen } from './screens/ListDetailScreen';
import { RapidAddScreen } from './screens/RapidAddScreen';
import { ItemDetailScreen } from './screens/ItemDetailScreen';

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { loading: groupLoading } = useGroup(user?.id);

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
      <Route path="/lists/:listId/add" element={<RapidAddScreen />} />
      <Route path="/lists/:listId/items/:itemId" element={<ItemDetailScreen />} />
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

- [ ] **Step 3: Verify full build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors. `dist/` contains the PWA manifest, service worker, and all assets.

- [ ] **Step 4: Commit**

```bash
git add public/icons/ src/App.tsx
git commit -m "feat: add PWA icons and finalize all route wiring"
```

---

## Task 13: Supabase Setup (Manual Steps)

This task is done by the user in the Supabase dashboard — not automated.

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → New Project. Copy the project URL and anon key into `.env.local`.

- [ ] **Step 2: Run the SQL migration**

Go to Supabase Dashboard → SQL Editor → New Query. Paste the contents of `supabase/migrations/001_initial_schema.sql` and run.

- [ ] **Step 3: Enable realtime**

Go to Database → Replication → Enable for `items` and `lists` tables (the migration already adds them to the publication, but verify in the dashboard).

- [ ] **Step 4: Create storage bucket**

Go to Storage → New Bucket → Name: `item-images`, Public: false. Add an RLS policy that allows authenticated users whose group owns the item to read/write.

- [ ] **Step 5: Enable magic link auth**

Go to Authentication → Providers → Email → ensure "Enable Email" is on and "Confirm Email" is off (for magic link simplicity).

- [ ] **Step 6: Verify login flow**

Run `npm run dev`, open the app, enter your email, receive magic link, click it, verify you're redirected to the Lists screen.

---

## Task 14: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

- [ ] **Step 2: Connect to Vercel**

Go to https://vercel.com → Import Project → Select the GitHub repo. Add environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

- [ ] **Step 3: Verify deployment**

Visit the Vercel URL. Verify:
- Login screen loads
- PWA manifest is served (`/manifest.webmanifest`)
- Service worker registers
- App is installable on iPhone (Safari → Share → Add to Home Screen)

- [ ] **Step 4: Add Vercel URL to Supabase redirect**

Go to Supabase Dashboard → Authentication → URL Configuration → Add the Vercel URL as a redirect URL for magic link auth.

- [ ] **Step 5: Commit any vercel config if needed**

```bash
# Only if vercel.json was created
git add vercel.json
git commit -m "chore: add Vercel config"
```
