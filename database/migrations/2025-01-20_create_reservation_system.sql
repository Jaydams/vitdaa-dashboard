-- Reservation System Migration
-- This migration creates a comprehensive reservation system for restaurants and hotels

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create reservation_types table
CREATE TABLE public.reservation_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservation_types_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_types_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id)
);

-- Create reservation_venues table (for different areas/rooms)
CREATE TABLE public.reservation_venues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  capacity integer NOT NULL,
  venue_type text NOT NULL CHECK (venue_type = ANY (ARRAY['table'::text, 'room'::text, 'hall'::text, 'outdoor'::text, 'private'::text, 'bar'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservation_venues_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_venues_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id)
);

-- Create reservation_slots table (for time slots)
CREATE TABLE public.reservation_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  venue_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  max_reservations integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservation_slots_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_slots_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id),
  CONSTRAINT reservation_slots_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.reservation_venues(id)
);

-- Create reservations table
CREATE TABLE public.reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  customer_id uuid,
  venue_id uuid NOT NULL,
  reservation_type_id uuid,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text NOT NULL,
  customer_notes text,
  reservation_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  party_size integer NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'seated'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])),
  source text DEFAULT 'phone' CHECK (source = ANY (ARRAY['phone'::text, 'online'::text, 'walk_in'::text, 'third_party'::text])),
  special_requests text,
  deposit_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservations_pkey PRIMARY KEY (id),
  CONSTRAINT reservations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id),
  CONSTRAINT reservations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT reservations_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.reservation_venues(id),
  CONSTRAINT reservations_reservation_type_id_fkey FOREIGN KEY (reservation_type_id) REFERENCES public.reservation_types(id),
  CONSTRAINT reservations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id)
);

-- Create reservation_services table (for additional services)
CREATE TABLE public.reservation_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservation_services_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_services_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id)
);

-- Create reservation_service_items table (for linking services to reservations)
CREATE TABLE public.reservation_service_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  service_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservation_service_items_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_service_items_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id),
  CONSTRAINT reservation_service_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.reservation_services(id)
);

-- Create reservation_settings table
CREATE TABLE public.reservation_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  advance_booking_days integer DEFAULT 30,
  cancellation_hours integer DEFAULT 24,
  confirmation_required boolean DEFAULT false,
  auto_confirm boolean DEFAULT true,
  allow_waitlist boolean DEFAULT true,
  max_party_size integer DEFAULT 20,
  min_party_size integer DEFAULT 1,
  deposit_required boolean DEFAULT false,
  deposit_percentage numeric DEFAULT 0,
  time_slot_duration integer DEFAULT 30, -- in minutes
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservation_settings_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_settings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id)
);

-- Create reservation_waitlist table
CREATE TABLE public.reservation_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text NOT NULL,
  party_size integer NOT NULL,
  preferred_date date NOT NULL,
  preferred_time time without time zone,
  special_requests text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status = ANY (ARRAY['waiting'::text, 'contacted'::text, 'confirmed'::text, 'cancelled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservation_waitlist_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_waitlist_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id)
);

-- Create reservation_notes table
CREATE TABLE public.reservation_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  note_type text NOT NULL CHECK (note_type = ANY (ARRAY['general'::text, 'special_request'::text, 'allergy'::text, 'preference'::text, 'issue'::text])),
  content text NOT NULL,
  is_private boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservation_notes_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_notes_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id),
  CONSTRAINT reservation_notes_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id)
);

-- Create reservation_analytics table
CREATE TABLE public.reservation_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  date date NOT NULL,
  total_reservations integer DEFAULT 0,
  confirmed_reservations integer DEFAULT 0,
  cancelled_reservations integer DEFAULT 0,
  no_shows integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  average_party_size numeric DEFAULT 0,
  peak_hours jsonb DEFAULT '{}'::jsonb,
  venue_utilization jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservation_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_analytics_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id)
);

-- Create indexes for better performance
CREATE INDEX idx_reservations_business_id ON public.reservations(business_id);
CREATE INDEX idx_reservations_date ON public.reservations(reservation_date);
CREATE INDEX idx_reservations_status ON public.reservations(status);
CREATE INDEX idx_reservations_venue_id ON public.reservations(venue_id);
CREATE INDEX idx_reservations_customer_id ON public.reservations(customer_id);
CREATE INDEX idx_reservation_venues_business_id ON public.reservation_venues(business_id);
CREATE INDEX idx_reservation_types_business_id ON public.reservation_types(business_id);
CREATE INDEX idx_reservation_slots_business_id ON public.reservation_slots(business_id);
CREATE INDEX idx_reservation_slots_venue_id ON public.reservation_slots(venue_id);

-- Create unique constraints
CREATE UNIQUE INDEX idx_reservation_settings_business_id ON public.reservation_settings(business_id);

-- Note: Default reservation types will be created per business in the application
-- This allows each business to have their own custom reservation types

-- Create RLS policies
ALTER TABLE public.reservation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reservation_types
CREATE POLICY "Users can view reservation types for their business" ON public.reservation_types
  FOR SELECT USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can insert reservation types for their business" ON public.reservation_types
  FOR INSERT WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can update reservation types for their business" ON public.reservation_types
  FOR UPDATE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can delete reservation types for their business" ON public.reservation_types
  FOR DELETE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

-- RLS Policies for reservation_venues
CREATE POLICY "Users can view reservation venues for their business" ON public.reservation_venues
  FOR SELECT USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can insert reservation venues for their business" ON public.reservation_venues
  FOR INSERT WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can update reservation venues for their business" ON public.reservation_venues
  FOR UPDATE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can delete reservation venues for their business" ON public.reservation_venues
  FOR DELETE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

-- RLS Policies for reservation_slots
CREATE POLICY "Users can view reservation slots for their business" ON public.reservation_slots
  FOR SELECT USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can insert reservation slots for their business" ON public.reservation_slots
  FOR INSERT WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can update reservation slots for their business" ON public.reservation_slots
  FOR UPDATE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can delete reservation slots for their business" ON public.reservation_slots
  FOR DELETE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

-- RLS Policies for reservations
CREATE POLICY "Users can view reservations for their business" ON public.reservations
  FOR SELECT USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can insert reservations for their business" ON public.reservations
  FOR INSERT WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can update reservations for their business" ON public.reservations
  FOR UPDATE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can delete reservations for their business" ON public.reservations
  FOR DELETE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

-- RLS Policies for reservation_services
CREATE POLICY "Users can view reservation services for their business" ON public.reservation_services
  FOR SELECT USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can insert reservation services for their business" ON public.reservation_services
  FOR INSERT WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can update reservation services for their business" ON public.reservation_services
  FOR UPDATE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can delete reservation services for their business" ON public.reservation_services
  FOR DELETE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

-- RLS Policies for reservation_service_items
CREATE POLICY "Users can view reservation service items for their business" ON public.reservation_service_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reservations 
      WHERE reservations.id = reservation_service_items.reservation_id 
      AND reservations.business_id = (auth.jwt() ->> 'business_id')::uuid
    )
  );

CREATE POLICY "Users can insert reservation service items for their business" ON public.reservation_service_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reservations 
      WHERE reservations.id = reservation_service_items.reservation_id 
      AND reservations.business_id = (auth.jwt() ->> 'business_id')::uuid
    )
  );

CREATE POLICY "Users can update reservation service items for their business" ON public.reservation_service_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.reservations 
      WHERE reservations.id = reservation_service_items.reservation_id 
      AND reservations.business_id = (auth.jwt() ->> 'business_id')::uuid
    )
  );

CREATE POLICY "Users can delete reservation service items for their business" ON public.reservation_service_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.reservations 
      WHERE reservations.id = reservation_service_items.reservation_id 
      AND reservations.business_id = (auth.jwt() ->> 'business_id')::uuid
    )
  );

-- RLS Policies for reservation_settings
CREATE POLICY "Users can view reservation settings for their business" ON public.reservation_settings
  FOR SELECT USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can insert reservation settings for their business" ON public.reservation_settings
  FOR INSERT WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can update reservation settings for their business" ON public.reservation_settings
  FOR UPDATE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can delete reservation settings for their business" ON public.reservation_settings
  FOR DELETE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

-- RLS Policies for reservation_waitlist
CREATE POLICY "Users can view reservation waitlist for their business" ON public.reservation_waitlist
  FOR SELECT USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can insert reservation waitlist for their business" ON public.reservation_waitlist
  FOR INSERT WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can update reservation waitlist for their business" ON public.reservation_waitlist
  FOR UPDATE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can delete reservation waitlist for their business" ON public.reservation_waitlist
  FOR DELETE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

-- RLS Policies for reservation_notes
CREATE POLICY "Users can view reservation notes for their business" ON public.reservation_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reservations 
      WHERE reservations.id = reservation_notes.reservation_id 
      AND reservations.business_id = (auth.jwt() ->> 'business_id')::uuid
    )
  );

CREATE POLICY "Users can insert reservation notes for their business" ON public.reservation_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reservations 
      WHERE reservations.id = reservation_notes.reservation_id 
      AND reservations.business_id = (auth.jwt() ->> 'business_id')::uuid
    )
  );

CREATE POLICY "Users can update reservation notes for their business" ON public.reservation_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.reservations 
      WHERE reservations.id = reservation_notes.reservation_id 
      AND reservations.business_id = (auth.jwt() ->> 'business_id')::uuid
    )
  );

CREATE POLICY "Users can delete reservation notes for their business" ON public.reservation_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.reservations 
      WHERE reservations.id = reservation_notes.reservation_id 
      AND reservations.business_id = (auth.jwt() ->> 'business_id')::uuid
    )
  );

-- RLS Policies for reservation_analytics
CREATE POLICY "Users can view reservation analytics for their business" ON public.reservation_analytics
  FOR SELECT USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can insert reservation analytics for their business" ON public.reservation_analytics
  FOR INSERT WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can update reservation analytics for their business" ON public.reservation_analytics
  FOR UPDATE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

CREATE POLICY "Users can delete reservation analytics for their business" ON public.reservation_analytics
  FOR DELETE USING (business_id = (auth.jwt() ->> 'business_id')::uuid);

-- Create functions for reservation management
CREATE OR REPLACE FUNCTION check_reservation_conflict(
  p_venue_id uuid,
  p_reservation_date date,
  p_start_time time,
  p_end_time time,
  p_exclude_reservation_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.reservations
    WHERE venue_id = p_venue_id
    AND reservation_date = p_reservation_date
    AND status NOT IN ('cancelled', 'no_show')
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
      OR (p_start_time < end_time AND p_end_time > start_time)
    )
    AND (p_exclude_reservation_id IS NULL OR id != p_exclude_reservation_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get available time slots
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_venue_id uuid,
  p_reservation_date date
)
RETURNS TABLE (
  start_time time,
  end_time time,
  is_available boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.start_time,
    rs.end_time,
    NOT check_reservation_conflict(p_venue_id, p_reservation_date, rs.start_time, rs.end_time) as is_available
  FROM public.reservation_slots rs
  WHERE rs.venue_id = p_venue_id
  AND rs.day_of_week = EXTRACT(DOW FROM p_reservation_date)
  AND rs.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to update reservation status
CREATE OR REPLACE FUNCTION update_reservation_status(
  p_reservation_id uuid,
  p_new_status text
)
RETURNS void AS $$
BEGIN
  UPDATE public.reservations
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_reservation_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_reservation_types_updated_at
  BEFORE UPDATE ON public.reservation_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservation_venues_updated_at
  BEFORE UPDATE ON public.reservation_venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservation_slots_updated_at
  BEFORE UPDATE ON public.reservation_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservation_services_updated_at
  BEFORE UPDATE ON public.reservation_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservation_settings_updated_at
  BEFORE UPDATE ON public.reservation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservation_waitlist_updated_at
  BEFORE UPDATE ON public.reservation_waitlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservation_analytics_updated_at
  BEFORE UPDATE ON public.reservation_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
