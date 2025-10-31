"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  className?: string;
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function DatePicker({
  className,
  date: externalDate,
  onDateChange,
  placeholder = "Pick a date",
}: Props) {
  const [internalDate, setInternalDate] = useState<Date>();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const date = externalDate !== undefined ? externalDate : internalDate;
  const setDate = onDateChange || setInternalDate;

  const handleMonthChange = (monthIndex: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(parseInt(monthIndex));
    setCurrentMonth(newMonth);
  };

  const handleYearChange = (year: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(parseInt(year));
    setCurrentMonth(newMonth);
  };

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  // Generate year options (current year ± 10 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: 21 },
    (_, i) => currentYear - 10 + i
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full h-12 justify-between text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          {date ? format(date, "PPP") : <span>{placeholder}</span>}

          <CalendarIcon className="ml-2 size-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <div className="p-3">
          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Select
                value={currentMonth.getMonth().toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={currentMonth.getFullYear().toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar */}
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            initialFocus
            classNames={{
              nav: "hidden", // Hide default navigation since we have our own
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
