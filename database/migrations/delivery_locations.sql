create table public.delivery_locations (
  id uuid not null default gen_random_uuid (),
  business_id uuid null,
  name text not null,
  price integer not null,
  state text null,
  constraint delivery_locations_pkey primary key (id),
  constraint delivery_locations_business_id_fkey foreign KEY (business_id) references business_owner (id) on delete CASCADE
) TABLESPACE pg_default;