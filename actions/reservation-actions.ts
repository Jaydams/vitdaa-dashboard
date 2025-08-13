'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { 
  CreateReservationData, 
  UpdateReservationData, 
  ReservationFilters,
  ReservationStats,
  AvailableTimeSlot,
  VenueAvailability
} from '@/types/reservation';

export async function getReservations(filters?: ReservationFilters) {
  const supabase = await createClient();

  let query = supabase
    .from('reservations')
    .select(`
      *,
      venue:reservation_venues(*),
      reservation_type:reservation_types(*),
      customer:customers(*),
      created_by_staff:staff(*)
    `)
    .order('reservation_date', { ascending: false });

  if (filters) {
    if (filters.date_from) {
      query = query.gte('reservation_date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('reservation_date', filters.date_to);
    }
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters.venue_id) {
      query = query.eq('venue_id', filters.venue_id);
    }
    if (filters.reservation_type_id) {
      query = query.eq('reservation_type_id', filters.reservation_type_id);
    }
    if (filters.customer_name) {
      query = query.ilike('customer_name', `%${filters.customer_name}%`);
    }
    if (filters.customer_phone) {
      query = query.ilike('customer_phone', `%${filters.customer_phone}%`);
    }
    if (filters.party_size_min) {
      query = query.gte('party_size', filters.party_size_min);
    }
    if (filters.party_size_max) {
      query = query.lte('party_size', filters.party_size_max);
    }
    if (filters.source && filters.source.length > 0) {
      query = query.in('source', filters.source);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch reservations: ${error.message}`);
  }

  return data;
}

export async function getReservationById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      venue:reservation_venues(*),
      reservation_type:reservation_types(*),
      customer:customers(*),
      created_by_staff:staff(*),
      reservation_service_items(
        *,
        service:reservation_services(*)
      ),
      reservation_notes(
        *,
        staff(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch reservation: ${error.message}`);
  }

  return data;
}

export async function createReservation(data: CreateReservationData) {
  const supabase = await createClient();

  // Get current user's business_id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: businessOwner } = await supabase
    .from('business_owner')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!businessOwner) {
    throw new Error('Business owner not found');
  }

  // Check for conflicts
  const { data: conflicts } = await supabase
    .rpc('check_reservation_conflict', {
      p_venue_id: data.venue_id,
      p_reservation_date: data.reservation_date,
      p_start_time: data.start_time,
      p_end_time: data.end_time
    });

  if (conflicts) {
    throw new Error('Reservation time slot is not available');
  }

  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      ...data,
      business_id: businessOwner.id,
      created_by: user.id,
      status: 'confirmed'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create reservation: ${error.message}`);
  }

  revalidatePath('/reservations');
  return reservation;
}

export async function updateReservation(id: string, data: UpdateReservationData) {
  const supabase = await createClient();

  // Check for conflicts if time/date is being updated
  if (data.reservation_date || data.start_time || data.end_time || data.venue_id) {
    const currentReservation = await getReservationById(id);
    
    const { data: conflicts } = await supabase
      .rpc('check_reservation_conflict', {
        p_venue_id: data.venue_id || currentReservation.venue_id,
        p_reservation_date: data.reservation_date || currentReservation.reservation_date,
        p_start_time: data.start_time || currentReservation.start_time,
        p_end_time: data.end_time || currentReservation.end_time,
        p_exclude_reservation_id: id
      });

    if (conflicts) {
      throw new Error('Reservation time slot is not available');
    }
  }

  const { data: reservation, error } = await supabase
    .from('reservations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update reservation: ${error.message}`);
  }

  revalidatePath('/reservations');
  return reservation;
}

export async function deleteReservation(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete reservation: ${error.message}`);
  }

  revalidatePath('/reservations');
}

export async function updateReservationStatus(id: string, status: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('update_reservation_status', {
      p_reservation_id: id,
      p_new_status: status
    });

  if (error) {
    throw new Error(`Failed to update reservation status: ${error.message}`);
  }

  revalidatePath('/reservations');
  return data;
}

export async function getReservationTypes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reservation_types')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch reservation types: ${error.message}`);
  }

  return data;
}

export async function getReservationVenues() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reservation_venues')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch reservation venues: ${error.message}`);
  }

  return data;
}

export async function getAvailableTimeSlots(venueId: string, date: string): Promise<AvailableTimeSlot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('get_available_time_slots', {
      p_venue_id: venueId,
      p_reservation_date: date
    });

  if (error) {
    throw new Error(`Failed to fetch available time slots: ${error.message}`);
  }

  return data || [];
}

export async function getVenueAvailability(venueId: string, date: string): Promise<VenueAvailability> {
  const supabase = await createClient();

  // Get venue details
  const { data: venue } = await supabase
    .from('reservation_venues')
    .select('name')
    .eq('id', venueId)
    .single();

  // Get available time slots
  const timeSlots = await getAvailableTimeSlots(venueId, date);

  return {
    venue_id: venueId,
    venue_name: venue?.name || '',
    date,
    time_slots: timeSlots
  };
}

export async function getReservationStats(): Promise<ReservationStats> {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Get total reservations
  const { data: totalReservations } = await supabase
    .from('reservations')
    .select('*', { count: 'exact' });

  // Get today's reservations
  const { data: todayReservations } = await supabase
    .from('reservations')
    .select('*')
    .eq('reservation_date', today);

  // Get upcoming reservations
  const { data: upcomingReservations } = await supabase
    .from('reservations')
    .select('*')
    .gte('reservation_date', tomorrowStr);

  // Calculate stats
  const stats: ReservationStats = {
    total_reservations: totalReservations?.length || 0,
    confirmed_reservations: totalReservations?.filter(r => r.status === 'confirmed').length || 0,
    pending_reservations: totalReservations?.filter(r => r.status === 'pending').length || 0,
    cancelled_reservations: totalReservations?.filter(r => r.status === 'cancelled').length || 0,
    no_shows: totalReservations?.filter(r => r.status === 'no_show').length || 0,
    total_revenue: 0,
    average_party_size: 0,
    today_reservations: todayReservations?.length || 0,
    upcoming_reservations: upcomingReservations?.length || 0
  };

  // Calculate revenue and average party size
  if (totalReservations) {
    const totalRevenue = totalReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const totalPartySize = totalReservations.reduce((sum, r) => sum + (r.party_size || 0), 0);
    
    stats.total_revenue = totalRevenue;
    stats.average_party_size = totalReservations.length > 0 ? totalPartySize / totalReservations.length : 0;
  }

  return stats;
}

export async function getReservationSettings() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('reservation_settings')
    .select('*')
    .eq('business_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch reservation settings: ${error.message}`);
  }

  return data;
}

export async function updateReservationSettings(settings: any) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('reservation_settings')
    .upsert({
      business_id: user.id,
      ...settings
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update reservation settings: ${error.message}`);
  }

  revalidatePath('/reservations/settings');
  return data;
}

export async function getReservationWaitlist() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reservation_waitlist')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch waitlist: ${error.message}`);
  }

  return data;
}

export async function addToWaitlist(waitlistData: any) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: businessOwner } = await supabase
    .from('business_owner')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!businessOwner) {
    throw new Error('Business owner not found');
  }

  const { data, error } = await supabase
    .from('reservation_waitlist')
    .insert({
      ...waitlistData,
      business_id: businessOwner.id
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add to waitlist: ${error.message}`);
  }

  revalidatePath('/reservations');
  return data;
}

export async function addReservationNote(reservationId: string, noteData: any) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('reservation_notes')
    .insert({
      ...noteData,
      reservation_id: reservationId,
      staff_id: user.id
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add note: ${error.message}`);
  }

  revalidatePath('/reservations');
  return data;
}
