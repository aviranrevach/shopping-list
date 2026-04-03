import { useState, useRef } from 'react';
import { useI18n } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useItemSuggestions } from '../hooks/useItemSuggestions';
import { useCategories } from '../hooks/useCategories';
import { createItem, updateItem } from '../data/items';
import { createCustomCategory } from '../data/categories';
import { SuggestionChips } from './SuggestionChips';
import { CategoryPicker } from './CategoryPicker';
import type { Item } from '../types';

interface AddedItem {
  id: string;
  name: string;
  category: string;
}

interface AddZoneProps {
  listId: string;
  userId: string;
  groupId: string;
  existingItemNames: string[];
  onDone: (newItems: AddedItem[]) => void;
  onItemAdded: (item: Item) => void;
}

export function AddZone({ listId, userId, groupId, existingItemNames, onDone, onItemAdded }: AddZoneProps) {
  const { t } = useI18n();
  const { scheme } = useTheme();
  const [input, setInput] = useState('');
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [editingCategoryForItem, setEditingCategoryForItem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const suggestions = useItemSuggestions(groupId, input);
  const { allCategories, addCategory, getCategoryEmoji } = useCategories(groupId);

  // Focus is triggered by the parent button handler for iOS compatibility
  // (synchronous from user gesture context, not from a child useEffect).

  // Live category based on best match
  const liveCategory = (() => {
    if (!input.trim()) return 'לא ממוין';
    const exact = suggestions.find((s) => s.name === input.trim());
    if (exact) return exact.category === 'other' ? 'לא ממוין' : exact.category;
    if (suggestions.length === 1) {
      const cat = suggestions[0].category;
      return cat === 'other' ? 'לא ממוין' : cat;
    }
    return 'לא ממוין';
  })();

  const liveCategoryLabel = liveCategory === 'לא ממוין' ? 'לא ממוין' : t(`categories.${liveCategory}`);

  async function handleSubmit() {
    if (!input.trim()) return;
    const name = input.trim();
    const match = suggestions.find((s) => s.name === name);
    const category = match?.category ?? 'other';

    const item = await createItem(listId, userId, name, category);
    const added = { id: item.id, name: item.name, category: item.category };
    setAddedItems((prev) => [...prev, added]);
    onItemAdded(item);
    setInput('');
    inputRef.current?.focus();
  }

  function handleSelectSuggestion(suggestion: { name: string; category: string }) {
    createItem(listId, userId, suggestion.name, suggestion.category).then((item) => {
      const added = { id: item.id, name: item.name, category: item.category };
      setAddedItems((prev) => [...prev, added]);
      onItemAdded(item);
    });
    setInput('');
    inputRef.current?.focus();
  }

  function handleDone() {
    if (zoneRef.current) {
      zoneRef.current.style.maxHeight = zoneRef.current.offsetHeight + 'px';
    }
    setIsCollapsing(true);
    setTimeout(() => onDone(addedItems), 350);
  }

  async function handleCategorySelect(itemId: string, categoryKey: string) {
    setAddedItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, category: categoryKey } : i))
    );
    setEditingCategoryForItem(null);
    await updateItem(itemId, { category: categoryKey });
  }

  async function handleCreateCategory(itemId: string, name: string, emoji: string) {
    try {
      const newCat = await createCustomCategory(groupId, name, emoji);
      addCategory(newCat);
      await handleCategorySelect(itemId, newCat.name);
    } catch (err) {
      console.error('Failed to create category', err);
    }
  }

  // Mark suggestions that are already on the list
  const enrichedSuggestions = suggestions.map((s) => ({
    ...s,
    onList: existingItemNames.includes(s.name),
  }));

  function getCategoryLabel(cat: string): string {
    if (cat === 'other') return 'לא ממוין';
    // Try built-in i18n key
    const key = `categories.${cat}`;
    const translated = t(key);
    // If translation returns the key itself, it's a custom category — show as-is
    if (translated && translated !== key) return translated;
    return cat;
  }

  return (
    <>
      <div
        ref={zoneRef}
        className={`border-b-2 add-zone-exit ${isCollapsing ? 'collapsing' : ''}`}
        style={{ background: scheme.primaryBg50 + '4d', borderColor: scheme.primaryBg50 }}
      >
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: scheme.primaryBg50 + '80' }}>
          <button onClick={handleDone} className="font-semibold text-[15px]" style={{ color: scheme.primaryDark }}>
            {t('rapid_add.done')}
          </button>
          <h2 className="text-[17px] font-semibold text-gray-900 flex-1 text-center">
            {t('rapid_add.title')}
          </h2>
          <div className="w-10" />
        </div>

        {/* Added items */}
        {addedItems.length > 0 && (
          <div className="px-4 pt-2">
            <div className="text-xs text-gray-300 font-medium mb-1">פריטים חדשים</div>
          </div>
        )}
        {addedItems.map((item, i) => (
          <div key={item.id}>
            <div
              className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100/50 row-glow"
              style={{ animationDelay: `${i * 50}ms` }}
              ref={(el) => { if (el) setTimeout(() => el.classList.add('settled'), 100); }}
            >
              <div className="w-5 h-5 border-2 border-gray-300 rounded-md flex-shrink-0" />
              <span className="text-[17px] text-gray-500">{item.name}</span>
              <div className="flex-1" />
              <button
                onClick={() =>
                  setEditingCategoryForItem(
                    editingCategoryForItem === item.id ? null : item.id
                  )
                }
                className={`text-sm px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${
                  item.category === 'other'
                    ? 'bg-gray-200 text-gray-400'
                    : ''
                }`}
                style={item.category !== 'other' ? { background: scheme.primaryBg50, color: scheme.primaryDark } : undefined}
              >
                <span>{getCategoryEmoji(item.category)}</span>
                <span>{getCategoryLabel(item.category)}</span>
              </button>
            </div>
            {editingCategoryForItem === item.id && (
              <CategoryPicker
                categories={allCategories}
                selected={item.category}
                onSelect={(key) => handleCategorySelect(item.id, key)}
                onCreateNew={(name, emoji) => handleCreateCategory(item.id, name, emoji)}
              />
            )}
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <div className="w-5 h-5 border-2 border-gray-200 rounded-md flex-shrink-0 opacity-30" />
          <input
            ref={inputRef}
            data-add-input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
            }}
            placeholder={t('rapid_add.input_placeholder')}
            className="flex-1 text-[17px] outline-none bg-transparent text-gray-900 placeholder:text-gray-300"
          />
          <span className={`text-sm px-2.5 py-0.5 rounded-lg ${
            liveCategoryLabel === 'לא ממוין' ? 'bg-gray-200 text-gray-400' : 'bg-gray-200 text-gray-500'
          }`}>
            {liveCategoryLabel}
          </span>
        </div>
      </div>

      {/* Suggestion chips */}
      <SuggestionChips suggestions={enrichedSuggestions} onSelect={handleSelectSuggestion} />
    </>
  );
}
