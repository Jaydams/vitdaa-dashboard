import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { VFDUtils } from '@/lib/vfd-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { orderId, userId, businessId, amount } = await request.json();

    if (!orderId || !userId || !businessId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.wallet_payment_status === 'completed') {
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 400 }
      );
    }

    // Calculate service charge (2.5%)
    const serviceCharge = VFDUtils.calculateServiceCharge(amount);
    const totalAmount = amount + serviceCharge;
    const reference = VFDUtils.generateReference();

    // Get user wallet
    const { data: userWallet, error: userWalletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userWalletError || !userWallet) {
      return NextResponse.json(
        { error: 'User wallet not found' },
        { status: 404 }
      );
    }

    // Get business wallet
    const { data: businessWallet, error: businessWalletError } = await supabase
      .from('business_wallets')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (businessWalletError || !businessWallet) {
      return NextResponse.json(
        { error: 'Business wallet not found' },
        { status: 404 }
      );
    }

    // Check if user has sufficient balance
    if (userWallet.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }

    try {
      // Deduct from user wallet
      const newUserBalance = userWallet.balance - amount;
      await supabase
        .from('user_wallets')
        .update({ 
          balance: newUserBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userWallet.id);

      // Add to business wallet
      const newBusinessBalance = businessWallet.available_balance + amount;
      await supabase
        .from('business_wallets')
        .update({ 
          available_balance: newBusinessBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessWallet.id);

      // Create transaction records
      await supabase.from('wallet_transactions').insert({
        wallet_id: userWallet.id,
        user_id: userId,
        amount: amount,
        type: 'debit',
        description: `Payment for order ${orderId}`,
        status: 'completed',
        reference: reference,
        metadata: { order_id: orderId, business_id: businessId },
      });

      await supabase.from('business_wallet_transactions').insert({
        business_wallet_id: businessWallet.id,
        business_id: businessId,
        amount: amount,
        type: 'credit',
        description: `Payment received for order ${orderId}`,
        status: 'completed',
        reference: reference,
        order_id: orderId,
        metadata: { user_id: userId },
      });

      // Update order payment status
      await supabase
        .from('orders')
        .update({
          wallet_payment_status: 'completed',
          wallet_payment_reference: reference,
          service_charge_amount: serviceCharge,
        })
        .eq('id', orderId);

      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          reference,
          amount,
          serviceCharge,
          userBalance: newUserBalance,
          businessBalance: newBusinessBalance,
        },
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      return NextResponse.json(
        { error: 'Payment processing failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in wallet payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 