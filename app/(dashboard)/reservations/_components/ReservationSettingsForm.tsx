'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { updateReservationSettings } from '@/actions/reservation-actions';
import { ReservationSettings } from '@/types/reservation';

interface ReservationSettingsFormProps {
  initialSettings?: ReservationSettings;
}

export default function ReservationSettingsForm({ initialSettings }: ReservationSettingsFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Partial<ReservationSettings>>(
    initialSettings || {
      advance_booking_days: 30,
      cancellation_hours: 24,
      confirmation_required: false,
      auto_confirm: true,
      allow_waitlist: true,
      max_party_size: 20,
      min_party_size: 1,
      deposit_required: false,
      deposit_percentage: 0,
      time_slot_duration: 30,
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateReservationSettings(settings);
      toast.success('Settings updated successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ReservationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Advance Booking Days */}
            <div className="space-y-2">
              <Label htmlFor="advance-booking-days">Advance Booking Days</Label>
              <Input
                id="advance-booking-days"
                type="number"
                min="1"
                max="365"
                value={settings.advance_booking_days || 30}
                onChange={(e) => handleInputChange('advance_booking_days', parseInt(e.target.value))}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                How many days in advance customers can book
              </p>
            </div>

            {/* Cancellation Hours */}
            <div className="space-y-2">
              <Label htmlFor="cancellation-hours">Cancellation Hours</Label>
              <Input
                id="cancellation-hours"
                type="number"
                min="0"
                max="168"
                value={settings.cancellation_hours || 24}
                onChange={(e) => handleInputChange('cancellation_hours', parseInt(e.target.value))}
                placeholder="24"
              />
              <p className="text-xs text-muted-foreground">
                Hours before reservation when cancellation is allowed
              </p>
            </div>

            {/* Min Party Size */}
            <div className="space-y-2">
              <Label htmlFor="min-party-size">Minimum Party Size</Label>
              <Input
                id="min-party-size"
                type="number"
                min="1"
                value={settings.min_party_size || 1}
                onChange={(e) => handleInputChange('min_party_size', parseInt(e.target.value))}
                placeholder="1"
              />
            </div>

            {/* Max Party Size */}
            <div className="space-y-2">
              <Label htmlFor="max-party-size">Maximum Party Size</Label>
              <Input
                id="max-party-size"
                type="number"
                min="1"
                value={settings.max_party_size || 20}
                onChange={(e) => handleInputChange('max_party_size', parseInt(e.target.value))}
                placeholder="20"
              />
            </div>

            {/* Time Slot Duration */}
            <div className="space-y-2">
              <Label htmlFor="time-slot-duration">Time Slot Duration (minutes)</Label>
              <Input
                id="time-slot-duration"
                type="number"
                min="15"
                max="120"
                step="15"
                value={settings.time_slot_duration || 30}
                onChange={(e) => handleInputChange('time_slot_duration', parseInt(e.target.value))}
                placeholder="30"
              />
            </div>

            {/* Deposit Percentage */}
            <div className="space-y-2">
              <Label htmlFor="deposit-percentage">Deposit Percentage</Label>
              <Input
                id="deposit-percentage"
                type="number"
                min="0"
                max="100"
                value={settings.deposit_percentage || 0}
                onChange={(e) => handleInputChange('deposit_percentage', parseFloat(e.target.value))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Percentage of total amount required as deposit
              </p>
            </div>
          </div>

          {/* Toggle Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Preferences</h3>
            
            <div className="space-y-4">
              {/* Auto Confirm */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Confirm Reservations</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically confirm reservations without manual approval
                  </p>
                </div>
                <Switch
                  checked={settings.auto_confirm || false}
                  onCheckedChange={(checked) => handleInputChange('auto_confirm', checked)}
                />
              </div>

              {/* Confirmation Required */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Confirmation</Label>
                  <p className="text-sm text-muted-foreground">
                    Require manual confirmation for all reservations
                  </p>
                </div>
                <Switch
                  checked={settings.confirmation_required || false}
                  onCheckedChange={(checked) => handleInputChange('confirmation_required', checked)}
                />
              </div>

              {/* Allow Waitlist */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Waitlist</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to join waitlist when venue is full
                  </p>
                </div>
                <Switch
                  checked={settings.allow_waitlist || false}
                  onCheckedChange={(checked) => handleInputChange('allow_waitlist', checked)}
                />
              </div>

              {/* Deposit Required */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Deposit</Label>
                  <p className="text-sm text-muted-foreground">
                    Require deposit payment for reservations
                  </p>
                </div>
                <Switch
                  checked={settings.deposit_required || false}
                  onCheckedChange={(checked) => handleInputChange('deposit_required', checked)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
