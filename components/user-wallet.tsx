'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@/hooks/useUser';
import { Wallet, CreditCard, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  reference: string;
  created_at: string;
}

export default function UserWallet() {
  const { user } = useUser();
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [fundAmount, setFundAmount] = useState('');

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      
      // Get or create user wallet
      let { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Wallet doesn't exist, create one
        const { data: newWallet, error: createError } = await supabase
          .from('user_wallets')
          .insert({
            user_id: user?.id,
            balance: 0,
            currency: 'NGN',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating wallet:', createError);
          return;
        }

        walletData = newWallet;
      } else if (walletError) {
        console.error('Error loading wallet:', walletError);
        return;
      }

      setWallet(walletData);

      // Get recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!transactionsError && transactionsData) {
        setTransactions(transactionsData);
      }

    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFundWallet = async () => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const amount = parseFloat(fundAmount);
      
      // Update wallet balance
      const newBalance = (wallet?.balance || 0) + amount;
      const { error: updateError } = await supabase
        .from('user_wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (updateError) {
        throw updateError;
      }

      // Create transaction record
      await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet?.id,
          user_id: user?.id,
          amount: amount,
          type: 'credit',
          description: 'Wallet funding',
          status: 'completed',
          reference: `FUND-${Date.now()}`,
        });

      toast.success('Wallet funded successfully!');
      setShowFundDialog(false);
      setFundAmount('');
      loadWalletData();

    } catch (error) {
      console.error('Error funding wallet:', error);
      toast.error('Failed to fund wallet');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Wallet</h2>
        <Button onClick={() => setShowFundDialog(true)}>
          <CreditCard className="w-4 h-4 mr-2" />
          Fund Wallet
        </Button>
      </div>

      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="w-5 h-5 mr-2" />
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(wallet.balance)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Currency: {wallet.currency}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Transactions</span>
                  <span className="text-sm font-medium">{transactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Account Status</span>
                  <span className="text-sm font-medium text-green-600">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your recent wallet transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 3).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`text-sm font-bold ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatAmount(transaction.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Fund Wallet</DialogTitle>
            <DialogDescription>
              Add money to your wallet to make payments for orders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (NGN)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="1000"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                min="100"
                step="100"
              />
            </div>
            <div className="text-sm text-gray-500">
              <p>• Minimum amount: ₦100</p>
              <p>• You can use this balance to pay for orders</p>
              <p>• 2.5% service charge applies to order payments</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFundDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleFundWallet}>
              Fund Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 