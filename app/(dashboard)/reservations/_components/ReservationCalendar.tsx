'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Reservation, CalendarEvent } from '@/types/reservation';
import { formatAmount } from '@/helpers/formatAmount';
import CreateReservationDialog from './CreateReservationDialog';

interface ReservationCalendarProps {
  reservations: Reservation[];
}

export default function ReservationCalendar({ reservations }: ReservationCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Generate calendar events from reservations
  const calendarEvents = useMemo(() => {
    return reservations.map(reservation => ({
      id: reservation.id,
      title: `${reservation.customer_name} (${reservation.party_size})`,
      start: `${reservation.reservation_date}T${reservation.start_time}`,
      end: `${reservation.reservation_date}T${reservation.end_time}`,
      color: getStatusColor(reservation.status),
      reservation,
    })) as CalendarEvent[];
  }, [reservations]);

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      const dateStr = current.toISOString().split('T')[0];
      const dayEvents = calendarEvents.filter(event => 
        event.start.startsWith(dateStr)
      );

      days.push({
        date: new Date(current),
        dateStr,
        events: dayEvents,
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, calendarEvents]);

  const getStatusColor = (status: string) => {
    const colors = {
      pending: '#F59E0B',
      confirmed: '#10B981',
      seated: '#3B82F6',
      completed: '#6B7280',
      cancelled: '#EF4444',
      no_show: '#F97316',
    };
    return colors[status as keyof typeof colors] || '#6B7280';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    router.push(`/reservations/${event.reservation.id}`);
  };

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={() => {
              setSelectedDate('');
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarData.map((day, index) => (
            <div
              key={index}
              className={`
                min-h-[120px] p-2 border border-border rounded-md
                ${!day.isCurrentMonth ? 'bg-muted/50' : 'bg-background'}
                ${day.isToday ? 'ring-2 ring-primary' : ''}
                hover:bg-muted/50 cursor-pointer transition-colors
                group
              `}
              onClick={() => handleDateClick(day.dateStr)}
              title={`Click to add reservation for ${day.date.toLocaleDateString()}`}
            >
                              <div className="flex items-center justify-between mb-1">
                  <span className={`
                    text-sm font-medium
                    ${!day.isCurrentMonth ? 'text-muted-foreground' : 'text-foreground'}
                    ${day.isToday ? 'text-primary font-bold' : ''}
                    group-hover:text-primary
                  `}>
                    {day.date.getDate()}
                  </span>
                  <div className="flex items-center gap-1">
                    {day.events.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {day.events.length}
                      </Badge>
                    )}
                    <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

              {/* Events */}
              <div className="space-y-1">
                {day.events.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: event.color + '20', color: event.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="text-xs opacity-75">
                      {formatTime(event.reservation.start_time)}
                    </div>
                  </div>
                ))}
                {day.events.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{day.events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Status Legend</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { status: 'pending', label: 'Pending', color: '#F59E0B' },
              { status: 'confirmed', label: 'Confirmed', color: '#10B981' },
              { status: 'seated', label: 'Seated', color: '#3B82F6' },
              { status: 'completed', label: 'Completed', color: '#6B7280' },
              { status: 'cancelled', label: 'Cancelled', color: '#EF4444' },
              { status: 'no_show', label: 'No Show', color: '#F97316' },
            ].map(({ status, label, color }) => (
              <div key={status} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      
      {/* Reservation Dialog */}
      <CreateReservationDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        initialDate={selectedDate}
      />
    </Card>
  );
}
