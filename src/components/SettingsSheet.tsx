import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme, COLOR_SCHEMES } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { updateMemberName } from '../data/groups';
import type { GroupMember } from '../types';

interface SettingsSheetProps {
  member: GroupMember | null;
  onClose: () => void;
  onMemberUpdated: () => void;
}

export function SettingsSheet({ member, onClose, onMemberUpdated }: SettingsSheetProps) {
  const { scheme, setScheme } = useTheme();
  const { signOut, user } = useAuth();
  const [name, setName] = useState(member?.display_name ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Animate in
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsOpen(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function handleClose() {
    setIsOpen(false);
    setTimeout(onClose, 300);
  }

  async function handleSaveName() {
    if (!member || !name.trim() || name.trim() === member.display_name) return;
    setSaving(true);
    await updateMemberName(member.id, name.trim());
    onMemberUpdated();
    setSaving(false);
  }

  async function handleLogout() {
    await signOut();
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-colors duration-300 ${isOpen ? 'bg-black/40' : 'bg-black/0'}`}
        onClick={handleClose}
      />

      {/* Sheet — slides up from bottom */}
      <div
        className="fixed inset-x-0 bottom-0 z-[51] bg-white rounded-t-3xl"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          maxHeight: '85vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        }}
        dir="rtl"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-6 space-y-6">
          {/* Title */}
          <h2 className="text-lg font-bold text-gray-900 text-center">הגדרות</h2>

          {/* Email */}
          {user?.email && (
            <div className="text-center -mt-2">
              <span className="text-[12px] text-gray-400">{user.email}</span>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">השם שלך</label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none text-gray-900"
                style={{ borderColor: name !== (member?.display_name ?? '') ? scheme.primary : undefined }}
              />
              {name.trim() !== (member?.display_name ?? '') && (
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="px-4 py-3 rounded-xl text-white text-sm font-medium"
                  style={{ background: scheme.primary }}
                >
                  {saving ? '...' : 'שמור'}
                </button>
              )}
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">ערכת צבעים</label>
            <div className="grid grid-cols-3 gap-2.5">
              {COLOR_SCHEMES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setScheme(s)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all"
                  style={{
                    borderColor: s.key === scheme.key ? s.primary : '#f3f4f6',
                    background: s.key === scheme.key ? s.primaryBg50 : '#fff',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ background: s.primary }}
                  />
                  <span className="text-xs text-gray-600 font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full py-3 text-red-500 text-sm font-medium bg-red-50 rounded-xl"
          >
            התנתקות
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
