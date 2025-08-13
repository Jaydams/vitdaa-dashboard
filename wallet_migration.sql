-- Wallet System Migration
-- This script adds only the new wallet-related tables and fields

-- Add VFD fields to existing business_owner table
ALTER TABLE public.business_owner 
ADD COLUMN IF NOT EXISTS rc_number text,
ADD COLUMN IF NOT EXISTS incorporation_date text,
ADD COLUMN IF NOT EXISTS director_bvn text,
ADD COLUMN IF NOT EXISTS corporate_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS vfd_corporate_account_number text UNIQUE,
ADD COLUMN IF NOT EXISTS vfd_corporate_account_name text,
ADD COLUMN IF NOT EXISTS vfd_corporate_customer_id text,
ADD COLUMN IF NOT EXISTS corporate_wallet_status text DEFAULT 'uninitialized' CHECK (corporate_wallet_status = ANY (ARRAY['uninitialized'::text, 'pending_verification'::text, 'verified'::text, 'active'::text, 'suspended'::text]));

-- Create VFD webhooks table
CREATE TABLE IF NOT EXISTS public.vfd_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid,
  user_id uuid,
  webhook_type text NOT NULL CHECK (webhook_type = ANY (ARRAY['inward_credit'::text, 'initial_credit'::text, 'bvn_consent'::text])),
  reference text NOT NULL,
  amount text,
  account_number text,
  originator_account_number text,
  originator_account_name text,
  originator_bank text,
  originator_narration text,
  timestamp text,
  transaction_channel text,
  session_id text,
  initial_credit_request boolean DEFAULT false,
  bvn text,
  consent_status boolean,
  webhook_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vfd_webhooks_pkey PRIMARY KEY (id),
  CONSTRAINT vfd_webhooks_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id),
  CONSTRAINT vfd_webhooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.personal_users(id)
);

-- Create VFD transactions table
CREATE TABLE IF NOT EXISTS public.vfd_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid,
  user_id uuid,
  transaction_id text NOT NULL,
  session_id text,
  reference text NOT NULL,
  amount numeric NOT NULL,
  from_account text,
  to_account text,
  from_bank text,
  to_bank text,
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['intra'::text, 'inter'::text])),
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'reversed'::text])),
  response_code text,
  response_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vfd_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT vfd_transactions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id),
  CONSTRAINT vfd_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.personal_users(id)
);

-- Create business wallets table
CREATE TABLE IF NOT EXISTS public.business_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  vfd_account_number text UNIQUE,
  vfd_account_name text,
  vfd_customer_id text,
  available_balance numeric DEFAULT 0,
  ledger_balance numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  wallet_status text NOT NULL DEFAULT 'uninitialized' CHECK (wallet_status = ANY (ARRAY['uninitialized'::text, 'pending_verification'::text, 'verified'::text, 'active'::text, 'suspended'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_wallets_pkey PRIMARY KEY (id),
  CONSTRAINT business_wallets_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id)
);

-- Create business wallet transactions table
CREATE TABLE IF NOT EXISTS public.business_wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_wallet_id uuid NOT NULL,
  business_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['credit'::text, 'debit'::text, 'transfer_in'::text, 'transfer_out'::text, 'payment'::text, 'refund'::text, 'withdrawal'::text, 'deposit'::text, 'service_charge'::text])),
  description text,
  status text NOT NULL DEFAULT 'completed' CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'reversed'::text])),
  reference text UNIQUE,
  order_id uuid,
  vfd_transaction_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT business_wallet_transactions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owner(id),
  CONSTRAINT business_wallet_transactions_business_wallet_id_fkey FOREIGN KEY (business_wallet_id) REFERENCES public.business_wallets(id),
  CONSTRAINT business_wallet_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- Add wallet payment tracking to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS wallet_payment_reference text,
ADD COLUMN IF NOT EXISTS wallet_payment_status text DEFAULT 'pending' CHECK (wallet_payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])),
ADD COLUMN IF NOT EXISTS service_charge_amount integer DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vfd_webhooks_business_id ON public.vfd_webhooks(business_id);
CREATE INDEX IF NOT EXISTS idx_vfd_webhooks_user_id ON public.vfd_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_vfd_webhooks_reference ON public.vfd_webhooks(reference);
CREATE INDEX IF NOT EXISTS idx_vfd_transactions_business_id ON public.vfd_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_vfd_transactions_user_id ON public.vfd_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_vfd_transactions_reference ON public.vfd_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_business_wallets_business_id ON public.business_wallets(business_id);
CREATE INDEX IF NOT EXISTS idx_business_wallets_vfd_account_number ON public.business_wallets(vfd_account_number);
CREATE INDEX IF NOT EXISTS idx_business_wallet_transactions_business_id ON public.business_wallet_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_wallet_transactions_order_id ON public.business_wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_business_wallet_transactions_reference ON public.business_wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_orders_wallet_payment_reference ON public.orders(wallet_payment_reference); 