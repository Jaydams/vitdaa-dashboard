import { Metadata } from 'next';
import { getReservations } from '@/actions/reservation-actions';
import ReservationCalendar from '../_components/ReservationCalendar';

export const metadata: Metadata = {
  title: 'Reservation Calendar | Dashboard',
  description: 'View reservations in calendar format',
};

export default async function ReservationCalendarPage() {
  const reservations = await getReservations();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reservation Calendar</h1>
        <p className="text-muted-foreground">
          View and manage your reservations in calendar format
        </p>
      </div>

      {/* Calendar */}
      <ReservationCalendar reservations={reservations} />
    </div>
  );
}
