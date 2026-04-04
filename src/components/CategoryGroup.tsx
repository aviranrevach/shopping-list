import { useI18n } from '../i18n';
import { DEFAULT_CATEGORY_EMOJIS, CATEGORY_COLORS } from '../types';
import type { Item } from '../types';
import { ItemRow } from './ItemRow';

interface CategoryGroupProps {
  category: string;
  items: Item[];
  onToggleCheck: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onOpenDetail: (itemId: string) => void;
  transitioningIds: Set<string>;
  recentlyTransitionedIds: Set<string>;
  categoryEmoji?: string;
  skipExitAnimation?: boolean;
  showHeader?: boolean;
  onHeaderClick?: () => void;
  onAddToCategory?: (category: string) => void;
  onDeleteCategory?: (category: string) => void;
}

export function CategoryGroup({ category, items, onToggleCheck, onDelete, onOpenDetail, transitioningIds, recentlyTransitionedIds, categoryEmoji, skipExitAnimation, showHeader = true, onHeaderClick, onAddToCategory, onDeleteCategory }: CategoryGroupProps) {
  const { t } = useI18n();

  const emoji = categoryEmoji ?? DEFAULT_CATEGORY_EMOJIS[category];
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  const isCheckedSection = category === 'checked_section';

  return (
    <div className="mb-4">
      {showHeader && (
        isCheckedSection ? (
          <div className="text-[15px] text-gray-400 font-medium mb-2 px-1">
            {t('list_detail.checked_section')}
          </div>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-1.5"
            style={{ background: colors.bg, color: colors.text }}
          >
            {/* RTL start: + add button */}
            {onAddToCategory && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddToCategory(category); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: colors.activeBg, color: colors.text }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}

            {/* Center: category name + emoji */}
            <span
              className="flex-1 text-[15px] font-semibold"
              onClick={onHeaderClick}
              style={onHeaderClick ? { cursor: 'pointer' } : undefined}
            >
              {t(`categories.${category}`)} {emoji}
            </span>

            {/* RTL end: trash button */}
            {onDeleteCategory && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteCategory(category); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-60"
                style={{ color: colors.text }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            )}
          </div>
        )
      )}

      <div className="space-y-0.5">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            isTransitioning={transitioningIds.has(item.id)}
            shouldAnimateEntrance={recentlyTransitionedIds.has(item.id)}
            skipExitAnimation={skipExitAnimation}
            onToggleCheck={() => onToggleCheck(item.id)}
            onDelete={() => onDelete(item.id)}
            onOpenDetail={() => onOpenDetail(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
