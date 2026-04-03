import { useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';

export function LoginScreen() {
  const { t } = useI18n();
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendMagicLink(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('login.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('login.subtitle')}</p>
        </div>

        {sent ? (
          <div className="text-center bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-800 font-medium">{t('login.link_sent')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm text-gray-500 mb-1.5">{t('login.email_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.email_placeholder')}
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
              dir="ltr"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-4 py-3 text-base transition disabled:opacity-50"
            >
              {loading ? '...' : t('login.send_link')}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">{t('login.link_hint')}</p>
          </form>
        )}
      </div>
    </div>
  );
}
