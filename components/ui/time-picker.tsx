"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TimePickerProps {
  value?: string
  onChange?: (time: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
  className,
}: TimePickerProps) {
  const [time, setTime] = React.useState(value || "")

  React.useEffect(() => {
    setTime(value || "")
  }, [value])

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    onChange?.(newTime || undefined)
  }

  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-empty={!time}
          className={cn(
            "data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {time ? time : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          <Label htmlFor="time-input">Time</Label>
          <Input
            id="time-input"
            type="time"
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="mt-2"
          />
          <div className="mt-4 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1">
              {timeOptions.map((option) => (
                <Button
                  key={option}
                  variant={time === option ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleTimeChange(option)}
                  className="justify-start"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
