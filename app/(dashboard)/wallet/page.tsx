import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Copy, AlertCircle, CheckCircle } from 'lucide-react';
import WalletClient from './WalletClient';

export default async function WalletPage() {
  const businessOwnerId = await getServerBusinessOwnerId();
  
  if (!businessOwnerId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Wallet</h1>
            <p className="text-gray-600">Manage your business wallet and payments</p>
          </div>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to access your wallet.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Load business and wallet data server-side
  const supabase = await createClient();
  
  const { data: business, error: businessError } = await supabase
    .from('business_owner')
    .select('*')
    .eq('id', businessOwnerId)
    .single();

  if (businessError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Wallet</h1>
            <p className="text-gray-600">Manage your business wallet and payments</p>
          </div>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load business data. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { data: wallet } = await supabase
    .from('business_wallets')
    .select('*')
    .eq('business_id', businessOwnerId)
    .single();

  return <WalletClient business={business} wallet={wallet} businessOwnerId={businessOwnerId} />;
} 