# Wallet System Implementation

This document outlines the comprehensive wallet system implementation for the restaurant app using VFD (Virtual Finance Digital) APIs.

## Overview

The wallet system allows both businesses and users to have digital wallets for processing payments. Businesses can create corporate accounts through VFD verification, while users can fund their wallets and make payments for orders.

## Key Features

### Business Wallets
- **Corporate Account Creation**: Businesses must verify their details (RC Number, Company Name, Incorporation Date, Director BVN)
- **VFD Integration**: Direct integration with VFD APIs for corporate account creation
- **Webhook Processing**: Automatic balance updates via VFD webhooks
- **Transaction Tracking**: Complete transaction history and balance management

### User Wallets
- **Wallet Creation**: Automatic wallet creation for new users
- **Balance Management**: Users can fund their wallets and view transaction history
- **Payment Processing**: Direct wallet-to-wallet payments for orders
- **Service Charge**: 2.5% service charge applied to all order payments

### Payment Methods
1. **Wallet**: Direct payment from user wallet to business wallet
2. **Transfer**: Bank transfer to business VFD account number
3. **Cash**: Payment on order collection

## Database Schema

### New Tables Added

#### `business_owner` (Updated)
```sql
-- VFD Corporate Account Fields
rc_number text,
incorporation_date text,
director_bvn text,
corporate_verified boolean DEFAULT false,
vfd_corporate_account_number text UNIQUE,
vfd_corporate_account_name text,
vfd_corporate_customer_id text,
corporate_wallet_status text DEFAULT 'uninitialized',
```

#### `vfd_webhooks`
```sql
CREATE TABLE public.vfd_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid,
  user_id uuid,
  webhook_type text NOT NULL,
  reference text NOT NULL,
  amount text,
  account_number text,
  -- ... other webhook fields
);
```

#### `vfd_transactions`
```sql
CREATE TABLE public.vfd_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid,
  user_id uuid,
  transaction_id text NOT NULL,
  -- ... other transaction fields
);
```

#### `business_wallets`
```sql
CREATE TABLE public.business_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  vfd_account_number text UNIQUE,
  vfd_account_name text,
  available_balance numeric DEFAULT 0,
  ledger_balance numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  wallet_status text NOT NULL DEFAULT 'uninitialized',
);
```

#### `business_wallet_transactions`
```sql
CREATE TABLE public.business_wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_wallet_id uuid NOT NULL,
  business_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  -- ... other transaction fields
);
```

### Updated Tables

#### `orders` (Updated)
```sql
-- Added wallet payment tracking
wallet_payment_reference text,
wallet_payment_status text DEFAULT 'pending',
service_charge_amount integer DEFAULT 0,
```

## API Endpoints

### Business Verification
- `POST /api/business-owner/verify-corporate` - Create corporate account
- `POST /api/business-owner/bvn-consent` - Check BVN consent

### Wallet Payments
- `POST /api/wallet/pay` - Process wallet payments

### Webhooks
- `POST /api/webhooks/vfd` - Handle VFD webhook notifications

## VFD Integration

### Configuration
```typescript
const VFD_CONFIG = {
  BASE_URL: process.env.VFD_BASE_URL || 'https://api-devapps.vfdbank.systems/vtech-wallet/api/v2/wallet2',
  ACCESS_TOKEN: process.env.VFD_ACCESS_TOKEN,
  WALLET_NAME: process.env.VFD_WALLET_NAME || 'RestaurantWallet',
};
```

### Key VFD APIs Used
1. **Corporate Account Creation**: `/corporateclient/create`
2. **BVN Consent**: `/bvn-consent`
3. **Account Enquiry**: `/account/enquiry`
4. **Transfer**: `/transfer`
5. **Transaction Status**: `/transactions`

### Webhook Types
1. **Inward Credit**: When funds are received in business wallet
2. **Initial Credit**: Initial notification of incoming funds
3. **BVN Consent**: When BVN consent is granted

## Frontend Components

### Business Dashboard
- **Wallet Page**: `/app/(dashboard)/wallet/page.tsx`
  - Corporate account verification
  - Balance display
  - Transaction history
  - Account details

### User App
- **User Wallet Component**: `components/user-wallet.tsx`
  - Wallet balance display
  - Fund wallet functionality
  - Transaction history

- **Order Payment Component**: `components/order-payment.tsx`
  - Payment method selection
  - Wallet payment processing
  - Transfer payment instructions

## Payment Flow

### Wallet Payment Flow
1. User selects "Wallet" payment method
2. System checks user wallet balance
3. If sufficient balance, processes payment
4. Deducts from user wallet, adds to business wallet
5. Creates transaction records
6. Updates order payment status

### Transfer Payment Flow
1. User selects "Transfer" payment method
2. System displays business VFD account details
3. User copies account number and makes transfer
4. Business manually confirms payment via webhook
5. System updates order payment status

## Service Charge

A 2.5% service charge is applied to all order payments:
- Automatically calculated on order total
- Deducted from user wallet or added to transfer amount
- Tracked in `service_charge_amount` field

## Security Features

### Webhook Security
- Signature validation (to be implemented)
- IP whitelisting (recommended)
- Duplicate webhook prevention

### Transaction Security
- Unique reference generation
- Transaction status tracking
- Rollback mechanisms for failed transactions

## Environment Variables

```env
# VFD Configuration
VFD_BASE_URL=https://api-devapps.vfdbank.systems/vtech-wallet/api/v2/wallet2
VFD_ACCESS_TOKEN=your_vfd_access_token
VFD_WALLET_NAME=RestaurantWallet

# Webhook URLs
VFD_WEBHOOK_URL=https://your-domain.com/api/webhooks/vfd
VFD_INITIAL_WEBHOOK_URL=https://your-domain.com/api/webhooks/vfd
VFD_BVN_CONSENT_WEBHOOK_URL=https://your-domain.com/api/webhooks/vfd
```

## Testing

### Test Data
Use the provided test BVNs and RC numbers from the VFD documentation:
- BVN: `22222222223`, OTP: `111111`
- RC Number: `RC9889992`, Company: `Victory Technologies`

### Test Scenarios
1. Business corporate account creation
2. BVN consent verification
3. User wallet funding
4. Order payment processing
5. Webhook processing

## Deployment Checklist

1. **Database Migration**
   - Run the updated database schema
   - Create necessary indexes

2. **Environment Setup**
   - Configure VFD API credentials
   - Set up webhook URLs
   - Configure environment variables

3. **VFD Integration**
   - Register webhook URLs with VFD
   - Test webhook endpoints
   - Verify API connectivity

4. **Security**
   - Implement webhook signature validation
   - Set up IP whitelisting
   - Configure rate limiting

## Monitoring

### Key Metrics
- Transaction success rates
- Webhook processing times
- Balance reconciliation
- Failed payment rates

### Logging
- All VFD API calls logged
- Webhook processing logs
- Payment transaction logs
- Error tracking and alerting

## Support

For issues with:
- **VFD Integration**: Contact VFD support
- **Webhook Processing**: Check logs and webhook endpoint
- **Payment Processing**: Verify wallet balances and transaction status
- **Database Issues**: Check Supabase logs and connection

## Future Enhancements

1. **Virtual Accounts**: Create temporary virtual accounts for specific orders
2. **QR Code Payments**: Integrate VFD QR code payment system
3. **Multi-Currency**: Support for multiple currencies
4. **Advanced Analytics**: Detailed payment analytics and reporting
5. **Automated Reconciliation**: Automatic balance reconciliation with VFD 