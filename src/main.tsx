import { StrictMode, useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nContext, locales, getTranslation } from './i18n';
import type { Locale } from './i18n';
import './index.css';

// Prevent iOS Safari from scrolling/bouncing the page horizontally
function preventHorizontalScroll() {
  let startX = 0;
  let startY = 0;
  let isHorizontal: boolean | null = null;

  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isHorizontal = null;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (isHorizontal === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontal = Math.abs(dx) > Math.abs(dy);
    }

    // Block horizontal scrolling at the document level
    if (isHorizontal) {
      e.preventDefault();
    }
  }, { passive: false });
}

preventHorizontalScroll();

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
