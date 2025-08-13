'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { toast } from 'sonner';
import { createReservation, getReservationVenues, getReservationTypes } from '@/actions/reservation-actions';
import { CreateReservationData } from '@/types/reservation';

interface CreateReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
}

export default function CreateReservationDialog({ open, onOpenChange, initialDate }: CreateReservationDialogProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [formData, setFormData] = useState<Partial<CreateReservationData>>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_notes: '',
    party_size: 1,
    special_requests: '',
    source: 'phone',
  });

  // Set initial date when dialog opens or initialDate changes
  useEffect(() => {
    if (open && initialDate) {
      setFormData(prev => ({
        ...prev,
        reservation_date: initialDate
      }));
    }
  }, [open, initialDate]);

  // Convert string date to Date object for DatePicker
  const getDateValue = () => {
    if (formData.reservation_date) {
      return new Date(formData.reservation_date);
    }
    return undefined;
  };

  // Load venues and types when dialog opens
  const loadData = async () => {
    try {
      const [venuesData, typesData] = await Promise.all([
        getReservationVenues(),
        getReservationTypes(),
      ]);
      setVenues(venuesData);
      setTypes(typesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.venue_id || !formData.reservation_date || !formData.start_time || !formData.end_time) {
        throw new Error('Please fill in all required fields');
      }

      await createReservation(formData as CreateReservationData);
      
      toast.success('Reservation created successfully');
      
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateReservationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Reservation</DialogTitle>
          <DialogDescription>
            Add a new reservation for your restaurant or hotel
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input
                id="customer-name"
                value={formData.customer_name || ''}
                onChange={(e) => handleInputChange('customer_name', e.target.value)}
                placeholder="Enter customer name"
                required
              />
            </div>

            {/* Customer Phone */}
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Customer Phone *</Label>
              <Input
                id="customer-phone"
                value={formData.customer_phone || ''}
                onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                placeholder="Enter phone number"
                required
              />
            </div>

            {/* Customer Email */}
            <div className="space-y-2">
              <Label htmlFor="customer-email">Customer Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={formData.customer_email || ''}
                onChange={(e) => handleInputChange('customer_email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            {/* Party Size */}
            <div className="space-y-2">
              <Label htmlFor="party-size">Party Size *</Label>
              <Input
                id="party-size"
                type="number"
                min="1"
                value={formData.party_size || ''}
                onChange={(e) => handleInputChange('party_size', parseInt(e.target.value))}
                placeholder="Number of guests"
                required
              />
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label htmlFor="venue">Venue *</Label>
              <Select
                value={formData.venue_id || ''}
                onValueChange={(value) => handleInputChange('venue_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name} ({venue.capacity} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reservation Type */}
            <div className="space-y-2">
              <Label htmlFor="reservation-type">Reservation Type</Label>
              <Select
                value={formData.reservation_type_id || ''}
                onValueChange={(value) => handleInputChange('reservation_type_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="reservation-date">Date *</Label>
              <DatePicker
                value={getDateValue()}
                onChange={(date) => handleInputChange('reservation_date', date ? date.toISOString().split('T')[0] : undefined)}
                placeholder="Select date"
              />
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source || 'phone'}
                onValueChange={(value) => handleInputChange('source', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="third_party">Third Party</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time *</Label>
              <TimePicker
                value={formData.start_time}
                onChange={(time) => handleInputChange('start_time', time)}
                placeholder="Select start time"
              />
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time *</Label>
              <TimePicker
                value={formData.end_time}
                onChange={(time) => handleInputChange('end_time', time)}
                placeholder="Select end time"
              />
            </div>
          </div>

          {/* Customer Notes */}
          <div className="space-y-2">
            <Label htmlFor="customer-notes">Customer Notes</Label>
            <Textarea
              id="customer-notes"
              value={formData.customer_notes || ''}
              onChange={(e) => handleInputChange('customer_notes', e.target.value)}
              placeholder="Any special requests or notes"
              rows={3}
            />
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <Label htmlFor="special-requests">Special Requests</Label>
            <Textarea
              id="special-requests"
              value={formData.special_requests || ''}
              onChange={(e) => handleInputChange('special_requests', e.target.value)}
              placeholder="Any special requests for this reservation"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Reservation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
