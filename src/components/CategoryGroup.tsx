import { useI18n } from '../i18n';
import { DEFAULT_CATEGORY_EMOJIS } from '../types';
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
}

export function CategoryGroup({ category, items, onToggleCheck, onDelete, onOpenDetail, transitioningIds, recentlyTransitionedIds, categoryEmoji, skipExitAnimation, showHeader = true, onHeaderClick }: CategoryGroupProps) {
  const { t } = useI18n();

  const emoji = categoryEmoji ?? DEFAULT_CATEGORY_EMOJIS[category];

  return (
    <div className="mb-4">
      {showHeader && (
        <div
          className={`text-[15px] text-gray-400 font-medium mb-2 px-1 flex items-center gap-1 ${onHeaderClick ? 'cursor-pointer active:opacity-60 select-none' : ''}`}
          onClick={onHeaderClick}
        >
          {category === 'checked_section'
            ? t('list_detail.checked_section')
            : `${emoji ? emoji + ' ' : ''}${t(`categories.${category}`)}`}
          {onHeaderClick && (
            <svg className="w-3.5 h-3.5 opacity-40 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          )}
        </div>
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
