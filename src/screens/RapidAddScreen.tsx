import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { useItemSuggestions } from '../hooks/useItemSuggestions';
import { createItem, updateItem } from '../data/items';
import { QuantityPill } from '../components/QuantityPill';
import { CategoryPill } from '../components/CategoryPill';
import { SuggestionChips } from '../components/SuggestionChips';

type ActiveControl = { itemId: string; type: 'quantity' | 'category' } | null;

interface AddedItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
}

export function RapidAddScreen() {
  const { t } = useI18n();
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const { group } = useGroup(user?.id);
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [activeControl, setActiveControl] = useState<ActiveControl>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useItemSuggestions(group?.id, input);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!listId || !user || !input.trim()) return;
    const name = input.trim();

    // Check if suggestion matches
    const match = suggestions.find((s) => s.name === name);
    const category = match?.category ?? 'other';

    const item = await createItem(listId, user.id, name, category);
    setAddedItems((prev) => [...prev, { id: item.id, name: item.name, quantity: item.quantity, category: item.category }]);
    setInput('');
    inputRef.current?.focus();
  }

  function handleSelectSuggestion(suggestion: { name: string; category: string }) {
    if (!listId || !user) return;
    createItem(listId, user.id, suggestion.name, suggestion.category).then((item) => {
      setAddedItems((prev) => [...prev, { id: item.id, name: item.name, quantity: item.quantity, category: item.category }]);
    });
    setInput('');
    inputRef.current?.focus();
  }

  async function handleQuantityChange(itemId: string, quantity: number) {
    await updateItem(itemId, { quantity });
    setAddedItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
    );
  }

  async function handleCategoryChange(itemId: string, category: string) {
    await updateItem(itemId, { category });
    setAddedItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, category } : i)),
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-200 flex items-center">
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('rapid_add.title')}</h1>
        <button
          onClick={() => navigate(`/lists/${listId}`)}
          className="text-amber-600 font-semibold text-sm"
        >
          {t('rapid_add.done')}
        </button>
      </header>

      {/* Canvas */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        {addedItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 py-2.5 border-b border-gray-100">
            <div className="w-5 h-5 border-2 border-gray-300 rounded-md flex-shrink-0" />
            <span className="text-[17px] text-gray-500">{item.name}</span>
            <QuantityPill
              quantity={item.quantity}
              onChange={(q) => handleQuantityChange(item.id, q)}
              expanded={activeControl?.itemId === item.id && activeControl.type === 'quantity'}
              onExpand={() => setActiveControl({ itemId: item.id, type: 'quantity' })}
              onCollapse={() => setActiveControl(null)}
            />
            <div className="flex-1" />
            <CategoryPill
              category={item.category}
              onChange={(c) => handleCategoryChange(item.id, c)}
              expanded={activeControl?.itemId === item.id && activeControl.type === 'category'}
              onExpand={() => setActiveControl({ itemId: item.id, type: 'category' })}
              onCollapse={() => setActiveControl(null)}
            />
          </div>
        ))}

        {/* Current input line */}
        <div className="flex items-center gap-2 py-2.5">
          <div className="w-5 h-5 border-2 border-gray-200 rounded-md flex-shrink-0 opacity-30" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={t('rapid_add.input_placeholder')}
            className="flex-1 text-[17px] outline-none bg-transparent text-gray-900 placeholder:text-gray-300"
          />
        </div>
      </div>

      {/* Suggestion chips above keyboard */}
      <SuggestionChips suggestions={suggestions} onSelect={handleSelectSuggestion} />
    </div>
  );
}
