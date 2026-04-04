import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { removeListMember } from '../data/invites';
import { Avatar } from './Avatar';
import { InviteSheet } from './InviteSheet';
import type { ListMember } from '../types/database';

interface MembersSheetProps {
  listId: string;
  listName: string;
  listIcon: string;
  members: ListMember[];
  onClose: () => void;
  onMembersChange: (members: ListMember[]) => void;
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
  return `לפני ${Math.floor(diff / 86400)} ימים`;
}

export function MembersSheet({
  listId,
  listName,
  listIcon,
  members,
  onClose,
  onMembersChange,
}: MembersSheetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const ownerMember = members.find((m) => m.role === 'owner') ?? null;
  const isOwner = ownerMember?.user_id === user?.id;

  function handleXTap(memberId: string) {
    setRemoveError(null);
    setExpandedMemberId((prev) => (prev === memberId ? null : memberId));
  }

  async function handleConfirmRemove(member: ListMember) {
    setRemovingId(member.id);
    setRemoveError(null);
    try {
      await removeListMember(listId, member.id);
      const updated = members.filter((m) => m.id !== member.id);
      onMembersChange(updated);
      setExpandedMemberId(null);
      if (member.user_id === user?.id) {
        onClose();
        navigate('/lists');
      }
    } catch (err) {
      console.error(err);
      setRemoveError('אירעה שגיאה. נסה שוב.');
    } finally {
      setRemovingId(null);
    }
  }

  function showXButton(member: ListMember): boolean {
    if (member.role === 'owner') return false;
    if (isOwner) return true;
    return member.user_id === user?.id;
  }

  return createPortal(
    <>
      {/* Full-screen backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />

      {/* Sheet — slides in from right */}
      <div
        className="fixed inset-0 z-[61] bg-white flex flex-col"
        style={{ animation: 'sheet-slide-in 0.28s cubic-bezier(0.16,1,0.3,1) forwards' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0"
          style={{ background: '#fafaf8' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-semibold text-blue-500 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            הגדרות
          </button>
          <span className="text-[15px] font-bold text-gray-900">שותפים</span>
          {isOwner ? (
            <button
              type="button"
              onClick={() => setShowInviteSheet(true)}
              className="text-[13px] font-semibold text-blue-500"
            >
              + הוסף
            </button>
          ) : (
            <div className="w-12" />
          )}
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto">
          <p
            className="text-[9px] font-bold uppercase tracking-wider px-4 pt-3 pb-1"
            style={{ color: '#c0c0bc' }}
          >
            חברים ברשימה
          </p>

          {members.map((member) => {
            const isCurrentUser = member.user_id === user?.id;
            const isExpanded = expandedMemberId === member.id;
            const isRemoving = removingId === member.id;

            return (
              <div key={member.id}>
                {/* Member row */}
                <div
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50"
                  style={{
                    background: isExpanded
                      ? '#fff5f5'
                      : isCurrentUser && member.role !== 'owner'
                      ? '#f0f7ff'
                      : 'white',
                  }}
                >
                  <Avatar name={member.display_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-gray-900 truncate">
                        {member.display_name}
                      </span>
                      {isCurrentUser && member.role !== 'owner' && (
                        <span className="text-[10px] font-semibold text-blue-400">(את/ה)</span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {member.role === 'owner'
                        ? 'בעלים'
                        : isCurrentUser
                        ? `הצטרפת ${relativeTime(member.joined_at)}`
                        : `הצטרף ${relativeTime(member.joined_at)}`}
                    </span>
                  </div>
                  {member.role === 'owner' ? (
                    <span className="text-[11px]">👑</span>
                  ) : showXButton(member) ? (
                    <button
                      type="button"
                      onClick={() => handleXTap(member.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: isExpanded ? '#ef4444' : '#fee2e2' }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none"
                        stroke={isExpanded ? 'white' : '#ef4444'} strokeWidth={2.5}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  ) : null}
                </div>

                {/* Confirm panel — expands below this row */}
                {isExpanded && (
                  <div
                    className="px-4 pb-3 pt-2.5 border-b border-red-200"
                    style={{ background: '#fff5f5' }}
                  >
                    {isCurrentUser ? (
                      <p
                        className="text-[11px] font-semibold text-center mb-2.5"
                        style={{ color: '#7f1d1d' }}
                      >
                        לעזוב את הרשימה?
                        <br />
                        לא תוכל/י לראות אותה יותר
                      </p>
                    ) : (
                      <p
                        className="text-[11px] font-semibold text-center mb-2.5"
                        style={{ color: '#7f1d1d' }}
                      >
                        {`להסיר את ${member.display_name} מהרשימה?`}
                      </p>
                    )}
                    {removeError && (
                      <p className="text-[10px] text-red-600 text-center mb-2">{removeError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setRemoveError(null); setExpandedMemberId(null); }}
                        className="flex-1 py-2 rounded-[9px] text-[12px] font-semibold text-gray-600"
                        style={{ background: '#f0f0ea' }}
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmRemove(member)}
                        disabled={isRemoving}
                        className="flex-1 py-2 rounded-[9px] text-[12px] font-semibold text-white"
                        style={{ background: '#ef4444', opacity: isRemoving ? 0.6 : 1 }}
                      >
                        {isCurrentUser ? 'עזוב' : 'הסר'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* הוסף חברים row */}
          <button
            type="button"
            onClick={() => setShowInviteSheet(true)}
            className="w-full flex items-center gap-3 px-4 py-3 mt-1"
            style={{ background: '#f4f4f0' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ border: '2px dashed #d1d5db', background: 'white' }}
            >
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-[12px] font-semibold text-gray-600">הוסף חברים</div>
              <div className="text-[10px] text-gray-400">שתף קישור / QR</div>
            </div>
          </button>
        </div>
      </div>

      {/* InviteSheet stacked on top */}
      {showInviteSheet && (
        <InviteSheet
          listId={listId}
          listName={listName}
          listIcon={listIcon}
          onClose={() => setShowInviteSheet(false)}
        />
      )}
    </>,
    document.body,
  );
}
