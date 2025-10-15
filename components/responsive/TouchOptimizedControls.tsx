"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResponsive } from "./ResponsiveDashboardProvider";

// Touch-optimized button with minimum 44px touch target
interface TouchButtonProps extends ButtonProps {
  touchOptimized?: boolean;
}

export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ className, touchOptimized = true, size, ...props }, ref) => {
    const { isTouchDevice, isMobile } = useResponsive();

    const shouldOptimize = touchOptimized && (isTouchDevice || isMobile);

    return (
      <Button
        ref={ref}
        size={shouldOptimize ? "lg" : size}
        className={cn(
          // Ensure minimum touch target size (44px)
          shouldOptimize && [
            "min-h-[44px] min-w-[44px]",
            "touch-manipulation", // Optimize for touch
            "select-none", // Prevent text selection on touch
          ],
          // Enhanced spacing for touch
          shouldOptimize && "px-6 py-3",
          className
        )}
        {...props}
      />
    );
  }
);
TouchButton.displayName = "TouchButton";

// Touch-optimized input with larger touch targets
interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  touchOptimized?: boolean;
}

export const TouchInput = forwardRef<HTMLInputElement, TouchInputProps>(
  ({ className, touchOptimized = true, ...props }, ref) => {
    const { isTouchDevice, isMobile } = useResponsive();

    const shouldOptimize = touchOptimized && (isTouchDevice || isMobile);

    return (
      <Input
        ref={ref}
        className={cn(
          // Larger touch targets
          shouldOptimize && [
            "min-h-[44px]",
            "text-base", // Prevent zoom on iOS
            "touch-manipulation",
          ],
          // Enhanced padding for touch
          shouldOptimize && "px-4 py-3",
          className
        )}
        {...props}
      />
    );
  }
);
TouchInput.displayName = "TouchInput";

// Touch-optimized card with better spacing
interface TouchCardProps {
  children: React.ReactNode;
  className?: string;
  touchOptimized?: boolean;
  onClick?: () => void;
}

export function TouchCard({
  children,
  className,
  touchOptimized = true,
  onClick,
}: TouchCardProps) {
  const { isTouchDevice, isMobile } = useResponsive();

  const shouldOptimize = touchOptimized && (isTouchDevice || isMobile);

  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-lg border shadow-sm",
        // Enhanced touch spacing
        shouldOptimize ? "p-6" : "p-4",
        // Touch interaction styles
        shouldOptimize && [
          "touch-manipulation",
          "select-none",
          onClick && "cursor-pointer active:scale-[0.98] transition-transform",
        ],
        // Larger minimum touch area
        shouldOptimize && onClick && "min-h-[44px]",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Touch-optimized list item
interface TouchListItemProps {
  children: React.ReactNode;
  className?: string;
  onTap?: () => void;
  selected?: boolean;
}

export function TouchListItem({
  children,
  className,
  onTap,
  selected = false,
}: TouchListItemProps) {
  const { isTouchDevice, isMobile } = useResponsive();

  const shouldOptimize = isTouchDevice || isMobile;

  return (
    <div
      className={cn(
        "flex items-center rounded-lg transition-colors",
        // Enhanced touch spacing
        shouldOptimize ? "p-4 min-h-[56px]" : "p-3 min-h-[44px]",
        // Touch interaction styles
        shouldOptimize && [
          "touch-manipulation",
          "select-none",
          onTap && "cursor-pointer active:bg-accent/50",
        ],
        // Selection state
        selected && "bg-accent text-accent-foreground",
        // Hover states (only on non-touch devices)
        !shouldOptimize && onTap && "hover:bg-accent/50",
        className
      )}
      onClick={onTap}
    >
      {children}
    </div>
  );
}

// Touch-optimized tab component
interface TouchTabProps {
  children: React.ReactNode;
  active?: boolean;
  onTap?: () => void;
  className?: string;
}

export function TouchTab({
  children,
  active = false,
  onTap,
  className,
}: TouchTabProps) {
  const { isTouchDevice, isMobile } = useResponsive();

  const shouldOptimize = isTouchDevice || isMobile;

  return (
    <button
      className={cn(
        "flex items-center justify-center rounded-lg font-medium transition-colors",
        // Enhanced touch spacing
        shouldOptimize ? "px-6 py-4 min-h-[48px]" : "px-4 py-2 min-h-[40px]",
        // Touch interaction styles
        shouldOptimize && [
          "touch-manipulation",
          "select-none",
          "active:scale-[0.98] transition-transform",
        ],
        // Active state
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
        className
      )}
      onClick={onTap}
    >
      {children}
    </button>
  );
}

// Touch-optimized icon button
interface TouchIconButtonProps {
  children: React.ReactNode;
  onTap?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function TouchIconButton({
  children,
  onTap,
  className,
  size = "md",
}: TouchIconButtonProps) {
  const { isTouchDevice, isMobile } = useResponsive();

  const shouldOptimize = isTouchDevice || isMobile;

  const sizeClasses = {
    sm: shouldOptimize ? "h-10 w-10" : "h-8 w-8",
    md: shouldOptimize ? "h-12 w-12" : "h-10 w-10",
    lg: shouldOptimize ? "h-14 w-14" : "h-12 w-12",
  };

  return (
    <button
      className={cn(
        "flex items-center justify-center rounded-lg transition-colors",
        "bg-background border hover:bg-accent hover:text-accent-foreground",
        // Size based on touch optimization
        sizeClasses[size],
        // Touch interaction styles
        shouldOptimize && [
          "touch-manipulation",
          "select-none",
          "active:scale-[0.95] transition-transform",
        ],
        className
      )}
      onClick={onTap}
    >
      {children}
    </button>
  );
}
