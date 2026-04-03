import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { useRealtimeLists } from '../hooks/useRealtimeLists';
import { useTheme } from '../theme/ThemeContext';
import { createList } from '../data/lists';
import { updateMemberName } from '../data/groups';
import { EmojiPicker } from '../components/EmojiPicker';
import { SettingsSheet } from '../components/SettingsSheet';

export function ListsScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { group, member, refreshMember } = useGroup(user?.id);
  const { lists, loading } = useRealtimeLists(group?.id);
  const { scheme } = useTheme();
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📋');
  const [showNewEmojiPicker, setShowNewEmojiPicker] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [editName, setEditName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const nameSaved = useRef(false); // prevent re-triggering after save

  const displayName = member?.display_name ?? user?.email?.split('@')[0] ?? '';

  // Prompt for name on first use (when display_name is still the default "User")
  useEffect(() => {
    if (member && member.display_name === 'User' && !nameSaved.current) {
      setShowNamePrompt(true);
      setEditName('');
    }
  }, [member]);
  const isSingleList = lists.length === 1;

  async function handleSaveName() {
    if (!member || !editName.trim()) return;
    nameSaved.current = true;   // block re-trigger before async work
    setShowNamePrompt(false);   // close immediately
    try {
      await updateMemberName(member.id, editName.trim());
      refreshMember();
    } catch {
      nameSaved.current = false; // allow retry if save failed
      setShowNamePrompt(true);
    }
  }

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

  function getProgressPercent(itemCount: number, checkedCount: number): number {
    if (itemCount === 0) return 0;
    return ((itemCount - checkedCount) / itemCount) * 100;
  }

  // Current user avatar initials
  const avatarInitial = (member?.display_name ?? user?.email ?? '?')[0].toUpperCase();

  return (
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden safe-area-top" dir="rtl">
      {/* Header row */}
      {/* Header uses LTR layout to keep + on right edge and settings away from left iOS swipe zone */}
      <header className="px-4 pt-4 pb-0 flex items-center justify-between flex-shrink-0 relative z-10" style={{ direction: 'ltr' }}>
        {/* LTR start (left side): Settings icon — kept away from absolute left edge by px-4 */}
        <button
          style={{ color: '#bbb', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0ea', borderRadius: 10, flexShrink: 0 }}
          onClick={() => setShowSettings(true)}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <line x1="4" y1="6" x2="20" y2="6" />
            <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
          </svg>
        </button>

        {/* LTR end (right side): + button */}
        <button
          onClick={() => setShowNew(true)}
          style={{
            width: 44,
            height: 44,
            background: '#f0f0ea',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#555" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </header>

      {/* Title area */}
      <div className="text-center flex-shrink-0" style={{ paddingTop: 28, paddingBottom: 32 }}>
        <p style={{ fontSize: 15, color: '#bbb', marginBottom: 4 }}>
          {t('lists.greeting', { name: displayName })}
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          {t('lists.title')}
        </h1>
      </div>

      {/* List cards */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: scheme.primaryLight, borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
            {lists.map((list) => {
              const remaining = list.item_count - list.checked_count;
              const progressPercent = getProgressPercent(list.item_count, list.checked_count);
              const isLarge = isSingleList;
              const emojiSize = isLarge ? 34 : 26;
              const nameSize = isLarge ? 22 : 18;
              const progressHeight = isLarge ? 4 : 3;
              const avatarSize = isLarge ? 24 : 20;

              return (
                <button
                  key={list.id}
                  onClick={() => navigate(`/lists/${list.id}`)}
                  className="w-full text-start active:scale-[0.99] transition-transform"
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: '14px 16px 12px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                  }}
                >
                  {/* Top row: emoji + name + avatars */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <span style={{ fontSize: emojiSize, lineHeight: 1 }}>{list.icon}</span>
                    <span
                      className="flex-1 font-semibold text-gray-900 truncate"
                      style={{ fontSize: nameSize }}
                    >
                      {list.name}
                    </span>
                    {/* Avatar stack */}
                    <div className="flex items-center" style={{ direction: 'ltr' }}>
                      <div
                        style={{
                          width: avatarSize,
                          height: avatarSize,
                          borderRadius: '50%',
                          background: scheme.primary,
                          color: '#fff',
                          fontSize: avatarSize * 0.45,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          border: '2px solid #fff',
                          flexShrink: 0,
                        }}
                      >
                        {avatarInitial}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      height: progressHeight,
                      background: '#f0f0ea',
                      borderRadius: 999,
                      marginBottom: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        background: scheme.primary,
                        borderRadius: 999,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Bottom row: remaining + time */}
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 12, color: '#aaa' }}>
                      {t('lists.remaining', { count: remaining })}
                    </span>
                    <span style={{ fontSize: 12, color: '#ccc' }}>
                      {formatActivity(list.last_activity)}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* New list form */}
            {showNew && (
              <div
                className="space-y-3"
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '14px 16px 12px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                  border: `1.5px solid ${scheme.primaryLight}`,
                }}
              >
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setShowNewEmojiPicker(!showNewEmojiPicker)}
                    className="w-10 h-10 bg-gray-100 rounded-lg text-2xl flex items-center justify-center flex-shrink-0"
                    style={showNewEmojiPicker ? { boxShadow: `0 0 0 2px ${scheme.primaryLight}` } : undefined}
                  >
                    {newIcon}
                  </button>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                    placeholder={t('lists.new_list')}
                    className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none border border-gray-200"
                    style={{ borderColor: newName ? scheme.primaryLight : undefined }}
                  />
                </div>
                {showNewEmojiPicker && (
                  <div className="mt-2">
                    <EmojiPicker
                      value={newIcon}
                      onChange={(emoji) => { setNewIcon(emoji); setShowNewEmojiPicker(false); }}
                    />
                  </div>
                )}
                <div className="flex gap-2 justify-start">
                  <button
                    onClick={() => { setShowNewEmojiPicker(false); handleCreateList(); }}
                    className="px-4 py-2 text-sm text-white rounded-lg font-medium"
                    style={{ background: scheme.primary }}
                  >
                    {t('lists.new_list')}
                  </button>
                  <button
                    onClick={() => { setShowNew(false); setNewName(''); setNewIcon('📋'); setShowNewEmojiPicker(false); }}
                    className="px-3 py-2 text-sm text-gray-400"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* First-use name prompt */}
      {showNamePrompt && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => { if (member?.display_name !== 'User') setShowNamePrompt(false); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" dir="rtl">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 text-center">
                איך קוראים לך?
              </h3>
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                placeholder="השם שלך"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none text-gray-900 text-center"
                style={{ borderColor: editName ? scheme.primary : undefined }}
              />
              <button
                onClick={handleSaveName}
                disabled={!editName.trim()}
                className="w-full py-3 text-white rounded-xl font-medium text-base disabled:opacity-40"
                style={{ background: scheme.primary }}
              >
                שמור
              </button>
            </div>
          </div>
        </>
      )}

      {/* Settings sheet */}
      {showSettings && (
        <SettingsSheet
          member={member}
          onClose={() => setShowSettings(false)}
          onMemberUpdated={refreshMember}
        />
      )}
    </div>
  );
}
