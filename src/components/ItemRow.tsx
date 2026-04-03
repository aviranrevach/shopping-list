import { useState } from 'react';
import type { Item } from '../types';
import { SwipeableRow } from './SwipeableRow';

interface ItemRowProps {
  item: Item;
  onToggleCheck: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
}

export function ItemRow({ item, onToggleCheck, onDelete, onOpenDetail }: ItemRowProps) {
  const hasNote = !!item.note;
  const [justChecked, setJustChecked] = useState(false);

  function handleCheck() {
    if (!item.checked) {
      setJustChecked(true);
      setTimeout(() => setJustChecked(false), 300);
    }
    onToggleCheck();
  }

  return (
    <SwipeableRow
      onSwipeRight={onOpenDetail}
      rightActions={
        <>
          <button
            onClick={onDelete}
            className="w-[68px] bg-red-500 flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
          <button
            onClick={handleCheck}
            className="w-[68px] bg-amber-500 flex items-center justify-center rounded-e-xl"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </>
      }
      leftActions={
        <button
          onClick={onOpenDetail}
          className="w-[68px] bg-blue-500 flex items-center justify-center rounded-s-xl"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </button>
      }
    >
      <button
        onClick={handleCheck}
        className={`flex items-center gap-3 px-4 py-3.5 w-full text-start active:bg-gray-100 transition-colors duration-100 ${item.checked ? 'opacity-40' : ''}`}
      >
        <div className="flex-shrink-0">
          {item.checked ? (
            <div
              className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center"
              style={{
                transform: justChecked ? 'scale(1.25)' : 'scale(1)',
                transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : (
            <div
              className="w-7 h-7 border-2 border-gray-300 rounded-lg hover:border-amber-400 transition-colors duration-100"
            />
          )}
        </div>
        <span className={`text-[17px] text-gray-900 ${item.checked ? 'line-through text-gray-500' : ''}`}>
          {item.name}
        </span>
        {item.quantity > 1 && (
          <span className="bg-gray-200 text-gray-600 text-sm px-2.5 py-0.5 rounded-lg font-medium">
            x{item.quantity}
          </span>
        )}
        {hasNote && (
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        )}
      </button>
    </SwipeableRow>
  );
}
