import { useEffect, useRef } from 'react';

interface QuantityPillProps {
  quantity: number;
  onChange: (quantity: number) => void;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export function QuantityPill({ quantity, onChange, expanded = false, onExpand, onCollapse }: QuantityPillProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;

    function handleOutside(e: Event) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        onCollapse?.();
      }
    }

    // Delay attaching so the opening click/tap doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('touchstart', handleOutside, { capture: true });
      document.addEventListener('mousedown', handleOutside, { capture: true });
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('touchstart', handleOutside, { capture: true });
      document.removeEventListener('mousedown', handleOutside, { capture: true });
    };
  }, [expanded, onCollapse]);

  if (expanded) {
    return (
      <div ref={containerRef} className="flex flex-col gap-1.5">
        <button
          onClick={() => onCollapse?.()}
          className="bg-amber-500 text-white text-sm px-3 py-1 rounded-lg font-medium"
        >
          x{quantity}
        </button>
        <div className="flex items-center justify-between bg-gray-100 border border-amber-400 rounded-xl px-4 py-3">
          <button
            onClick={() => onChange(Math.max(1, quantity - 1))}
            className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm active:bg-gray-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="text-2xl font-bold text-gray-900 min-w-[2.5rem] text-center">{quantity}</span>
          <button
            onClick={() => onChange(quantity + 1)}
            className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm active:bg-gray-50"
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
        onClick={() => { onChange(2); onExpand?.(); }}
        className="bg-gray-200 text-gray-400 text-sm px-3 py-1 rounded-lg flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={() => onExpand?.()}
      className="bg-gray-300 text-gray-700 text-sm px-3 py-1 rounded-lg font-medium"
    >
      x{quantity}
    </button>
  );
}
