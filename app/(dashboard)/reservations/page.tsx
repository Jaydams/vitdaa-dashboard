import { Suspense } from 'react';
import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users, TrendingUp, Clock } from 'lucide-react';
import { getReservationStats, getReservations } from '@/actions/reservation-actions';
import { formatAmount } from '@/helpers/formatAmount';
import ReservationStats from './_components/ReservationStats';
import ReservationFilters from './_components/ReservationFilters';
import ReservationsTable from './_components/ReservationsTable';
import CreateReservationButton from './_components/CreateReservationButton';

export const metadata: Metadata = {
  title: 'Reservations | Dashboard',
  description: 'Manage restaurant and hotel reservations',
};

export default async function ReservationsPage() {
  const stats = await getReservationStats();
  const reservations = await getReservations();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground">
            Manage your restaurant and hotel reservations
          </p>
        </div>
        <CreateReservationButton />
      </div>

      {/* Stats Cards */}
      <ReservationStats stats={stats} />

      {/* Filters and Table */}
      <div className="space-y-4">
        <ReservationFilters />
        <Suspense fallback={<div>Loading reservations...</div>}>
          <ReservationsTable initialReservations={reservations} />
        </Suspense>
      </div>
    </div>
  );
}
