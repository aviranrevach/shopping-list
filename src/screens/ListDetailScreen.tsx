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
