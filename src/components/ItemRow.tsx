import { useEffect, useRef, useState } from 'react';
import type { Item } from '../types';

type AnimPhase = 'idle' | 'checkbox-pop' | 'text-strike' | 'row-exit';

interface ItemRowProps {
  item: Item;
  onToggleCheck: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
  isTransitioning: boolean;
}

export function ItemRow({ item, onToggleCheck, onDelete, onOpenDetail, isTransitioning }: ItemRowProps) {
  const hasNote = !!item.note;
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const prevChecked = useRef(item.checked);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wasTransitioning = useRef(false);
  const [isEntering, setIsEntering] = useState(false);

  // Swipe state
  const rowRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointerState = useRef({
    startX: 0, startY: 0, dx: 0, dy: 0,
    isH: null as boolean | null,
    isV: null as boolean | null,
    pressing: false,
    longTimer: null as ReturnType<typeof setTimeout> | null,
    longFired: false,
    pointerId: 0,
  });

  // Clean up timers on unmount
  useEffect(() => {
    return () => { timers.current.forEach(clearTimeout); };
  }, []);

  // Detect check/uncheck change → start animation phases
  useEffect(() => {
    if (item.checked !== prevChecked.current) {
      prevChecked.current = item.checked;
      if (isTransitioning) {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setPhase('checkbox-pop');
        timers.current.push(setTimeout(() => setPhase('text-strike'), 200));
        timers.current.push(setTimeout(() => setPhase('row-exit'), item.checked ? 500 : 500));
        timers.current.push(setTimeout(() => setPhase('idle'), item.checked ? 700 : 700));
      }
    }
  }, [item.checked, isTransitioning]);

  // Detect entrance (transitioning → not transitioning)
  useEffect(() => {
    if (wasTransitioning.current && !isTransitioning) {
      setIsEntering(true);
      const t = setTimeout(() => setIsEntering(false), 300);
      return () => clearTimeout(t);
    }
    wasTransitioning.current = isTransitioning;
  }, [isTransitioning]);

  // Ripple effect
  function createRipple() {
    if (!wrapRef.current || !rowRef.current) return;
    const row = rowRef.current;
    const cb = wrapRef.current;
    const rect = row.getBoundingClientRect();
    const cbRect = cb.getBoundingClientRect();
    const cx = cbRect.left - rect.left + cbRect.width / 2;
    const cy = cbRect.top - rect.top + cbRect.height / 2;
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position:absolute; border-radius:50%; pointer-events:none; z-index:1;
      width:${size}px; height:${size}px;
      left:${cx - size / 2}px; top:${cy - size / 2}px;
      background: radial-gradient(circle, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0) 70%);
      animation: ripple-expand 0.5s ease-out forwards;
    `;
    row.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  function handleCheckboxClick(e: React.MouseEvent) {
    e.stopPropagation();
    createRipple();
    onToggleCheck();
  }

  // Pointer handlers for swipe-to-delete + long-press
  function handlePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-checkbox]')) return;
    const s = pointerState.current;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.dx = 0; s.dy = 0;
    s.isH = null; s.isV = null;
    s.longFired = false;
    s.pressing = true;
    s.pointerId = e.pointerId;

    rowRef.current?.setPointerCapture(e.pointerId);
    if (rowRef.current) rowRef.current.style.backgroundColor = '#f5f0e5';

    s.longTimer = setTimeout(() => {
      if (!s.pressing || s.isH) return;
      s.longFired = true;
      rowRef.current?.classList.remove('bg-amber-50');
      onOpenDetail();
    }, 400);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const s = pointerState.current;
    if (!s.pressing) return;
    s.dx = e.clientX - s.startX;
    s.dy = e.clientY - s.startY;

    if (Math.abs(s.dx) > 5 || Math.abs(s.dy) > 5) {
      if (s.longTimer) { clearTimeout(s.longTimer); s.longTimer = null; }
      if (rowRef.current) rowRef.current.style.backgroundColor = '';
    }

    if (s.isH === null && s.isV === null && (Math.abs(s.dx) > 8 || Math.abs(s.dy) > 8)) {
      if (Math.abs(s.dx) > Math.abs(s.dy)) {
        s.isH = true;
      } else {
        s.isV = true;
        if (s.dy > 30 && !s.longFired) {
          s.longFired = true;
          s.pressing = false;
          onOpenDetail();
          return;
        }
      }
    }

    if (s.isV && s.dy > 30 && !s.longFired) {
      s.longFired = true;
      s.pressing = false;
      onOpenDetail();
      return;
    }

    // Horizontal swipe: stretch delete
    if (s.isH && rowRef.current && wrapRef.current) {
      e.preventDefault();
      const swipeDx = Math.max(0, s.dx); // RTL: positive = visual left swipe
      const row = rowRef.current;
      const wrap = rowRef.current.closest('[data-swipe-wrap]') as HTMLElement;
      row.style.transition = 'none';
      row.style.transform = `translateX(${swipeDx}px)`;

      if (wrap) {
        const screenW = window.innerWidth;
        const deleteThreshold = screenW * 0.55;
        const intensity = Math.min(1, swipeDx / 200);
        wrap.style.background = `rgba(239, 68, 68, ${0.6 + intensity * 0.4})`;

        const dlab = wrap.querySelector('[data-delete-label]') as HTMLElement;
        if (dlab) {
          dlab.style.opacity = swipeDx > 40 ? '1' : '0';
          const nearThreshold = swipeDx > deleteThreshold * 0.85;
          dlab.style.transform = nearThreshold ? 'scale(1.25)' : 'scale(1)';
        }
      }
    }
  }

  function handlePointerUp(_e: React.PointerEvent) {
    const s = pointerState.current;
    if (s.longTimer) { clearTimeout(s.longTimer); s.longTimer = null; }
    s.pressing = false;
    if (rowRef.current) rowRef.current.style.backgroundColor = '';

    if (s.isH && rowRef.current) {
      const swipeDx = Math.max(0, s.dx);
      const screenW = window.innerWidth;
      const row = rowRef.current;
      const wrap = row.closest('[data-swipe-wrap]') as HTMLElement;

      if (swipeDx > screenW * 0.55) {
        // Delete — slide out then collapse height
        row.style.transition = 'transform 0.2s ease';
        row.style.transform = `translateX(${screenW}px)`;
        setTimeout(() => {
          const swipeWrap = row.closest('[data-swipe-wrap]') as HTMLElement;
          if (swipeWrap) {
            swipeWrap.style.transition = 'max-height 0.3s ease, opacity 0.2s ease, margin 0.3s ease';
            swipeWrap.style.maxHeight = '0';
            swipeWrap.style.opacity = '0';
            swipeWrap.style.marginBottom = '0';
            swipeWrap.style.overflow = 'hidden';
          }
          setTimeout(() => onDelete(), 300);
        }, 200);
      } else {
        // Snap back
        row.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        row.style.transform = 'translateX(0)';
        if (wrap) {
          wrap.style.background = '';
          const dlab = wrap.querySelector('[data-delete-label]') as HTMLElement;
          if (dlab) { dlab.style.opacity = '0'; dlab.style.transform = 'scale(1)'; }
        }
      }
    }

    s.isH = null;
    s.isV = null;
  }

  // Row style based on animation phase
  const rowExitStyle: React.CSSProperties = phase === 'row-exit'
    ? { opacity: 0, maxHeight: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, overflow: 'hidden',
        transition: 'opacity 0.2s ease, max-height 0.25s ease, padding 0.25s ease, margin 0.25s ease' }
    : {};

  const rowFadeStyle: React.CSSProperties =
    (phase === 'text-strike' && item.checked) ? { opacity: 0.2, transition: 'opacity 0.3s ease' } : {};

  const textClass =
    phase === 'text-strike' || phase === 'row-exit'
      ? item.checked
        ? 'line-through text-gray-400 transition-all duration-200'
        : 'no-underline text-gray-900 transition-all duration-200'
      : item.checked
        ? 'line-through text-gray-500'
        : '';

  return (
    <div
      data-swipe-wrap
      className={`relative overflow-hidden rounded-xl mb-0.5 ${isEntering ? 'row-entering' : ''}`}
      style={rowExitStyle}
    >
      {/* Delete background */}
      <div className="absolute inset-0 bg-red-500/0">
        <div
          data-delete-label
          className="absolute top-0 bottom-0 left-5 flex items-center gap-2 text-white font-semibold text-[15px]"
          style={{ opacity: 0, transition: 'opacity 0.15s, transform 0.15s', transform: 'scale(1)' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          מחיקה
        </div>
      </div>

      {/* Row content */}
      <div
        ref={rowRef}
        className="relative z-[1] bg-white border border-gray-100 flex items-center gap-3 px-4 py-3.5 transition-colors duration-100"
        style={{ ...rowFadeStyle, touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Checkbox — separate tap target */}
        <div
          ref={wrapRef}
          data-checkbox
          className="flex-shrink-0 cursor-pointer w-9 h-9 flex items-center justify-center"
          onClick={handleCheckboxClick}
        >
          {item.checked ? (
            <div className={`w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center ${phase === 'checkbox-pop' ? 'checkbox-pop' : ''}`}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : (
            <div className={`w-7 h-7 border-2 border-gray-300 rounded-lg hover:border-amber-400 transition-colors duration-100 ${phase === 'checkbox-pop' ? 'checkbox-pop' : ''}`} />
          )}
        </div>

        {/* Item name */}
        <span className={`text-[17px] text-gray-900 ${textClass}`}>
          {item.name}
        </span>

        {/* Quantity pill — sits right next to the name */}
        {item.quantity > 1 && (
          <span className="bg-gray-200 text-gray-600 text-sm px-2.5 py-0.5 rounded-lg font-medium flex-shrink-0">
            x{item.quantity}
          </span>
        )}

        {/* Note indicator */}
        {hasNote && (
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        )}

        {/* Flex spacer */}
        <div className="flex-1" />
      </div>
    </div>
  );
}
