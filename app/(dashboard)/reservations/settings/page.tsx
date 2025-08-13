import { Metadata } from 'next';
import { getReservationSettings } from '@/actions/reservation-actions';
import ReservationSettingsForm from '../_components/ReservationSettingsForm';

export const metadata: Metadata = {
  title: 'Reservation Settings | Dashboard',
  description: 'Configure reservation system settings',
};

export default async function ReservationSettingsPage() {
  const settings = await getReservationSettings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reservation Settings</h1>
        <p className="text-muted-foreground">
          Configure your reservation system settings and preferences
        </p>
      </div>

      {/* Settings Form */}
      <ReservationSettingsForm initialSettings={settings} />
    </div>
  );
}
