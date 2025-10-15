"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useResponsive } from "./ResponsiveDashboardProvider";

// Hook for swipe gestures
export function useSwipeGestures(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold: number = 50
) {
  const { isTouchDevice } = useResponsive();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTouchDevice) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isTouchDevice || !touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if it's a horizontal or vertical swipe
    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    touchStartRef.current = null;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

// Hook for long press gestures
export function useLongPress(onLongPress: () => void, delay: number = 500) {
  const { isTouchDevice } = useResponsive();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const start = () => {
    if (!isTouchDevice) return;

    isLongPressRef.current = false;
    timeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();

      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, delay);
  };

  const clear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const clickHandler = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onClick: clickHandler,
  };
}

// Hook for pinch-to-zoom gestures
export function usePinchZoom(
  onZoom: (scale: number) => void,
  minScale: number = 0.5,
  maxScale: number = 3
) {
  const { isTouchDevice } = useResponsive();
  const [scale, setScale] = useState(1);
  const lastDistanceRef = useRef<number | null>(null);

  const getDistance = (touches: React.TouchList) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTouchDevice || e.touches.length !== 2) return;

    lastDistanceRef.current = getDistance(e.touches);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchDevice || e.touches.length !== 2 || !lastDistanceRef.current)
      return;

    e.preventDefault();

    const currentDistance = getDistance(e.touches);
    const scaleChange = currentDistance / lastDistanceRef.current;
    const newScale = Math.min(
      Math.max(scale * scaleChange, minScale),
      maxScale
    );

    setScale(newScale);
    onZoom(newScale);

    lastDistanceRef.current = currentDistance;
  };

  const handleTouchEnd = () => {
    lastDistanceRef.current = null;
  };

  return {
    scale,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

// Swipeable card component for order management
interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
  };
  rightAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
  };
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
}: SwipeableCardProps) {
  const { isTouchDevice } = useResponsive();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const swipeGestures = useSwipeGestures(
    () => {
      if (onSwipeLeft) {
        onSwipeLeft();
        // Trigger haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    },
    () => {
      if (onSwipeRight) {
        onSwipeRight();
        // Trigger haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    }
  );

  if (!isTouchDevice) {
    return (
      <div className={cn("bg-card rounded-lg border shadow-sm", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left action background */}
      {leftAction && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-start pl-4",
            "transition-opacity duration-200",
            leftAction.color,
            swipeOffset > 50 ? "opacity-100" : "opacity-0"
          )}
          style={{ width: Math.max(0, swipeOffset) }}
        >
          <div className="flex items-center gap-2 text-white">
            {leftAction.icon}
            <span className="font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* Right action background */}
      {rightAction && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end pr-4",
            "transition-opacity duration-200",
            rightAction.color,
            swipeOffset < -50 ? "opacity-100" : "opacity-0"
          )}
          style={{ width: Math.max(0, -swipeOffset) }}
        >
          <div className="flex items-center gap-2 text-white">
            <span className="font-medium">{rightAction.label}</span>
            {rightAction.icon}
          </div>
        </div>
      )}

      {/* Main card content */}
      <div
        ref={cardRef}
        className={cn(
          "bg-card rounded-lg border shadow-sm transition-transform duration-200",
          isSwipeActive && "shadow-lg",
          className
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
        {...swipeGestures}
      >
        {children}
      </div>
    </div>
  );
}

// Long press context menu component
interface LongPressMenuProps {
  children: React.ReactNode;
  menuItems: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    destructive?: boolean;
  }>;
  className?: string;
}

export function LongPressMenu({
  children,
  menuItems,
  className,
}: LongPressMenuProps) {
  const { isTouchDevice } = useResponsive();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const longPressHandlers = useLongPress(() => {
    setShowMenu(true);
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setMenuPosition({
      x: touch.clientX,
      y: touch.clientY,
    });
    longPressHandlers.onTouchStart();
  };

  if (!isTouchDevice) {
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <div
        className={className}
        {...longPressHandlers}
        onTouchStart={handleTouchStart}
      >
        {children}
      </div>

      {/* Context menu overlay */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/20"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="absolute bg-white rounded-lg shadow-lg border min-w-48 py-2"
            style={{
              left: Math.min(menuPosition.x, window.innerWidth - 200),
              top: Math.min(menuPosition.y, window.innerHeight - 200),
            }}
          >
            {menuItems.map((item, index) => (
              <button
                key={index}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50",
                  "transition-colors duration-150",
                  item.destructive && "text-red-600 hover:bg-red-50"
                )}
                onClick={() => {
                  item.onClick();
                  setShowMenu(false);
                }}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Pinch-to-zoom container for table layouts
interface PinchZoomContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PinchZoomContainer({
  children,
  className,
}: PinchZoomContainerProps) {
  const { isTouchDevice } = useResponsive();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const pinchZoom = usePinchZoom((newScale) => {
    setScale(newScale);
  });

  if (!isTouchDevice) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden touch-none", className)}
      {...pinchZoom}
    >
      <div
        style={{
          transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          transformOrigin: "center center",
          transition: "transform 0.1s ease-out",
        }}
      >
        {children}
      </div>

      {/* Scale indicator */}
      {scale !== 1 && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}

// Haptic feedback utility
export const hapticFeedback = {
  light: () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  },
  heavy: () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  },
  success: () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 10, 30]);
    }
  },
  error: () => {
    if (navigator.vibrate) {
      navigator.vibrate([50, 25, 50, 25, 50]);
    }
  },
};
