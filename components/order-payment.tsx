'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@/hooks/useUser';
import { Wallet, CreditCard, Cash, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Order {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  vat_amount: number;
  service_charge: number;
  total_amount: number;
  payment_method: string;
  status: string;
  wallet_payment_status?: string;
  wallet_payment_reference?: string;
  service_charge_amount?: number;
}

interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
}

interface BusinessWallet {
  id: string;
  business_id: string;
  vfd_account_number: string;
  vfd_account_name: string;
  available_balance: number;
}

interface OrderPaymentProps {
  order: Order;
  onPaymentSuccess?: () => void;
}

export default function OrderPayment({ order, onPaymentSuccess }: OrderPaymentProps) {
  const { user } = useUser();
  const [userWallet, setUserWallet] = useState<UserWallet | null>(null);
  const [businessWallet, setBusinessWallet] = useState<BusinessWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  useEffect(() => {
    if (user && order) {
      loadPaymentData();
    }
  }, [user, order]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // Get user wallet
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (!walletError && walletData) {
        setUserWallet(walletData);
      }

      // Get business wallet
      const { data: businessWalletData, error: businessWalletError } = await supabase
        .from('business_wallets')
        .select('*')
        .eq('business_id', order.business_id)
        .single();

      if (!businessWalletError && businessWalletData) {
        setBusinessWallet(businessWalletData);
      }

    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletPayment = async () => {
    if (!userWallet || !businessWallet) {
      toast.error('Wallet information not available');
      return;
    }

    if (userWallet.balance < order.total_amount) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch('/api/wallet/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          userId: user?.id,
          businessId: order.business_id,
          amount: order.total_amount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Payment processed successfully!');
        setShowPaymentDialog(false);
        onPaymentSuccess?.();
        loadPaymentData(); // Refresh wallet data
      } else {
        toast.error(data.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleTransferPayment = () => {
    if (!businessWallet) {
      toast.error('Business wallet information not available');
      return;
    }

    // Copy account number to clipboard
    navigator.clipboard.writeText(businessWallet.vfd_account_number);
    toast.success('Account number copied to clipboard! Please complete the transfer and contact the business for confirmation.');
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getPaymentStatusBadge = () => {
    if (order.wallet_payment_status === 'completed') {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    } else if (order.wallet_payment_status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Unpaid</Badge>;
    }
  };

  const canPayWithWallet = userWallet && userWallet.balance >= order.total_amount;
  const isPaid = order.wallet_payment_status === 'completed';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payment Details</span>
            {getPaymentStatusBadge()}
          </CardTitle>
          <CardDescription>
            Choose your preferred payment method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Subtotal</p>
              <p className="text-lg font-bold">{formatAmount(order.subtotal)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">VAT</p>
              <p className="text-lg font-bold">{formatAmount(order.vat_amount)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Service Charge</p>
              <p className="text-lg font-bold">{formatAmount(order.service_charge)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Total</p>
              <p className="text-lg font-bold text-green-600">{formatAmount(order.total_amount)}</p>
            </div>
          </div>

          {userWallet && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Your Wallet Balance</p>
                  <p className="text-lg font-bold text-green-600">{formatAmount(userWallet.balance)}</p>
                </div>
                {!canPayWithWallet && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Insufficient balance. Please fund your wallet.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {!isPaid && (
            <div className="space-y-3">
              <h3 className="font-medium">Payment Methods</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant={selectedPaymentMethod === 'wallet' ? 'default' : 'outline'}
                  className="flex items-center space-x-2"
                  onClick={() => setSelectedPaymentMethod('wallet')}
                  disabled={!canPayWithWallet}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Wallet</span>
                </Button>

                <Button
                  variant={selectedPaymentMethod === 'transfer' ? 'default' : 'outline'}
                  className="flex items-center space-x-2"
                  onClick={() => setSelectedPaymentMethod('transfer')}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Transfer</span>
                </Button>

                <Button
                  variant={selectedPaymentMethod === 'cash' ? 'default' : 'outline'}
                  className="flex items-center space-x-2"
                  onClick={() => setSelectedPaymentMethod('cash')}
                >
                  <Cash className="w-4 h-4" />
                  <span>Cash</span>
                </Button>
              </div>

              {selectedPaymentMethod && (
                <div className="pt-4">
                  {selectedPaymentMethod === 'wallet' && (
                    <div className="space-y-3">
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Pay directly from your wallet balance. 2.5% service charge applies.
                        </AlertDescription>
                      </Alert>
                      <Button 
                        onClick={() => setShowPaymentDialog(true)}
                        className="w-full"
                        disabled={!canPayWithWallet}
                      >
                        Pay with Wallet
                      </Button>
                    </div>
                  )}

                  {selectedPaymentMethod === 'transfer' && businessWallet && (
                    <div className="space-y-3">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Transfer to the business account and contact them for confirmation.
                        </AlertDescription>
                      </Alert>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">Business Account Details</p>
                        <p className="text-sm">Account Number: {businessWallet.vfd_account_number}</p>
                        <p className="text-sm">Account Name: {businessWallet.vfd_account_name}</p>
                        <p className="text-sm">Amount: {formatAmount(order.total_amount)}</p>
                      </div>
                      <Button 
                        onClick={handleTransferPayment}
                        className="w-full"
                        variant="outline"
                      >
                        Copy Account Number
                      </Button>
                    </div>
                  )}

                  {selectedPaymentMethod === 'cash' && (
                    <div className="space-y-3">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Pay with cash when you collect your order.
                        </AlertDescription>
                      </Alert>
                      <Button 
                        className="w-full"
                        variant="outline"
                        disabled
                      >
                        Pay on Collection
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isPaid && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Payment completed! Reference: {order.wallet_payment_reference}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Wallet Payment</DialogTitle>
            <DialogDescription>
              Please confirm your payment details before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Order Total:</span>
                <span className="font-bold">{formatAmount(order.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge (2.5%):</span>
                <span className="font-bold">{formatAmount(order.service_charge)}</span>
              </div>
              <div className="flex justify-between">
                <span>Your Balance:</span>
                <span className="font-bold text-green-600">{formatAmount(userWallet?.balance || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Balance After Payment:</span>
                <span className="font-bold text-red-600">
                  {formatAmount((userWallet?.balance || 0) - order.total_amount)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleWalletPayment}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 