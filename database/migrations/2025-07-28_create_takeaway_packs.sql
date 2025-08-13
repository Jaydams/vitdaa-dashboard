-- Create takeaway_packs table
create table if not exists public.takeaway_packs (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,
  name text not null,
  price integer not null,
  constraint takeaway_packs_pkey primary key (id),
  constraint takeaway_packs_business_id_fkey foreign key (business_id) references business_owner (id) on delete cascade
);

create index if not exists idx_takeaway_packs_business_id on public.takeaway_packs using btree (business_id);
