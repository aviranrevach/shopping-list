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

    const { error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) {
      console.error('Anonymous sign-in error:', anonError);
      setSubmitting(false);
      return;
    }

    const result = await acceptInvite(token, guestName.trim());
    navigate(`/lists/${result.list_id}`);
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary-light)', borderTopColor: 'transparent' }} />
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
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3" style={{ background: 'var(--color-primary-bg50)' }}>🛒</div>
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
              className="w-full border rounded-2xl p-4 flex items-center gap-3 mb-3 text-start"
              style={{ background: 'var(--color-primary-bg50)', borderColor: 'var(--color-primary-light)' }}
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
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base outline-none"
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-light)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                dir="ltr"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-3 text-white font-semibold rounded-xl px-4 py-3 text-base disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}
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
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base outline-none text-center"
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-light)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-3 text-white font-semibold rounded-xl px-4 py-3 text-base disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
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
