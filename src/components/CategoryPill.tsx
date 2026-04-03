import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import { CATEGORIES } from '../types';

interface CategoryPillProps {
  category: string;
  onChange: (category: string) => void;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export function CategoryPill({ category, onChange, expanded = false, onExpand, onCollapse }: CategoryPillProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;

    function handleOutside(e: Event) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        onCollapse?.();
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('touchstart', handleOutside, { capture: true });
      document.addEventListener('mousedown', handleOutside, { capture: true });
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('touchstart', handleOutside, { capture: true });
      document.removeEventListener('mousedown', handleOutside, { capture: true });
    };
  }, [expanded, onCollapse]);

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      <button
        onClick={() => (expanded ? onCollapse?.() : onExpand?.())}
        className="bg-gray-200 text-gray-500 text-sm px-3 py-1 rounded-lg flex items-center gap-1"
      >
        {t(`categories.${category}`)}
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-2 bg-gray-100 rounded-xl p-3 border border-gray-200">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { onChange(cat); onCollapse?.(); }}
              className={`text-sm px-3.5 py-2 rounded-lg transition ${
                cat === category
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 active:bg-gray-50'
              }`}
            >
              {t(`categories.${cat}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
