# List Sharing & Header Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add list-based invites (QR + link sharing), redesign the list detail header with icon-only layout and expandable search, and add a join page for invitees.

**Architecture:** New `list_invites` table in Supabase with public-read-by-token RLS. Invite sheet uses Web Share API + client-side QR generation. Join page at `/join/:token` with email (magic link) or guest (anonymous) auth paths. Header redesign replaces the persistent search box with an icon that expands on tap.

**Tech Stack:** React, TypeScript, Supabase (auth + Postgres), `qrcode` npm package for QR generation, Web Share API

**Spec:** `docs/superpowers/specs/2026-04-03-invite-and-header-design.md`

---

## File Structure

```
supabase/
└── migrations/
    └── 002_list_invites.sql          # New table + RLS + list_members view
src/
├── data/
│   └── invites.ts                    # Create invite, fetch by token, accept invite
├── components/
│   └── InviteSheet.tsx               # Invite sheet with QR, link, share buttons
├── screens/
│   ├── JoinScreen.tsx                # Join page for invitees (/join/:token)
│   ├── ListDetailScreen.tsx          # Header redesign (icons, expandable search, share)
│   └── ListsScreen.tsx               # Member avatars on shared lists
├── i18n/
│   ├── he.json                       # Add invite strings
│   └── en.json                       # Add invite strings
└── App.tsx                           # Add /join/:token route
```

---

## Task 1: SQL Migration — list_invites Table

**Files:**
- Create: `supabase/migrations/002_list_invites.sql`

- [ ] **Step 1: Write the migration SQL**

`supabase/migrations/002_list_invites.sql`:
```sql
-- List invites (per-list sharing, like Apple Notes)
create table list_invites (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table list_invites enable row level security;

-- Members of the list's group can create and read invites
create policy "Group members can read list invites"
  on list_invites for select using (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

create policy "Group members can create list invites"
  on list_invites for insert with check (
    list_id in (select id from lists where group_id in (select user_group_ids()))
  );

-- Anyone can read an invite by token (for join flow)
create policy "Anyone can read invite by token"
  on list_invites for select using (true);

-- Add a list_members table to track per-list sharing
-- (separate from group_members which is account-level)
create table list_members (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (list_id, user_id)
);

alter table list_members enable row level security;

-- Anyone in the list can read members
create policy "List members can read"
  on list_members for select using (
    list_id in (select list_id from list_members where user_id = auth.uid())
    or list_id in (select id from lists where group_id in (select user_group_ids()))
  );

-- Users can add themselves (for join flow)
create policy "Users can join lists"
  on list_members for insert with check (user_id = auth.uid());

-- RPC to accept an invite (validates token, adds member, returns list)
create or replace function accept_list_invite(
  invite_token text,
  member_display_name text
) returns json as $$
declare
  v_invite record;
  v_list record;
begin
  -- Find valid invite
  select * into v_invite from list_invites
    where token = invite_token and expires_at > now();

  if v_invite is null then
    raise exception 'Invalid or expired invite';
  end if;

  -- Get list info
  select * into v_list from lists where id = v_invite.list_id;

  -- Add user as list member (ignore if already member)
  insert into list_members (list_id, user_id, display_name, role)
    values (v_invite.list_id, auth.uid(), member_display_name, 'member')
    on conflict (list_id, user_id) do nothing;

  -- Also ensure user is in the list's group
  insert into group_members (group_id, user_id, display_name, role)
    values (v_list.group_id, auth.uid(), member_display_name, 'member')
    on conflict (group_id, user_id) do nothing;

  return json_build_object(
    'list_id', v_invite.list_id,
    'list_name', v_list.name,
    'list_icon', v_list.icon,
    'group_id', v_list.group_id
  );
end;
$$ language plpgsql security definer;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/002_list_invites.sql
git commit -m "feat: add list_invites and list_members tables with RLS and accept_invite RPC"
```

**Note:** This SQL must be run manually in Supabase SQL Editor after commit.

---

## Task 2: i18n Strings

**Files:**
- Modify: `src/i18n/he.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add invite strings to Hebrew locale**

Add to `src/i18n/he.json` after the `"actions"` section:

```json
  "invite": {
    "share_list": "שתף את \"{{name}}\"",
    "share_subtitle": "כל מי שמקבל יוכל לראות ולערוך",
    "copy_link": "העתק",
    "link_copied": "הקישור הועתק",
    "valid_for": "תקף ל-7 ימים",
    "whatsapp": "WhatsApp",
    "message": "הודעה",
    "more": "עוד",
    "join_title": "{{name}} שיתף איתך רשימה",
    "join_email": "כניסה עם אימייל",
    "join_email_desc": "חשבון מלא עם רשימות משלך",
    "join_guest": "כניסה כאורח",
    "join_guest_desc": "רק שם — לילדים",
    "join_button": "הצטרף לרשימה",
    "guest_name_placeholder": "השם שלך",
    "expired": "הקישור פג תוקף",
    "expired_desc": "בקש קישור חדש מהמזמין",
    "items_count": "{{count}} פריטים",
    "cancel": "ביטול",
    "search_cancel": "ביטול"
  }
```

- [ ] **Step 2: Add invite strings to English locale**

Add to `src/i18n/en.json` after the `"actions"` section:

```json
  "invite": {
    "share_list": "Share \"{{name}}\"",
    "share_subtitle": "Anyone with the link can view and edit",
    "copy_link": "Copy",
    "link_copied": "Link copied",
    "valid_for": "Valid for 7 days",
    "whatsapp": "WhatsApp",
    "message": "Message",
    "more": "More",
    "join_title": "{{name}} shared a list with you",
    "join_email": "Sign in with email",
    "join_email_desc": "Full account with your own lists",
    "join_guest": "Join as guest",
    "join_guest_desc": "Just a name — for kids",
    "join_button": "Join list",
    "guest_name_placeholder": "Your name",
    "expired": "Link expired",
    "expired_desc": "Ask the inviter for a new link",
    "items_count": "{{count}} items",
    "cancel": "Cancel",
    "search_cancel": "Cancel"
  }
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/i18n/
git commit -m "feat: add invite-related i18n strings for Hebrew and English"
```

---

## Task 3: Invites Data Layer

**Files:**
- Create: `src/data/invites.ts`
- Modify: `src/types/database.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add types**

Add to `src/types/database.ts`:
```ts
export interface ListInvite {
  id: string;
  list_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  created_at: string;
}

export interface ListMember {
  id: string;
  list_id: string;
  user_id: string;
  display_name: string;
  role: 'owner' | 'member';
  joined_at: string;
}
```

Add to `src/types/index.ts`:
```ts
export type { Group, GroupMember, List, Item, ItemImage, GroupInvite, ListInvite, ListMember } from './database';
```

- [ ] **Step 2: Create invites data layer**

`src/data/invites.ts`:
```ts
import { supabase } from '../lib/supabase';
import type { ListInvite, ListMember } from '../types';

export async function createListInvite(listId: string, userId: string): Promise<ListInvite> {
  const { data, error } = await supabase
    .from('list_invites')
    .insert({ list_id: listId, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data as ListInvite;
}

export async function getInviteByToken(token: string): Promise<ListInvite | null> {
  const { data, error } = await supabase
    .from('list_invites')
    .select('*')
    .eq('token', token)
    .single();

  if (error) return null;
  return data as ListInvite;
}

export async function getInviteWithList(token: string): Promise<{
  invite: ListInvite;
  list: { id: string; name: string; icon: string; group_id: string };
  itemCount: number;
  creatorName: string;
} | null> {
  const { data: invite } = await supabase
    .from('list_invites')
    .select('*')
    .eq('token', token)
    .single();

  if (!invite) return null;

  const { data: list } = await supabase
    .from('lists')
    .select('id, name, icon, group_id')
    .eq('id', invite.list_id)
    .single();

  if (!list) return null;

  const { count } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', invite.list_id);

  const { data: creator } = await supabase
    .from('group_members')
    .select('display_name')
    .eq('user_id', invite.created_by)
    .limit(1)
    .single();

  return {
    invite: invite as ListInvite,
    list: list as { id: string; name: string; icon: string; group_id: string },
    itemCount: count ?? 0,
    creatorName: creator?.display_name ?? 'Someone',
  };
}

export async function acceptInvite(token: string, displayName: string): Promise<{
  list_id: string;
  list_name: string;
  list_icon: string;
  group_id: string;
}> {
  const { data, error } = await supabase.rpc('accept_list_invite', {
    invite_token: token,
    member_display_name: displayName,
  });

  if (error) throw error;
  return data;
}

export async function getListMembers(listId: string): Promise<ListMember[]> {
  const { data, error } = await supabase
    .from('list_members')
    .select('*')
    .eq('list_id', listId);

  if (error) throw error;
  return (data ?? []) as ListMember[];
}

export function getInviteUrl(token: string): string {
  return `${window.location.origin}/join/${token}`;
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/types/ src/data/invites.ts
git commit -m "feat: add invite data layer with create, fetch, accept, and list members"
```

---

## Task 4: Install QR Code Package

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install qrcode**

```bash
npm install qrcode
npm install -D @types/qrcode
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add qrcode dependency for invite QR generation"
```

---

## Task 5: Invite Sheet Component

**Files:**
- Create: `src/components/InviteSheet.tsx`

- [ ] **Step 1: Create InviteSheet**

`src/components/InviteSheet.tsx`:
```tsx
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { createListInvite, getInviteUrl, getListMembers } from '../data/invites';
import { Avatar } from './Avatar';
import type { ListMember } from '../types';

interface InviteSheetProps {
  listId: string;
  listName: string;
  listIcon: string;
  onClose: () => void;
}

export function InviteSheet({ listId, listName, listIcon, onClose }: InviteSheetProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [inviteUrl, setInviteUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Create invite and generate QR
    createListInvite(listId, user.id).then((invite) => {
      const url = getInviteUrl(invite.token);
      setInviteUrl(url);
      QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: '#333333' } })
        .then(setQrDataUrl);
    });

    // Fetch members
    getListMembers(listId).then(setMembers);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsOpen(true));
    });
  }, [listId, user]);

  function handleClose() {
    setIsOpen(false);
    setTimeout(onClose, 300);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare(method: 'whatsapp' | 'message' | 'native') {
    const text = `${t('invite.share_list', { name: listName })}\n${inviteUrl}`;

    if (method === 'native' && navigator.share) {
      await navigator.share({ title: listName, text, url: inviteUrl });
      return;
    }

    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      return;
    }

    if (method === 'message') {
      window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank');
    }
  }

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-50 transition-colors duration-300 ${isOpen ? 'bg-black/40' : 'bg-black/0'}`}
        onClick={handleClose}
      />
      <div
        className={`fixed left-0 right-0 bottom-0 z-[51] bg-white rounded-t-2xl transition-transform duration-300`}
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '85vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-6">
          {/* Title */}
          <h3 className="text-[17px] font-semibold text-center mt-2">
            {t('invite.share_list', { name: `${listIcon} ${listName}` })}
          </h3>
          <p className="text-sm text-gray-400 text-center mt-1">
            {t('invite.share_subtitle')}
          </p>

          {/* Members */}
          {members.length > 0 && (
            <div className="flex justify-center mt-3 -space-x-1.5 rtl:space-x-reverse">
              {members.map((m) => (
                <Avatar key={m.id} name={m.display_name} size="sm" />
              ))}
            </div>
          )}

          {/* QR Code */}
          {qrDataUrl && (
            <div className="flex justify-center mt-4">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <img src={qrDataUrl} alt="QR" className="w-[140px] h-[140px]" />
              </div>
            </div>
          )}

          {/* Link */}
          {inviteUrl && (
            <div className="mt-4 bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2 border border-gray-100">
              <span className="flex-1 text-sm text-gray-400 truncate" dir="ltr">{inviteUrl}</span>
              <button
                onClick={handleCopy}
                className="bg-amber-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
              >
                {copied ? t('invite.link_copied') : t('invite.copy_link')}
              </button>
            </div>
          )}

          {/* Share actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-3 flex flex-col items-center gap-1.5"
            >
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-sm">💬</div>
              <span className="text-xs text-gray-500">{t('invite.whatsapp')}</span>
            </button>
            <button
              onClick={() => handleShare('message')}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-3 flex flex-col items-center gap-1.5"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm">✉️</div>
              <span className="text-xs text-gray-500">{t('invite.message')}</span>
            </button>
            <button
              onClick={() => handleShare('native')}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-3 flex flex-col items-center gap-1.5"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">⋯</div>
              <span className="text-xs text-gray-500">{t('invite.more')}</span>
            </button>
          </div>

          <p className="text-xs text-gray-300 text-center mt-3">{t('invite.valid_for')}</p>
        </div>
      </div>
    </>,
    document.body,
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/InviteSheet.tsx
git commit -m "feat: create InviteSheet with QR code, link copy, and share actions"
```

---

## Task 6: Join Screen

**Files:**
- Create: `src/screens/JoinScreen.tsx`

- [ ] **Step 1: Create JoinScreen**

`src/screens/JoinScreen.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { getInviteWithList, acceptInvite } from '../data/invites';
import { supabase } from '../lib/supabase';

type JoinMode = 'choose' | 'email' | 'guest';

export function JoinScreen() {
  const { t } = useI18n();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [listInfo, setListInfo] = useState<{
    name: string; icon: string; itemCount: number; creatorName: string;
  } | null>(null);
  const [mode, setMode] = useState<JoinMode>('choose');
  const [email, setEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    getInviteWithList(token).then((result) => {
      if (!result || new Date(result.invite.expires_at) < new Date()) {
        setExpired(true);
      } else {
        setListInfo({
          name: result.list.name,
          icon: result.list.icon,
          itemCount: result.itemCount,
          creatorName: result.creatorName,
        });
      }
      setLoading(false);
    });
  }, [token]);

  // If user is already logged in, auto-accept
  useEffect(() => {
    if (user && token && listInfo) {
      acceptInvite(token, user.email ?? 'User').then((result) => {
        navigate(`/lists/${result.list_id}`);
      });
    }
  }, [user, token, listInfo, navigate]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);

    // Store token in localStorage so we can accept after auth redirect
    localStorage.setItem('pending_invite_token', token!);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/join/${token}` },
    });

    if (error) {
      console.error('Magic link error:', error);
      setSubmitting(false);
      return;
    }

    setEmailSent(true);
    setSubmitting(false);
  }

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim() || !token) return;
    setSubmitting(true);

    // Sign in anonymously
    const { error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) {
      console.error('Anonymous sign-in error:', anonError);
      setSubmitting(false);
      return;
    }

    // Accept the invite
    const result = await acceptInvite(token, guestName.trim());
    navigate(`/lists/${result.list_id}`);
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-stone-50 p-6">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl mb-4">⏰</div>
        <h1 className="text-xl font-bold text-gray-900">{t('invite.expired')}</h1>
        <p className="text-sm text-gray-400 mt-2 text-center">{t('invite.expired_desc')}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <div className="text-center pt-12 pb-6 px-6">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🛒</div>
        <h1 className="text-lg font-bold text-gray-900">
          {t('invite.join_title', { name: listInfo?.creatorName ?? '' })}
        </h1>
        <div className="text-2xl mt-2">{listInfo?.icon} {listInfo?.name}</div>
        <p className="text-sm text-gray-400 mt-1">
          {t('invite.items_count', { count: listInfo?.itemCount ?? 0 })}
        </p>
      </div>

      {/* Join options */}
      <div className="px-6 flex-1">
        {mode === 'choose' && (
          <>
            <button
              onClick={() => setMode('email')}
              className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 mb-3 text-start active:bg-amber-100"
            >
              <span className="text-2xl">✉️</span>
              <div>
                <div className="font-semibold text-[15px]">{t('invite.join_email')}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t('invite.join_email_desc')}</div>
              </div>
            </button>
            <button
              onClick={() => setMode('guest')}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center gap-3 text-start active:bg-gray-100"
            >
              <span className="text-2xl">👤</span>
              <div>
                <div className="font-semibold text-[15px]">{t('invite.join_guest')}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t('invite.join_guest_desc')}</div>
              </div>
            </button>
          </>
        )}

        {mode === 'email' && (
          emailSent ? (
            <div className="text-center bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-medium">{t('login.link_sent')}</p>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit}>
              <label className="block text-sm text-gray-500 mb-1.5">{t('login.email_label')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.email_placeholder')}
                required
                autoFocus
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-amber-400"
                dir="ltr"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-3 bg-amber-500 text-white font-semibold rounded-xl px-4 py-3 text-base disabled:opacity-50"
              >
                {t('login.send_link')}
              </button>
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="w-full mt-2 text-sm text-gray-400 py-2"
              >
                {t('invite.cancel')}
              </button>
            </form>
          )
        )}

        {mode === 'guest' && (
          <form onSubmit={handleGuestSubmit}>
            <label className="block text-sm text-gray-500 mb-1.5 text-center">{t('invite.join_guest')}</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t('invite.guest_name_placeholder')}
              required
              autoFocus
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-amber-400 text-center"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-3 bg-amber-500 text-white font-semibold rounded-xl px-4 py-3 text-base disabled:opacity-50"
            >
              {t('invite.join_button')}
            </button>
            <button
              type="button"
              onClick={() => setMode('choose')}
              className="w-full mt-2 text-sm text-gray-400 py-2"
            >
              {t('invite.cancel')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/screens/JoinScreen.tsx
git commit -m "feat: create JoinScreen with email and guest auth paths"
```

---

## Task 7: Header Redesign + Share Button + Route Wiring

**Files:**
- Modify: `src/screens/ListDetailScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update ListDetailScreen header**

In `src/screens/ListDetailScreen.tsx`, replace the entire header section (lines 124–161) with the new icon-based layout. Add search mode state, share mode state, and integrate the InviteSheet.

Add these imports at the top:
```tsx
import { InviteSheet } from '../components/InviteSheet';
```

Add these state variables after existing state:
```tsx
const [isSearchMode, setIsSearchMode] = useState(false);
const [showInviteSheet, setShowInviteSheet] = useState(false);
```

Replace the header JSX with:
```tsx
{!isAddMode && (
  isSearchMode ? (
    <header className="bg-white px-3 py-2.5 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
      <input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('list_detail.search_placeholder')}
        className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-base outline-none text-gray-700 placeholder:text-gray-300"
      />
      <button
        onClick={() => { setIsSearchMode(false); setSearch(''); }}
        className="text-amber-600 font-semibold text-sm whitespace-nowrap"
      >
        {t('invite.search_cancel')}
      </button>
    </header>
  ) : (
    <header className="bg-white px-3 py-2.5 border-b border-gray-200 flex items-center gap-1.5 flex-shrink-0">
      {/* RTL start (right side): + and search */}
      <button
        onClick={() => {
          setIsAddMode(true);
          setTimeout(() => {
            const input = document.querySelector('[data-add-input]') as HTMLInputElement;
            input?.focus();
          }, 50);
        }}
        className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0"
      >
        <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        onClick={() => setIsSearchMode(true)}
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Center: list name */}
      <span className="flex-1 text-center font-semibold text-[17px] text-gray-900 truncate">
        🕯️ List
      </span>

      {/* RTL end (left side): share and back */}
      <button
        onClick={() => setShowInviteSheet(true)}
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
      <button onClick={() => navigate('/lists')} className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </header>
  )
)}
```

Add the InviteSheet before the closing `</div>`:
```tsx
{showInviteSheet && listId && (
  <InviteSheet
    listId={listId}
    listName="List"
    listIcon="🕯️"
    onClose={() => setShowInviteSheet(false)}
  />
)}
```

- [ ] **Step 2: Update App.tsx with join route**

Replace `src/App.tsx` with:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useGroup } from './hooks/useGroup';
import { LoginScreen } from './screens/LoginScreen';
import { ListsScreen } from './screens/ListsScreen';
import { ListDetailScreen } from './screens/ListDetailScreen';
import { JoinScreen } from './screens/JoinScreen';

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

  return (
    <Routes>
      {/* Public route — invite join page */}
      <Route path="/join/:token" element={<JoinScreen />} />

      {!user ? (
        <>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          <Route path="/lists" element={<ListsScreen />} />
          <Route path="/lists/:listId" element={<ListDetailScreen />} />
          <Route path="*" element={<Navigate to="/lists" replace />} />
        </>
      )}
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

Run: `npm run build`

- [ ] **Step 4: Commit and push**

```bash
git add src/screens/ListDetailScreen.tsx src/App.tsx
git commit -m "feat: redesign header with icon layout, expandable search, share button, and join route"
git push
```

---

## Verification

After all tasks, test:

1. **Header**: Icons only — +, search, title centered, share, back. Correct RTL order.
2. **Search**: Tap 🔍 → full-width input replaces header. Cancel returns.
3. **Share**: Tap ↗ → invite sheet slides up with QR code, link, copy button, WhatsApp/iMessage/More
4. **Copy link**: Tap "העתק" → link copied to clipboard
5. **Share actions**: WhatsApp/iMessage open native apps. More uses Web Share API.
6. **Join page**: Open `/join/{token}` → shows list info, two auth options
7. **Email join**: Enter email → magic link sent → after auth, redirected to shared list
8. **Guest join**: Enter name → anonymous session created → redirected to shared list
9. **Expired invite**: Expired token shows error page

**Manual step required:** Run `002_list_invites.sql` in Supabase SQL Editor before testing.
