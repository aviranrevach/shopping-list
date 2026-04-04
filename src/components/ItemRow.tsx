import { useEffect, useRef } from 'react';
import { useTheme } from '../theme/ThemeContext';
import type { Item } from '../types';

interface ItemRowProps {
  item: Item;
  onToggleCheck: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
  isTransitioning: boolean;
  shouldAnimateEntrance: boolean;
  skipExitAnimation?: boolean;
}

export function ItemRow({ item, onToggleCheck, onDelete, onOpenDetail, isTransitioning: _isTransitioning, shouldAnimateEntrance, skipExitAnimation }: ItemRowProps) {
  const { scheme } = useTheme();
  const hasNote = !!item.note;

  // Refs for DOM manipulation
  const rowRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const swipeWrapRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pointerState = useRef({
    startX: 0, startY: 0, dx: 0, dy: 0,
    isH: null as boolean | null,
    pressing: false,
    pointerId: 0,
    detailTriggered: false,
  });

  // Clean up timers on unmount
  useEffect(() => {
    return () => { timers.current.forEach(clearTimeout); };
  }, []);

  // Entrance animation: CSS animation via inline style is more reliable than
  // DOM manipulation because it runs regardless of timing / batching issues.
  // We use a data attribute so we can control when it fires.
  useEffect(() => {
    if (!shouldAnimateEntrance || !swipeWrapRef.current) return;
    const el = swipeWrapRef.current;
    el.style.animation = 'item-appear 0.35s ease forwards';
    const t = setTimeout(() => { el.style.animation = ''; }, 400);
    return () => clearTimeout(t);
  }, []); // runs once on mount — shouldAnimateEntrance is captured at mount time

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
      background: radial-gradient(circle, ${scheme.primaryRipple} 0%, transparent 70%);
      animation: ripple-expand 0.5s ease-out forwards;
    `;
    row.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  function handleCheckboxClick(e: React.MouseEvent) {
    e.stopPropagation();
    createRipple();

    const wrapper = swipeWrapRef.current;
    if (!wrapper) { onToggleCheck(); return; }

    // Clear any previous animation timers
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (!skipExitAnimation) {
      if (!item.checked) {
        // CHECKING: fade -> collapse -> disappear from unchecked section
        timers.current.push(setTimeout(() => wrapper.setAttribute('data-animating', 'check-fade'), 150));
        timers.current.push(setTimeout(() => wrapper.setAttribute('data-animating', 'check-exit'), 400));
      } else {
        // UNCHECKING: restore -> collapse -> disappear from checked section
        wrapper.setAttribute('data-animating', 'uncheck-restore');
        timers.current.push(setTimeout(() => wrapper.setAttribute('data-animating', 'uncheck-exit'), 500));
      }
    }

    onToggleCheck();
  }

  // Pointer handlers:
  //   Swipe RIGHT (dx > 0) → delete zone (red background, slide right to confirm)
  //   Swipe LEFT  (dx < 0) → open detail when threshold reached (-80px)
  function handlePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-checkbox]')) return;
    if ((e.target as HTMLElement).closest('[data-nodrag]')) return;
    const s = pointerState.current;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.dx = 0; s.dy = 0;
    s.isH = null;
    s.pressing = true;
    s.detailTriggered = false;
    s.pointerId = e.pointerId;

    rowRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const s = pointerState.current;
    if (!s.pressing) return;
    s.dx = e.clientX - s.startX;
    s.dy = e.clientY - s.startY;

    // Determine axis once we have enough movement
    if (s.isH === null && (Math.abs(s.dx) > 8 || Math.abs(s.dy) > 8)) {
      s.isH = Math.abs(s.dx) > Math.abs(s.dy);
    }

    if (!s.isH) return; // vertical scroll — let browser handle

    e.preventDefault();

    // Swipe RIGHT (positive dx, towards right side of screen) → open DETAIL
    if (s.dx > 0 && !s.detailTriggered) {
      if (rowRef.current) {
        const clampedDx = Math.min(s.dx, 100);
        rowRef.current.style.transition = 'none';
        rowRef.current.style.transform = `translateX(${clampedDx}px)`;
      }

      if (s.dx >= 80) {
        s.detailTriggered = true;
        if (rowRef.current) {
          rowRef.current.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          rowRef.current.style.transform = 'translateX(0)';
        }
        s.pressing = false;
        onOpenDetail();
      }
      return;
    }

    // Swipe LEFT (negative dx, towards left side of screen) → DELETE zone
    if (s.dx < 0 && rowRef.current && wrapRef.current) {
      const swipeDx = Math.abs(s.dx);
      const row = rowRef.current;
      const wrap = row.closest('[data-swipe-wrap]') as HTMLElement;
      row.style.transition = 'none';
      row.style.transform = `translateX(${s.dx}px)`;

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
    s.pressing = false;

    // Snap back right-swipe (detail) if not triggered yet
    if (s.dx > 0 && !s.detailTriggered && rowRef.current) {
      rowRef.current.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      rowRef.current.style.transform = 'translateX(0)';
      s.isH = null;
      return;
    }

    // Left swipe (delete direction)
    if (s.isH && s.dx < 0 && rowRef.current) {
      const swipeDx = Math.abs(s.dx);
      const screenW = window.innerWidth;
      const row = rowRef.current;
      const wrap = row.closest('[data-swipe-wrap]') as HTMLElement;

      if (swipeDx > screenW * 0.55) {
        // Delete — slide out left then collapse height
        row.style.transition = 'transform 0.2s ease';
        row.style.transform = `translateX(${-screenW}px)`;
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
  }

  const textClass = item.checked ? 'line-through text-gray-500' : '';

  return (
    <div
      ref={swipeWrapRef}
      data-swipe-wrap
      className="relative rounded-xl"
      style={{ maxHeight: 100, marginBottom: 2, overflow: 'hidden' }}
    >
      {/* Delete background — revealed on the right side (end side) when swiping left */}
      <div className="absolute inset-0 bg-red-500/0">
        <div
          data-delete-label
          className="absolute top-0 bottom-0 right-5 flex items-center gap-2 text-white font-semibold text-[15px]"
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
        className="relative z-[1] bg-white flex items-center gap-3 px-4 py-3.5 transition-colors duration-100"
        style={{ touchAction: 'pan-y' }}
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
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: scheme.primary }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : (
            <div className="w-7 h-7 border-2 border-gray-300 rounded-lg transition-colors duration-100" />
          )}
        </div>

        {/* Item name + note inline */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={`text-[17px] text-gray-900 flex-shrink-0 ${textClass}`}>
            {item.name}
          </span>
          {item.quantity > 1 && (
            <span className="bg-gray-200 text-gray-600 text-sm px-2.5 py-0.5 rounded-lg font-medium flex-shrink-0">
              x{item.quantity}
            </span>
          )}
          {hasNote && (
            <span className="text-[17px] text-gray-400 truncate min-w-0 mr-3">
              {item.note}
            </span>
          )}
          {/* Three-dot detail trigger */}
          <button
            type="button"
            data-nodrag
            aria-label="פתח פרטים"
            onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="ml-auto flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 active:text-gray-500"
            style={{ touchAction: 'manipulation' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
