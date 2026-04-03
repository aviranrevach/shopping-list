import { useI18n } from '../i18n';
import type { Item } from '../types';
import { ItemRow } from './ItemRow';

interface CategoryGroupProps {
  category: string;
  items: Item[];
  onToggleCheck: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onOpenDetail: (itemId: string) => void;
  transitioningIds: Set<string>;
}

export function CategoryGroup({ category, items, onToggleCheck, onDelete, onOpenDetail, transitioningIds }: CategoryGroupProps) {
  const { t } = useI18n();

  return (
    <div className="mb-4">
      <div className="text-[15px] text-gray-400 font-medium mb-2 px-1">
        {category === 'checked_section' ? t('list_detail.checked_section') : t(`categories.${category}`)}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            isTransitioning={transitioningIds.has(item.id)}
            onToggleCheck={() => onToggleCheck(item.id)}
            onDelete={() => onDelete(item.id)}
            onOpenDetail={() => onOpenDetail(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
