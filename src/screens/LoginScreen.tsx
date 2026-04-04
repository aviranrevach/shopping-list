import { useState, useRef } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';

export function LoginScreen() {
  const { t } = useI18n();
  const { sendMagicLink, verifyOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendMagicLink(email);
      setSent(true);
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await verifyOtp(email, code);
      // auth state change handled by useAuth subscription
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
      setLoading(false);
    }
  }

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    if (val.length === 6) setError('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-primary-bg50)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--color-primary-dark)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('login.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('login.subtitle')}</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm text-gray-500 mb-1.5">{t('login.email_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.email_placeholder')}
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base outline-none transition"
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-light)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              dir="ltr"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 text-white font-semibold rounded-xl px-4 py-3 text-base transition disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {loading ? '...' : t('login.send_link')}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">{t('login.link_hint')}</p>
          </form>
        ) : (
          <form onSubmit={handleVerify} dir="rtl">
            <p className="text-center text-sm text-gray-500 mb-6">
              {t('login.code_sent_to')} <span className="font-medium text-gray-800" dir="ltr">{email}</span>
            </p>

            <label className="block text-sm text-gray-500 mb-1.5">{t('login.code_label')}</label>
            <input
              ref={codeInputRef}
              type="tel"
              inputMode="numeric"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-3xl font-bold tracking-[0.4em] outline-none transition text-center"
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-light)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              dir="ltr"
              autoComplete="one-time-code"
            />

            {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full mt-4 text-white font-semibold rounded-xl px-4 py-3 text-base transition disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {loading ? '...' : t('login.verify_code')}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">{t('login.code_hint')}</p>

            <button
              type="button"
              onClick={() => { setSent(false); setCode(''); setError(''); }}
              className="w-full mt-2 py-2 text-sm text-gray-400"
            >
              {t('login.change_email')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
