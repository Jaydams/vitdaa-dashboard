'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WalletClientProps {
  business: any;
  wallet: any;
  businessOwnerId: string;
}

export default function WalletClient({ business, wallet, businessOwnerId }: WalletClientProps) {
  const [verifying, setVerifying] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationForm, setVerificationForm] = useState({
    rcNumber: '',
    companyName: '',
    incorporationDate: '',
    directorBVN: '',
  });

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);

    try {
      const response = await fetch('/api/business-owner/verify-corporate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: businessOwnerId,
          ...verificationForm,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Corporate account created successfully!');
        setShowVerificationDialog(false);
        // Reload the page to show updated data
        window.location.reload();
      } else {
        toast.error(data.error || 'Failed to create corporate account');
      }
    } catch (error) {
      console.error('Error creating corporate account:', error);
      toast.error('Failed to create corporate account');
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-gray-600">Manage your business wallet and payments</p>
        </div>
        {business && !business.corporate_verified && (
          <Button onClick={() => setShowVerificationDialog(true)}>
            <Wallet className="w-4 h-4 mr-2" />
            Set Up Corporate Account
          </Button>
        )}
      </div>

      {business && !business.corporate_verified && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to verify your business details to create a corporate wallet account.
          </AlertDescription>
        </Alert>
      )}

      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="w-5 h-5 mr-2" />
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(wallet.available_balance || 0)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Ledger Balance: {formatAmount(wallet.ledger_balance || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Account Number</Label>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {wallet.vfd_account_number}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(wallet.vfd_account_number)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Account Name</Label>
                  <p className="text-sm">{wallet.vfd_account_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Verify Business Details</DialogTitle>
            <DialogDescription>
              Please provide your business details to create a corporate wallet account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerificationSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rcNumber">RC Number</Label>
              <Input
                id="rcNumber"
                placeholder="RC-12345678"
                value={verificationForm.rcNumber}
                onChange={(e) => setVerificationForm({
                  ...verificationForm,
                  rcNumber: e.target.value
                })}
                required
              />
            </div>
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Your Company Name"
                value={verificationForm.companyName}
                onChange={(e) => setVerificationForm({
                  ...verificationForm,
                  companyName: e.target.value
                })}
                required
              />
            </div>
            <div>
              <Label htmlFor="incorporationDate">Incorporation Date</Label>
              <Input
                id="incorporationDate"
                placeholder="05 January 2021"
                value={verificationForm.incorporationDate}
                onChange={(e) => setVerificationForm({
                  ...verificationForm,
                  incorporationDate: e.target.value
                })}
                required
              />
            </div>
            <div>
              <Label htmlFor="directorBVN">Director BVN</Label>
              <Input
                id="directorBVN"
                placeholder="12345678901"
                value={verificationForm.directorBVN}
                onChange={(e) => setVerificationForm({
                  ...verificationForm,
                  directorBVN: e.target.value
                })}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowVerificationDialog(false)}
                disabled={verifying}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={verifying}>
                {verifying ? 'Verifying...' : 'Verify Business'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 