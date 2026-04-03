import { useRef, useState } from 'react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;   // delete
  onSwipeRight?: () => void;  // open detail
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

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = true;
    isHorizontal.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!swiping.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determine direction on first significant movement
    if (isHorizontal.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }

    if (!isHorizontal.current) return;
    setOffset(dx);
  }

  function handleTouchEnd() {
    swiping.current = false;
    // Threshold: 80px to trigger action
    if (offset > 80 && onSwipeRight) {
      onSwipeRight();
    }
    setOffset(0);
    isHorizontal.current = null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left actions (revealed on swipe right) */}
      {leftActions && (
        <div className="absolute inset-0 flex items-stretch">
          {leftActions}
          <div className="flex-1" />
        </div>
      )}
      {/* Right actions (revealed on swipe left) */}
      {rightActions && (
        <div className="absolute inset-0 flex items-stretch">
          <div className="flex-1" />
          {rightActions}
        </div>
      )}
      {/* Content */}
      <div
        className="relative bg-gray-50 transition-transform"
        style={{
          transform: offset !== 0 ? `translateX(${offset}px)` : undefined,
          transition: swiping.current ? 'none' : 'transform 0.2s ease-out',
          touchAction: 'pan-y',
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
