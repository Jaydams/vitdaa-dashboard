"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PinInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  onComplete?: (pin: string) => void;
  length?: number;
}

const PinInput = React.forwardRef<HTMLInputElement, PinInputProps>(
  ({ className, onComplete, length = 8, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value.replace(/\D/g, ""); // Only allow digits

      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: newValue },
        };
        onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
      }

      if (onComplete && newValue.length >= 4 && newValue.length <= length) {
        onComplete(newValue);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow only numbers, backspace, delete, tab, escape, enter
      if (
        !/[0-9]/.test(e.key) &&
        ![
          "Backspace",
          "Delete",
          "Tab",
          "Escape",
          "Enter",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.key)
      ) {
        e.preventDefault();
      }

      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      e.currentTarget.focus();
      e.currentTarget.select();

      if (props.onClick) {
        props.onClick(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();

      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    return (
      <input
        ref={ref}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={handleFocus}
        className={cn(
          "flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg tracking-widest ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-text",
          className
        )}
        style={{
          pointerEvents: "auto",
          zIndex: 10,
          position: "relative",
        }}
        {...props}
      />
    );
  }
);

PinInput.displayName = "PinInput";

export { PinInput };
