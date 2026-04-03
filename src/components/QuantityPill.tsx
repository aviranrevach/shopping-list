import { useState } from 'react';

interface QuantityPillProps {
  quantity: number;
  onChange: (quantity: number) => void;
}

export function QuantityPill({ quantity, onChange }: QuantityPillProps) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setExpanded(true)}
          className="bg-amber-500 text-white text-xs px-2.5 py-0.5 rounded-lg font-medium"
        >
          x{quantity}
        </button>
        <div className="flex items-center justify-between bg-gray-100 border border-amber-400 rounded-xl px-4 py-2.5">
          <button
            onClick={() => { onChange(Math.max(1, quantity - 1)); }}
            className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm active:bg-gray-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="text-xl font-bold text-gray-900 min-w-[2rem] text-center">{quantity}</span>
          <button
            onClick={() => { onChange(quantity + 1); }}
            className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm active:bg-gray-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (quantity <= 1) {
    return (
      <button
        onClick={() => { onChange(2); setExpanded(true); }}
        className="bg-gray-200 text-gray-400 text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      className="bg-gray-300 text-gray-700 text-xs px-2.5 py-0.5 rounded-lg font-medium"
    >
      x{quantity}
    </button>
  );
}
