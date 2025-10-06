"use client";

import * as React from "react";
import { format, addMonths, subMonths, addYears, subYears } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AdvancedDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromYear?: number;
  toYear?: number;
}

export function AdvancedDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  fromYear = 2020,
  toYear = 2030,
}: AdvancedDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(value || new Date());

  const handleDateSelect = (date: Date | undefined) => {
    onChange?.(date);
    setIsOpen(false);
  };

  const handlePreviousYear = () => {
    setMonth((prev) => subYears(prev, 1));
  };

  const handleNextYear = () => {
    setMonth((prev) => addYears(prev, 1));
  };

  const handlePreviousMonth = () => {
    setMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setMonth((prev) => addMonths(prev, 1));
  };

  const canGoPreviousYear = month.getFullYear() > fromYear;
  const canGoNextYear = month.getFullYear() < toYear;

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
        {/* Clean Navigation Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/20">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousYear}
              disabled={!canGoPreviousYear}
              className="h-8 w-8 p-0 hover:bg-muted"
              title="Previous year"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousMonth}
              className="h-8 w-8 p-0 hover:bg-muted"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="font-semibold text-sm px-2">
            {format(month, "MMMM yyyy")}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="h-8 w-8 p-0 hover:bg-muted"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextYear}
              disabled={!canGoNextYear}
              className="h-8 w-8 p-0 hover:bg-muted"
              title="Next year"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar */}
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          month={month}
          onMonthChange={setMonth}
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
