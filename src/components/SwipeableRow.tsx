import { useRef, useState, useCallback } from 'react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onCheck?: () => void;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export function SwipeableRow({
  children,
  onSwipeRight,
  leftActions,
  rightActions,
}: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = true;
    isHorizontal.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (isHorizontal.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }

    if (isHorizontal.current === false) return;
    if (isHorizontal.current === true) {
      e.preventDefault();
      e.stopPropagation();
      setOffset(dx);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    swiping.current = false;
    if (offset > 80 && onSwipeRight) {
      onSwipeRight();
    }
    setOffset(0);
    isHorizontal.current = null;
  }, [offset, onSwipeRight]);

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}
    >
      {leftActions && (
        <div className="absolute inset-0 flex items-stretch">
          {leftActions}
          <div className="flex-1" />
        </div>
      )}
      {rightActions && (
        <div className="absolute inset-0 flex items-stretch">
          <div className="flex-1" />
          {rightActions}
        </div>
      )}
      <div
        ref={contentRef}
        className="relative bg-gray-50"
        style={{
          transform: offset !== 0 ? `translateX(${offset}px)` : 'translateX(0)',
          transition: swiping.current ? 'none' : 'transform 0.2s ease-out',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
