import { useState } from 'react';
import { useI18n } from '../i18n';
import { CATEGORIES } from '../types';

interface CategoryPillProps {
  category: string;
  onChange: (category: string) => void;
}

export function CategoryPill({ category, onChange }: CategoryPillProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-gray-200 text-gray-500 text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1"
      >
        {t(`categories.${category}`)}
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-1.5 bg-gray-100 rounded-xl p-3 border border-gray-200">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { onChange(cat); setExpanded(false); }}
              className={`text-xs px-3 py-1.5 rounded-lg transition ${
                cat === category
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
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
