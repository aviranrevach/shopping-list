import { StrictMode, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nContext, locales, getTranslation } from './i18n';
import type { Locale } from './i18n';
import './index.css';

function Root() {
  const [locale, setLocale] = useState<Locale>('he');

  const i18n = useMemo(() => ({
    locale,
    setLocale: (newLocale: Locale) => {
      setLocale(newLocale);
      document.documentElement.lang = newLocale;
      document.documentElement.dir = newLocale === 'he' ? 'rtl' : 'ltr';
    },
    t: (key: string, params?: Record<string, string | number>) =>
      getTranslation(locales[locale], key, params),
    dir: (locale === 'he' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  }), [locale]);

  return (
    <StrictMode>
      <I18nContext.Provider value={i18n}>
        <App />
      </I18nContext.Provider>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
