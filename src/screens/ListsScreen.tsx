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
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden safe-area-top">
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
                  <div className="text-sm text-gray-400 mt-0.5">
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
