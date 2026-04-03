import { useState } from 'react';
import { useI18n } from '../i18n';
import type { CategoryInfo } from '../hooks/useCategories';

interface CategoryPickerProps {
  categories: CategoryInfo[];
  selected: string;
  onSelect: (key: string) => void;
  onCreateNew: (name: string, emoji: string) => void;
}

export function CategoryPicker({ categories, selected, onSelect, onCreateNew }: CategoryPickerProps) {
  const { t } = useI18n();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📦');

  if (isCreating) {
    return (
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="text-sm text-gray-400 text-center mb-3">{t('categories_ui.new_category')}</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const emoji = prompt(t('categories_ui.choose_emoji'), newEmoji);
              if (emoji) setNewEmoji(emoji);
            }}
            className="w-[52px] h-[52px] bg-white border-2 border-gray-200 rounded-2xl text-3xl flex items-center justify-center flex-shrink-0 active:bg-gray-50"
          >
            {newEmoji}
          </button>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                onCreateNew(newName.trim(), newEmoji);
                setIsCreating(false);
                setNewName('');
                setNewEmoji('📦');
              }
            }}
            placeholder={t('categories_ui.category_name_placeholder')}
            className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 text-[17px] outline-none focus:border-amber-400"
          />
        </div>
        <button
          onClick={() => {
            if (newName.trim()) {
              onCreateNew(newName.trim(), newEmoji);
              setIsCreating(false);
              setNewName('');
              setNewEmoji('📦');
            }
          }}
          className="w-full mt-3 bg-amber-500 text-white font-semibold rounded-2xl py-3.5 text-base active:bg-amber-600"
        >
          {t('categories_ui.save_category')}
        </button>
        <button
          onClick={() => { setIsCreating(false); setNewName(''); }}
          className="w-full mt-2 text-sm text-gray-400 py-2"
        >
          {t('categories_ui.cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-2">
      {categories.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onSelect(cat.key)}
          className={`flex items-center justify-center gap-2 py-3.5 px-3 rounded-2xl text-base font-medium min-h-[50px] ${
            cat.key === selected
              ? 'bg-amber-500 text-white border-2 border-amber-500'
              : 'bg-white border-2 border-gray-100 text-gray-600 active:bg-gray-50'
          }`}
        >
          <span className="text-[22px]">{cat.emoji}</span>
          {cat.isCustom ? cat.key : t(`categories.${cat.key}`)}
        </button>
      ))}
      <button
        onClick={() => setIsCreating(true)}
        className="flex items-center justify-center gap-2 py-3.5 px-3 rounded-2xl text-base font-medium min-h-[50px] border-2 border-dashed border-gray-300 text-gray-400 active:bg-gray-50"
      >
        {t('categories_ui.add_new')}
      </button>
    </div>
  );
}
