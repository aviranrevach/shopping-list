import { useI18n } from '../i18n';
import type { Item } from '../types';
import { ItemRow } from './ItemRow';

interface CategoryGroupProps {
  category: string;
  items: Item[];
  onToggleCheck: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onOpenDetail: (itemId: string) => void;
}

export function CategoryGroup({ category, items, onToggleCheck, onDelete, onOpenDetail }: CategoryGroupProps) {
  const { t } = useI18n();

  return (
    <div className="mb-4">
      <div className="text-sm text-gray-400 font-medium mb-1.5 px-1">
        {t(`categories.${category}`)}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onToggleCheck={() => onToggleCheck(item.id)}
            onDelete={() => onDelete(item.id)}
            onOpenDetail={() => onOpenDetail(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
