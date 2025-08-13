import { Metadata } from 'next';
import { getReservationVenues } from '@/actions/reservation-actions';
import VenuesTable from '../_components/VenuesTable';
import CreateVenueButton from '../_components/CreateVenueButton';

export const metadata: Metadata = {
  title: 'Reservation Venues | Dashboard',
  description: 'Manage reservation venues and settings',
};

export default async function VenuesPage() {
  const venues = await getReservationVenues();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venues</h1>
          <p className="text-muted-foreground">
            Manage your reservation venues and settings
          </p>
        </div>
        <CreateVenueButton />
      </div>

      {/* Venues Table */}
      <VenuesTable initialVenues={venues} />
    </div>
  );
}
