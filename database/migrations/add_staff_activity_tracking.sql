-- Staff Activity Tracking System Migration
-- This migration adds tables for tracking staff activities and session monitoring

-- Staff Activity Logs table for tracking all staff actions
CREATE TABLE public.staff_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  session_id uuid,
  action text NOT NULL,
  performed_by uuid NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT staff_activity_logs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE,
  CONSTRAINT staff_activity_logs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT staff_activity_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.staff_sessions(id) ON DELETE SET NULL,
  CONSTRAINT staff_activity_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id)
);

-- Staff Session Activity table for tracking session-specific metrics
CREATE TABLE public.staff_session_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  business_id uuid NOT NULL,
  page_visits integer DEFAULT 0,
  actions_performed integer DEFAULT 0,
  last_activity_at timestamp with time zone DEFAULT now(),
  idle_time_minutes integer DEFAULT 0,
  total_session_duration_minutes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_session_activity_pkey PRIMARY KEY (id),
  CONSTRAINT staff_session_activity_session_id_key UNIQUE (session_id),
  CONSTRAINT staff_session_activity_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.staff_sessions(id) ON DELETE CASCADE,
  CONSTRAINT staff_session_activity_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
  CONSTRAINT staff_session_activity_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX idx_staff_activity_logs_business_id ON public.staff_activity_logs(business_id);
CREATE INDEX idx_staff_activity_logs_staff_id ON public.staff_activity_logs(staff_id);
CREATE INDEX idx_staff_activity_logs_session_id ON public.staff_activity_logs(session_id);
CREATE INDEX idx_staff_activity_logs_created_at ON public.staff_activity_logs(created_at);
CREATE INDEX idx_staff_activity_logs_action ON public.staff_activity_logs(action);

CREATE INDEX idx_staff_session_activity_session_id ON public.staff_session_activity(session_id);
CREATE INDEX idx_staff_session_activity_staff_id ON public.staff_session_activity(staff_id);
CREATE INDEX idx_staff_session_activity_business_id ON public.staff_session_activity(business_id);
CREATE INDEX idx_staff_session_activity_last_activity ON public.staff_session_activity(last_activity_at);

-- Function to automatically create session activity record when a staff session is created
CREATE OR REPLACE FUNCTION create_staff_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_session_activity (
    session_id,
    staff_id,
    business_id,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.staff_id,
    NEW.business_id,
    NEW.signed_in_at,
    NEW.signed_in_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create session activity record
CREATE TRIGGER trigger_create_staff_session_activity
  AFTER INSERT ON public.staff_sessions
  FOR EACH ROW
  EXECUTE FUNCTION create_staff_session_activity();

-- Function to update session duration when session is terminated
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if session is being marked as inactive
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE public.staff_session_activity
    SET 
      total_session_duration_minutes = EXTRACT(EPOCH FROM (NEW.signed_out_at - OLD.signed_in_at)) / 60,
      updated_at = NEW.signed_out_at
    WHERE session_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session duration on termination
CREATE TRIGGER trigger_update_session_duration
  AFTER UPDATE ON public.staff_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_duration();