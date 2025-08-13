import { NextRequest, NextResponse } from 'next/server';
import { VFDWebhookProcessor } from '@/lib/vfd-webhooks';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Validate webhook signature (you should implement this based on VFD's security requirements)
    // const signature = request.headers.get('x-vfd-signature');
    // if (!validateSignature(payload, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    // Determine webhook type based on payload structure
    if (payload.data && payload.data.bvn) {
      // BVN Consent webhook
      await VFDWebhookProcessor.processBVNConsentWebhook(payload);
      
      return NextResponse.json({ 
        status: '00',
        message: 'BVN consent webhook processed successfully' 
      });
    } else if (payload.initialCreditRequest) {
      // Initial credit webhook
      const businessId = await getBusinessIdByAccountNumber(payload.account_number);
      const userId = await getUserIdByAccountNumber(payload.account_number);
      
      await VFDWebhookProcessor.processInitialCreditWebhook(payload, businessId, userId);
      
      return NextResponse.json({ 
        status: '00',
        message: 'Initial credit webhook processed successfully' 
      });
    } else {
      // Inward credit webhook
      const businessId = await getBusinessIdByAccountNumber(payload.account_number);
      const userId = await getUserIdByAccountNumber(payload.account_number);
      
      await VFDWebhookProcessor.processInwardCreditWebhook(payload, businessId, userId);
      
      return NextResponse.json({ 
        status: '00',
        message: 'Inward credit webhook processed successfully' 
      });
    }

  } catch (error) {
    console.error('Error processing VFD webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function getBusinessIdByAccountNumber(accountNumber: string): Promise<string | undefined> {
  try {
    const { data: businessWallet } = await supabase
      .from('business_wallets')
      .select('business_id')
      .eq('vfd_account_number', accountNumber)
      .single();

    return businessWallet?.business_id;
  } catch (error) {
    console.error('Error getting business ID:', error);
    return undefined;
  }
}

async function getUserIdByAccountNumber(accountNumber: string): Promise<string | undefined> {
  try {
    const { data: userWallet } = await supabase
      .from('user_wallets')
      .select('user_id')
      .eq('vfd_account_number', accountNumber)
      .single();

    return userWallet?.user_id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return undefined;
  }
} 