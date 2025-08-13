export interface ReservationType {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReservationVenue {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  capacity: number;
  venue_type: 'table' | 'room' | 'hall' | 'outdoor' | 'private' | 'bar';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReservationSlot {
  id: string;
  business_id: string;
  venue_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string;
  end_time: string;
  max_reservations: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  business_id: string;
  customer_id?: string;
  venue_id: string;
  reservation_type_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  customer_notes?: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  source: 'phone' | 'online' | 'walk_in' | 'third_party';
  special_requests?: string;
  deposit_amount: number;
  total_amount: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  venue?: ReservationVenue;
  reservation_type?: ReservationType;
  customer?: Customer;
  created_by_staff?: Staff;
}

export interface ReservationService {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReservationServiceItem {
  id: string;
  reservation_id: string;
  service_id: string;
  quantity: number;
  price: number;
  notes?: string;
  created_at: string;
  
  // Joined data
  service?: ReservationService;
}

export interface ReservationSettings {
  id: string;
  business_id: string;
  advance_booking_days: number;
  cancellation_hours: number;
  confirmation_required: boolean;
  auto_confirm: boolean;
  allow_waitlist: boolean;
  max_party_size: number;
  min_party_size: number;
  deposit_required: boolean;
  deposit_percentage: number;
  time_slot_duration: number; // in minutes
  created_at: string;
  updated_at: string;
}

export interface ReservationWaitlist {
  id: string;
  business_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  party_size: number;
  preferred_date: string;
  preferred_time?: string;
  special_requests?: string;
  status: 'waiting' | 'contacted' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ReservationNote {
  id: string;
  reservation_id: string;
  staff_id: string;
  note_type: 'general' | 'special_request' | 'allergy' | 'preference' | 'issue';
  content: string;
  is_private: boolean;
  created_at: string;
  
  // Joined data
  staff?: Staff;
}

export interface ReservationAnalytics {
  id: string;
  business_id: string;
  date: string;
  total_reservations: number;
  confirmed_reservations: number;
  cancelled_reservations: number;
  no_shows: number;
  total_revenue: number;
  average_party_size: number;
  peak_hours: Record<string, any>;
  venue_utilization: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AvailableTimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface CreateReservationData {
  customer_id?: string;
  venue_id: string;
  reservation_type_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  customer_notes?: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  source?: 'phone' | 'online' | 'walk_in' | 'third_party';
  special_requests?: string;
  deposit_amount?: number;
  total_amount?: number;
}

export interface UpdateReservationData {
  customer_id?: string;
  venue_id?: string;
  reservation_type_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_notes?: string;
  reservation_date?: string;
  start_time?: string;
  end_time?: string;
  party_size?: number;
  status?: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  special_requests?: string;
  deposit_amount?: number;
  total_amount?: number;
}

export interface ReservationFilters {
  date_from?: string;
  date_to?: string;
  status?: string[];
  venue_id?: string;
  reservation_type_id?: string;
  customer_name?: string;
  customer_phone?: string;
  party_size_min?: number;
  party_size_max?: number;
  source?: string[];
}

export interface ReservationStats {
  total_reservations: number;
  confirmed_reservations: number;
  pending_reservations: number;
  cancelled_reservations: number;
  no_shows: number;
  total_revenue: number;
  average_party_size: number;
  today_reservations: number;
  upcoming_reservations: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  reservation: Reservation;
}

export interface VenueAvailability {
  venue_id: string;
  venue_name: string;
  date: string;
  time_slots: AvailableTimeSlot[];
}
