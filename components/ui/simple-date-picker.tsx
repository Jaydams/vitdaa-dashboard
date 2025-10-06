"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SimpleDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromYear?: number;
  toYear?: number;
}

export function SimpleDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  fromYear = 2020,
  toYear = 2030,
}: SimpleDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    onChange?.(date);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-empty={!value}
          className={cn(
            "data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          disabled={(date) =>
            date.getFullYear() < fromYear || date.getFullYear() > toYear
          }
        />

        {/* Quick Actions */}
        <div className="flex gap-2 p-3 border-t bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateSelect(new Date())}
            className="flex-1 text-xs h-8"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateSelect(undefined)}
            className="flex-1 text-xs h-8"
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
