import { createClient } from '@supabase/supabase-js';

export interface WebhookPayload {
  reference: string;
  amount: string;
  account_number: string;
  originator_account_number: string;
  originator_account_name: string;
  originator_bank: string;
  originator_narration: string;
  timestamp: string;
  transaction_channel: string;
  session_id: string;
  initialCreditRequest?: boolean;
}

export interface BVNConsentWebhookPayload {
  status: string;
  message: string;
  data: {
    bvn: string;
    status: boolean;
    reference: string;
  };
}

export class VFDWebhookProcessor {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  static async processInwardCreditWebhook(payload: WebhookPayload, businessId?: string, userId?: string) {
    try {
      // Store webhook data
      const { data: webhookData, error: webhookError } = await this.supabase
        .from('vfd_webhooks')
        .insert({
          business_id: businessId,
          user_id: userId,
          webhook_type: 'inward_credit',
          reference: payload.reference,
          amount: payload.amount,
          account_number: payload.account_number,
          originator_account_number: payload.originator_account_number,
          originator_account_name: payload.originator_account_name,
          originator_bank: payload.originator_bank,
          originator_narration: payload.originator_narration,
          timestamp: payload.timestamp,
          transaction_channel: payload.transaction_channel,
          session_id: payload.session_id,
          webhook_data: payload,
        });

      if (webhookError) {
        console.error('Error storing webhook:', webhookError);
        throw webhookError;
      }

      // Update wallet balance
      if (businessId) {
        await this.updateBusinessWalletBalance(payload, businessId);
      } else if (userId) {
        await this.updateUserWalletBalance(payload, userId);
      }

      // Mark webhook as processed
      if (webhookData && webhookData.length > 0) {
        await this.supabase
          .from('vfd_webhooks')
          .update({ processed: true })
          .eq('id', webhookData[0].id);
      }

    } catch (error) {
      console.error('Error processing inward credit webhook:', error);
      throw error;
    }
  }

  private static async updateBusinessWalletBalance(payload: WebhookPayload, businessId: string) {
    // Update business wallet
    const { data: businessWallet, error: walletError } = await this.supabase
      .from('business_wallets')
      .select('*')
      .eq('vfd_account_number', payload.account_number)
      .single();

    if (walletError) {
      console.error('Error fetching business wallet:', walletError);
      return;
    }

    if (businessWallet) {
      const newBalance = parseFloat(businessWallet.available_balance) + parseFloat(payload.amount);
      
      await this.supabase
        .from('business_wallets')
        .update({ 
          available_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessWallet.id);

      // Create transaction record
      await this.supabase
        .from('business_wallet_transactions')
        .insert({
          business_wallet_id: businessWallet.id,
          business_id: businessId,
          amount: parseFloat(payload.amount),
          type: 'credit',
          description: `Inward credit from ${payload.originator_account_name}`,
          status: 'completed',
          reference: payload.reference,
          metadata: {
            originator_account: payload.originator_account_number,
            originator_bank: payload.originator_bank,
            transaction_channel: payload.transaction_channel,
            session_id: payload.session_id,
          },
        });
    }
  }

  private static async updateUserWalletBalance(payload: WebhookPayload, userId: string) {
    // Update user wallet
    const { data: userWallet, error: walletError } = await this.supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      console.error('Error fetching user wallet:', walletError);
      return;
    }

    if (userWallet) {
      const newBalance = parseFloat(userWallet.balance) + parseFloat(payload.amount);
      
      await this.supabase
        .from('user_wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userWallet.id);

      // Create transaction record
      await this.supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: userWallet.id,
          user_id: userId,
          amount: parseFloat(payload.amount),
          type: 'credit',
          description: `Inward credit from ${payload.originator_account_name}`,
          status: 'completed',
          reference: payload.reference,
          metadata: {
            originator_account: payload.originator_account_number,
            originator_bank: payload.originator_bank,
            transaction_channel: payload.transaction_channel,
            session_id: payload.session_id,
          },
        });
    }
  }

  static async processBVNConsentWebhook(payload: BVNConsentWebhookPayload) {
    try {
      // Store webhook data
      await this.supabase
        .from('vfd_webhooks')
        .insert({
          webhook_type: 'bvn_consent',
          reference: payload.data.reference,
          bvn: payload.data.bvn,
          consent_status: payload.data.status,
          webhook_data: payload,
          processed: true,
        });

      // Update business owner BVN verification status
      if (payload.data.status) {
        await this.supabase
          .from('business_owner')
          .update({ 
            bvn_verified: true,
            corporate_wallet_status: 'verified'
          })
          .eq('bvn', payload.data.bvn);
      }

    } catch (error) {
      console.error('Error processing BVN consent webhook:', error);
      throw error;
    }
  }

  static async processInitialCreditWebhook(payload: WebhookPayload, businessId?: string, userId?: string) {
    try {
      // Store webhook data
      await this.supabase
        .from('vfd_webhooks')
        .insert({
          business_id: businessId,
          user_id: userId,
          webhook_type: 'initial_credit',
          reference: payload.reference,
          amount: payload.amount,
          account_number: payload.account_number,
          originator_account_number: payload.originator_account_number,
          originator_account_name: payload.originator_account_name,
          originator_bank: payload.originator_bank,
          originator_narration: payload.originator_narration,
          timestamp: payload.timestamp,
          transaction_channel: payload.transaction_channel,
          session_id: payload.session_id,
          initial_credit_request: true,
          webhook_data: payload,
          processed: true,
        });

      // Note: Initial credit webhooks don't update balances immediately
      // They are just notifications that funds are incoming

    } catch (error) {
      console.error('Error processing initial credit webhook:', error);
      throw error;
    }
  }
} 