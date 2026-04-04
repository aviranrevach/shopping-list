import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { useRealtimeItems } from '../hooks/useRealtimeItems';
import { useTheme } from '../theme/ThemeContext';
import { toggleItemChecked, deleteItem, createItem } from '../data/items';
import { updateList, fetchListById, deleteList as deleteListApi } from '../data/lists';
import type { List } from '../types';
import { CategoryGroup } from '../components/CategoryGroup';
import { AddZone } from '../components/AddZone';
import { ItemDetailSheet } from '../components/ItemDetailSheet';
import { InviteSheet } from '../components/InviteSheet';
import { EmojiPicker } from '../components/EmojiPicker';
import { CATEGORIES } from '../types';
import { parseAppleNotes, parsePlainList } from '../lib/importParser';
import { getListMembers } from '../data/invites';
import type { ListMember } from '../types/database';
import { Avatar } from '../components/Avatar';

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
  return `לפני ${Math.floor(diff / 86400)} ימים`;
}

export function ListDetailScreen() {
  const { t } = useI18n();
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const { group } = useGroup(user?.id);
  const { items, loading, optimisticToggle, optimisticDelete, optimisticAdd } = useRealtimeItems(listId);
  const { scheme } = useTheme();
  const navigate = useNavigate();
  const [list, setList] = useState<List | null>(null);
  const [search, setSearch] = useState('');
  const [isAddMode, setIsAddMode] = useState(false);
  const [addTargetCategory, setAddTargetCategory] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editIconValue, setEditIconValue] = useState('');
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [importText, setImportText] = useState('');
  const [importAppleNotes, setImportAppleNotes] = useState(true);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [transitioningIds, setTransitioningIds] = useState<Set<string>>(new Set());
  const [recentlyTransitionedIds, setRecentlyTransitionedIds] = useState<Set<string>>(new Set());
  const transitionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [hideChecked, setHideChecked] = useState(() => localStorage.getItem('hideChecked') === 'true');
  const [viewAll, setViewAll] = useState(() => localStorage.getItem('viewAll') === 'true');
  const [sortMode, setSortMode] = useState<'added' | 'alpha'>(() =>
    (localStorage.getItem('sortMode') as 'added' | 'alpha') ?? 'added'
  );
  const [listMembers, setListMembers] = useState<ListMember[]>([]);

  const toggleSortMode = useCallback((mode: 'added' | 'alpha') => {
    setSortMode(mode);
    localStorage.setItem('sortMode', mode);
  }, []);

  // Fetch list metadata
  useEffect(() => {
    if (!listId) return;
    fetchListById(listId).then(setList).catch(console.error);
  }, [listId]);

  useEffect(() => {
    if (!showMenu || !listId) return;
    getListMembers(listId).then(setListMembers).catch(console.error);
  }, [showMenu, listId]);

  const listName = list?.name ?? 'List';
  const listIcon = list?.icon ?? '📋';

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
    const sourceItems = viewAll ? filteredItems : unchecked;
    const sort = (arr: typeof unchecked) =>
      sortMode === 'alpha'
        ? [...arr].sort((a, b) => a.name.localeCompare(b.name, 'he'))
        : arr;
    for (const cat of CATEGORIES) {
      const catItems = sourceItems.filter((i) => i.category === cat);
      if (catItems.length > 0) groups.set(cat, sort(catItems));
    }
    // Also include custom categories
    const knownCats = new Set(CATEGORIES as readonly string[]);
    const customCats = new Set(sourceItems.map(i => i.category).filter(c => !knownCats.has(c)));
    for (const cat of customCats) {
      const catItems = sourceItems.filter((i) => i.category === cat);
      if (catItems.length > 0) groups.set(cat, sort(catItems));
    }
    return groups;
  }, [unchecked, filteredItems, viewAll, sortMode]);

  const handleToggleCheck = useCallback((itemId: string) => {
    if (!user) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const newChecked = !item.checked;

    // 1. Optimistic update
    optimisticToggle(itemId, newChecked, newChecked ? user.id : null);

    // 2. In "view all" mode, skip the transition animation — item stays in place
    if (!viewAll) {
      // Mark as transitioning (keeps item in current section during animation)
      setTransitioningIds((prev) => new Set(prev).add(itemId));

      // Cancel previous timer for this item
      const existing = transitionTimers.current.get(itemId);
      if (existing) clearTimeout(existing);

      // Remove from transitioning after animation, mark as recently transitioned for entrance
      const timer = setTimeout(() => {
        setTransitioningIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        setRecentlyTransitionedIds((prev) => new Set(prev).add(itemId));
        setTimeout(() => {
          setRecentlyTransitionedIds((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        }, 500);
        transitionTimers.current.delete(itemId);
      }, newChecked ? 950 : 750);
      transitionTimers.current.set(itemId, timer);
    }

    // 3. Fire-and-forget to Supabase
    toggleItemChecked(itemId, newChecked, user.id).catch((err) => {
      console.error('Toggle failed, reverting', err);
      optimisticToggle(itemId, !newChecked, !newChecked ? user.id : null);
    });
  }, [user, items, optimisticToggle, viewAll]);

  const handleDelete = useCallback((itemId: string) => {
    optimisticDelete(itemId);
    deleteItem(itemId).catch((err) => {
      console.error('Delete failed', err);
    });
  }, [optimisticDelete]);

  function handleOpenDetail(itemId: string) {
    setDetailItemId(itemId);
  }

  function handleAddDone(_newItems: { id: string; name: string; category: string }[]) {
    setIsAddMode(false);
    setAddTargetCategory(null);
  }

  const handleAddToCategory = useCallback((category: string) => {
    setAddTargetCategory(category);
    setIsAddMode(true);
    setTimeout(() => {
      const input = document.querySelector('[data-add-input]') as HTMLInputElement;
      input?.focus();
    }, 50);
  }, []);

  const existingItemNames = useMemo(() => items.map((i) => i.name), [items]);

  const ownerMember = useMemo(
    () => listMembers.find((m) => m.role === 'owner') ?? null,
    [listMembers]
  );
  const nonOwnerMembers = useMemo(
    () => listMembers.filter((m) => m.role !== 'owner'),
    [listMembers]
  );

  const lastUpdatedInfo = useMemo(() => {
    if (!items.length || !listMembers.length) return null;
    const latest = items.reduce((a, b) =>
      new Date(a.updated_at) > new Date(b.updated_at) ? a : b
    );
    const userId = latest.checked ? (latest.checked_by ?? latest.added_by) : latest.added_by;
    const member = listMembers.find((m) => m.user_id === userId);
    if (!member) return null;
    return { name: member.display_name, time: relativeTime(latest.updated_at) };
  }, [items, listMembers]);

  return (
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden safe-area-top">
      {/* Top bar */}
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
              className="font-semibold text-sm whitespace-nowrap"
              style={{ color: scheme.primaryDark }}
            >
              {t('invite.search_cancel')}
            </button>
          </header>
        ) : (
          <header className="px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
            {/* RTL start (right side): search */}
            <button
              onClick={() => setIsSearchMode(true)}
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 44, height: 44, color: '#bbb' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* Center: title + three-dot aligned together */}
            <div className="flex-1 flex items-center justify-center gap-1">
              <button onClick={() => setShowMenu(true)} className="font-bold text-[20px] text-gray-900 truncate">
                {listName}
              </button>
              <button
                onClick={() => setShowMenu(true)}
                className="flex items-center justify-center flex-shrink-0"
                style={{ color: '#bbb' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </button>
            </div>

            {/* RTL end (left side): back arrow */}
            <button
              onClick={() => navigate('/lists')}
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 44, height: 44, color: '#bbb' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M15 19l-7-7 7-7" /><line x1="8" y1="12" x2="20" y2="12" />
              </svg>
            </button>
          </header>
        )
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {/* Add zone overlay at top */}
        <div
          className="overflow-hidden"
          style={{
            maxHeight: isAddMode ? '600px' : '0',
            opacity: isAddMode ? 1 : 0,
            transition: 'max-height 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.25s ease',
          }}
        >
          {isAddMode && listId && user && group && (
            <AddZone
              listId={listId}
              userId={user.id}
              groupId={group.id}
              existingItemNames={existingItemNames}
              onDone={handleAddDone}
              onItemAdded={optimisticAdd}
              defaultCategory={addTargetCategory}
            />
          )}
        </div>

        {/* Always-visible notebook-line add input */}
        {!isAddMode && (
          <div
            className="cursor-text px-4 pt-4 pb-2"
            onClick={() => {
              setAddTargetCategory(null);
              setIsAddMode(true);
              setTimeout(() => {
                const input = document.querySelector('[data-add-input]') as HTMLInputElement;
                input?.focus();
              }, 50);
            }}
          >
            <div
              className="flex items-center justify-start gap-1.5"
              style={{ paddingTop: 14, paddingBottom: 14, borderBottom: '1.5px dashed #d1d5db' }}
            >
              <span className="text-gray-300 text-[17px]">{t('list_detail.add_new_item').replace('+ ', '')}</span>
              <span className="text-gray-300 text-[17px]">+</span>
            </div>
            <div style={{ borderBottom: '1.5px dashed #e5e7eb', paddingTop: 20 }} />
          </div>
        )}

        <div className="p-4" onClick={() => { if (isAddMode) { setIsAddMode(false); } }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: scheme.primaryLight, borderTopColor: 'transparent' }} />
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
                  recentlyTransitionedIds={recentlyTransitionedIds}
                  skipExitAnimation={viewAll}
                  onHeaderClick={() => toggleSortMode(sortMode === 'added' ? 'alpha' : 'added')}
                  onAddToCategory={handleAddToCategory}
                />
              ))}
              {!viewAll && checked.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      const next = !hideChecked;
                      setHideChecked(next);
                      localStorage.setItem('hideChecked', String(next));
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-400"
                  >
                    <svg className={`w-4 h-4 transition-transform ${hideChecked ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span>✓ {t('lists.checked_count', { count: checked.length })}</span>
                  </button>
                  {!hideChecked && (
                    <CategoryGroup
                      category="checked_section"
                      items={checked}
                      onToggleCheck={handleToggleCheck}
                      onDelete={handleDelete}
                      onOpenDetail={handleOpenDetail}
                      transitioningIds={transitioningIds}
                      recentlyTransitionedIds={recentlyTransitionedIds}
                    />
                  )}
                </>
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

      {/* Item detail sheet */}
      {detailItemId && (
        <ItemDetailSheet
          itemId={detailItemId}
          onClose={() => setDetailItemId(null)}
          onDelete={() => { optimisticDelete(detailItemId); setDetailItemId(null); }}
        />
      )}

      {showInviteSheet && listId && (
        <InviteSheet
          listId={listId}
          listName={listName}
          listIcon={listIcon}
          onClose={() => setShowInviteSheet(false)}
        />
      )}

      {/* Three-dot menu — modal below top bar */}
      {showMenu && (
  <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 z-50 bg-black/30"
      style={{ animation: 'overlay-fade-in 0.25s ease-out forwards' }}
      onClick={() => setShowMenu(false)}
    />

    {/* Modal */}
    <div
      className="fixed z-[51] bg-white rounded-2xl shadow-2xl"
      style={{
        top: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '480px',
        animation: 'menu-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        transformOrigin: 'top center',
      }}
    >
      {/* ── Top strip: owner + last updated ── */}
      <div
        className="flex items-start gap-3 px-4 py-3 border-b border-gray-100"
        style={{ background: '#fafaf8', borderRadius: '16px 16px 0 0' }}
      >
        {ownerMember ? (
          <Avatar name={ownerMember.display_name} size="lg" />
        ) : (
          <div className="w-[42px] h-[42px] rounded-full bg-gray-200 flex-shrink-0" />
        )}
        <div className="flex flex-col gap-0.5 pt-0.5">
          <span className="text-[13px] font-bold text-gray-900">
            {ownerMember?.display_name ?? ''}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider"
            style={{ color: '#c0c0bc' }}
          >
            עודכן לאחרונה
          </span>
          {lastUpdatedInfo && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Avatar name={lastUpdatedInfo.name} size="sm" />
              <span className="text-[10px]" style={{ color: '#aaa' }}>
                {lastUpdatedInfo.name} · {lastUpdatedInfo.time}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-4 flex flex-col gap-3">

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
              <div
                className="w-[46px] h-[46px] rounded-full flex items-center justify-center"
                style={{ border: '2px dashed #d1d5db', background: '#fafaf8' }}
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="text-[10px]" style={{ color: '#b0b0b0' }}>הוסף</span>
            </button>
            {/* Member avatars */}
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
        </div>

        <div className="h-px bg-gray-100" />

        {/* תצוגה */}
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: '#c0c0bc' }}
          >
            תצוגה
          </p>
          <div className="flex bg-gray-100 rounded-[13px] p-1 gap-1">
            <button
              type="button"
              onClick={() => { setViewAll(false); localStorage.setItem('viewAll', 'false'); }}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[9px] transition-all"
              style={!viewAll ? { background: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.10)', color: '#1a1a1a' } : { color: '#999' }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>🛒</span>
              <span className="text-[11px] font-semibold whitespace-nowrap">פריטים לקנות</span>
            </button>
            <button
              type="button"
              onClick={() => { setViewAll(true); localStorage.setItem('viewAll', 'true'); }}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[9px] transition-all"
              style={viewAll ? { background: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.10)', color: '#1a1a1a' } : { color: '#999' }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>📋</span>
              <span className="text-[11px] font-semibold whitespace-nowrap">כל הפריטים יחד</span>
            </button>
          </div>
        </div>

        {/* מיון */}
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: '#c0c0bc' }}
          >
            מיון
          </p>
          <div className="flex bg-gray-100 rounded-[13px] p-1 gap-1">
            <button
              type="button"
              onClick={() => toggleSortMode('added')}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[9px] transition-all"
              style={sortMode === 'added' ? { background: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.10)', color: '#1a1a1a' } : { color: '#999' }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>🕐</span>
              <span className="text-[11px] font-semibold whitespace-nowrap">לפי סדר הוספה</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSortMode('alpha')}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[9px] transition-all"
              style={sortMode === 'alpha' ? { background: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.10)', color: '#1a1a1a' } : { color: '#999' }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>🔤</span>
              <span className="text-[11px] font-semibold whitespace-nowrap">לפי סדר אלפבית</span>
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Action circles */}
        <div className="flex justify-around py-1">
          {/* שנה שם */}
          <button
            type="button"
            onClick={() => { setShowMenu(false); setEditNameValue(listName); setEditIconValue(listIcon); setShowEditName(true); }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="w-[52px] h-[52px] rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-[22px] h-[22px] text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <span className="text-[10px] font-medium text-gray-500 text-center" style={{ maxWidth: 54 }}>שנה שם</span>
          </button>

          {/* ייבא רשימה */}
          <button
            type="button"
            onClick={() => { setShowMenu(false); setImportText(''); setShowImport(true); }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="w-[52px] h-[52px] rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-[22px] h-[22px] text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <span className="text-[10px] font-medium text-gray-500 text-center" style={{ maxWidth: 54 }}>ייבא רשימה</span>
          </button>

          {/* הסר כפילויות */}
          <button
            type="button"
            onClick={async () => {
              if (!listId || !user) return;
              const seen = new Map<string, string>();
              const dupeIds: string[] = [];
              for (const item of items) {
                const key = item.name.trim().toLowerCase();
                if (seen.has(key)) { dupeIds.push(item.id); } else { seen.set(key, item.id); }
              }
              if (dupeIds.length === 0) { alert('אין כפילויות'); return; }
              if (window.confirm(`נמצאו ${dupeIds.length} כפילויות. למחוק?`)) {
                for (const id of dupeIds) { optimisticDelete(id); deleteItem(id).catch(console.error); }
                setShowMenu(false);
              }
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="w-[52px] h-[52px] rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-[22px] h-[22px] text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </div>
            <span className="text-[10px] font-medium text-gray-500 text-center" style={{ maxWidth: 54 }}>הסר כפילויות</span>
          </button>

          {/* מחק רשימה */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('למחוק את הרשימה? הפעולה לא ניתנת לביטול.')) {
                setShowMenu(false);
                if (listId) { deleteListApi(listId).then(() => navigate('/lists')); }
              }
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center" style={{ background: '#fff0f0' }}>
              <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={1.8}>
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <span className="text-[10px] font-medium text-center" style={{ color: '#ef4444', maxWidth: 54 }}>מחק רשימה</span>
          </button>
        </div>

      </div>

      {/* Close */}
      <button
        type="button"
        onClick={() => setShowMenu(false)}
        className="w-full py-3 rounded-b-2xl text-[15px] font-semibold text-gray-400 bg-gray-50"
        style={{ borderTop: '1px solid #f0f0ea' }}
      >
        סגור
      </button>
    </div>
  </>
)}

      {/* Edit list name + emoji modal */}
      {showEditName && listId && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowEditName(false)} />
          <div className="fixed top-1/3 left-4 right-4 z-[51] bg-white rounded-2xl shadow-2xl p-5">
            <h3 className="text-[17px] font-semibold text-center mb-4">שנה שם רשימה</h3>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                className={`w-[52px] h-[52px] bg-gray-50 border-2 rounded-2xl text-3xl flex items-center justify-center flex-shrink-0 ${showEditEmojiPicker ? '' : 'border-gray-200'}`}
                style={showEditEmojiPicker ? { borderColor: scheme.primaryLight } : undefined}
              >
                {editIconValue}
              </button>
              <input
                autoFocus
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editNameValue.trim()) {
                    updateList(listId, { name: editNameValue.trim(), icon: editIconValue }).then((updated) => setList(updated));
                    setShowEditName(false);
                  }
                }}
                placeholder="שם חדש"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none"
                style={{ '--tw-ring-color': scheme.primaryLight } as React.CSSProperties}
                onFocus={(e) => e.currentTarget.style.borderColor = scheme.primaryLight}
                onBlur={(e) => e.currentTarget.style.borderColor = ''}
              />
            </div>
            {showEditEmojiPicker && (
              <div className="mb-3">
                <EmojiPicker
                  value={editIconValue}
                  onChange={(emoji) => { setEditIconValue(emoji); setShowEditEmojiPicker(false); }}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setShowEditName(false); setShowEditEmojiPicker(false); }} className="flex-1 py-3 rounded-xl text-[15px] text-gray-400">
                ביטול
              </button>
              <button
                onClick={() => {
                  if (editNameValue.trim() && listId) {
                    updateList(listId, { name: editNameValue.trim(), icon: editIconValue }).then((updated) => setList(updated));
                    setShowEditName(false);
                    setShowEditEmojiPicker(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white"
                style={{ background: scheme.primary }}
              >
                שמור
              </button>
            </div>
          </div>
        </>
      )}

      {/* Import list modal */}
      {showImport && listId && user && (() => {
        const parsed = importAppleNotes ? parseAppleNotes(importText) : parsePlainList(importText);
        const itemCount = parsed.length;
        const categoryCount = new Set(parsed.map(i => i.category).filter(c => c !== 'other')).size;

        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowImport(false)} />
            <div className="fixed top-[10%] left-4 right-4 z-[51] bg-white rounded-2xl shadow-2xl p-5 max-h-[80vh] overflow-y-auto">
              <h3 className="text-[17px] font-semibold text-center mb-2">ייבוא רשימה</h3>
              <p className="text-sm text-gray-400 text-center mb-4">הדבק רשימה מ-Apple Notes או טקסט רגיל</p>

              {/* Apple Notes toggle */}
              <button
                onClick={() => setImportAppleNotes(!importAppleNotes)}
                className="w-full flex items-center gap-3 mb-4 px-3 py-2.5 rounded-xl bg-gray-50 active:bg-gray-100"
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${importAppleNotes ? '' : 'border-2 border-gray-300'}`}
                  style={importAppleNotes ? { background: scheme.primary } : undefined}>
                  {importAppleNotes && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </div>
                <div className="flex-1 text-start">
                  <div className="text-[15px] font-medium text-gray-700">זיהוי Apple Notes</div>
                  <div className="text-xs text-gray-400">מסיר סימנים, מזהה קטגוריות וכמויות</div>
                </div>
              </button>

              <textarea
                autoFocus
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={importAppleNotes
                  ? "- [x] 2 חלב\n- [ ] עגבניות\n\nנקיון\n- [ ] סבון"
                  : "עגבניות\nמלפפונים\nחלב"}
                rows={8}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] outline-none resize-none font-mono leading-relaxed"
                onFocus={(e) => e.currentTarget.style.borderColor = scheme.primaryLight}
                onBlur={(e) => e.currentTarget.style.borderColor = ''}
                dir="auto"
              />

              {/* Preview */}
              {itemCount > 0 && (
                <div className="mt-3 text-sm text-gray-400 text-center">
                  {itemCount} פריטים
                  {importAppleNotes && categoryCount > 0 && ` · ${categoryCount} קטגוריות`}
                  {importAppleNotes && (() => {
                    const checkedCount = parsed.filter(i => i.checked).length;
                    return checkedCount > 0 ? ` · ${checkedCount} סומנו` : '';
                  })()}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowImport(false)} className="flex-1 py-3 rounded-xl text-[15px] text-gray-400">
                  ביטול
                </button>
                <button
                  onClick={async () => {
                    if (parsed.length === 0 || !listId || !user) return;
                    for (const p of parsed) {
                      const item = await createItem(listId, user.id, p.name, p.category, p.quantity);
                      if (p.checked) {
                        await toggleItemChecked(item.id, true, user.id);
                      }
                      optimisticAdd({ ...item, checked: p.checked, quantity: p.quantity, category: p.category });
                    }
                    setShowImport(false);
                    setImportText('');
                  }}
                  disabled={itemCount === 0}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white disabled:opacity-40"
                  style={{ background: scheme.primary }}
                >
                  ייבא {itemCount} פריטים
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
