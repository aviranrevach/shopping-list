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
import { InviteSheet } from '../components/InviteSheet';
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
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [transitioningIds, setTransitioningIds] = useState<Set<string>>(new Set());
  const [recentlyTransitionedIds, setRecentlyTransitionedIds] = useState<Set<string>>(new Set());
  const transitionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [hideChecked, setHideChecked] = useState(() => localStorage.getItem('hideChecked') === 'true');

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

    // 3. Remove from transitioning after animation, mark as recently transitioned for entrance
    const timer = setTimeout(() => {
      setTransitioningIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      setRecentlyTransitionedIds((prev) => new Set(prev).add(itemId));
      // Clear recently transitioned after entrance animation completes
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

  function handleAddDone(_newItems: { id: string; name: string; category: string }[]) {
    setIsAddMode(false);
  }

  const existingItemNames = useMemo(() => items.map((i) => i.name), [items]);

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
            />
          )}
        </div>

        <div className="p-4" onClick={() => { if (isAddMode) { setIsAddMode(false); } }}>
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
                  recentlyTransitionedIds={recentlyTransitionedIds}
                />
              ))}
              {checked.length > 0 && (
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

      {!isAddMode && <BottomNav />}

      {/* Item detail sheet */}
      {detailItemId && (
        <ItemDetailSheet itemId={detailItemId} onClose={() => setDetailItemId(null)} />
      )}

      {showInviteSheet && listId && (
        <InviteSheet
          listId={listId}
          listName="List"
          listIcon="🕯️"
          onClose={() => setShowInviteSheet(false)}
        />
      )}
    </div>
  );
}
