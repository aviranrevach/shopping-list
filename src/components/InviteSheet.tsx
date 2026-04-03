import { useState, useEffect } from 'react';
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
                className="text-white text-sm font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                style={{ background: 'var(--color-primary)' }}
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
