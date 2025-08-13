"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Plus, 
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  Minus,
  Eye
} from "lucide-react";
import Link from "next/link";
import { AddTransactionModal } from "./AddTransactionModal";

interface InventoryTransaction {
  id: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  previous_stock: number;
  new_stock: number;
  transaction_date: string;
  notes?: string;
  item?: {
    id: string;
    name: string;
    unit_of_measure: string;
  };
  supplier?: {
    name: string;
  };
}

interface InventoryTransactionsListProps {
  transactions: InventoryTransaction[];
  count: number;
  page: number;
  totalPages: number;
  searchParams: any;
}

export function InventoryTransactionsList({ 
  transactions, 
  count, 
  page, 
  totalPages, 
  searchParams 
}: InventoryTransactionsListProps) {
  const getTransactionIcon = (transactionType: string) => {
    switch (transactionType) {
      case 'purchase':
      case 'transfer_in':
      case 'return':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'sale':
      case 'waste':
      case 'transfer_out':
      case 'damage':
      case 'expiry':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'adjustment':
        return <Minus className="h-4 w-4 text-orange-600" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getTransactionTypeLabel = (transactionType: string) => {
    switch (transactionType) {
      case 'purchase':
        return 'Purchase';
      case 'sale':
        return 'Sale';
      case 'adjustment':
        return 'Adjustment';
      case 'waste':
        return 'Waste';
      case 'transfer_in':
        return 'Transfer In';
      case 'transfer_out':
        return 'Transfer Out';
      case 'return':
        return 'Return';
      case 'damage':
        return 'Damage';
      case 'expiry':
        return 'Expiry';
      default:
        return transactionType;
    }
  };

  const getTransactionTypeColor = (transactionType: string) => {
    switch (transactionType) {
      case 'purchase':
      case 'transfer_in':
      case 'return':
        return 'default';
      case 'sale':
      case 'waste':
      case 'transfer_out':
      case 'damage':
      case 'expiry':
        return 'secondary';
      case 'adjustment':
        return 'outline';
      default:
        return 'default';
    }
  };

  const hasFilters = searchParams.itemId || searchParams.transactionType;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Transactions</h1>
          <p className="text-muted-foreground">
            Track all inventory movements and stock changes
          </p>
        </div>
        <AddTransactionModal onTransactionAdded={() => {
          // This will trigger a re-render when a transaction is added
          window.location.reload();
        }} />
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({count})</CardTitle>
          <CardDescription>
            Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, count)} of {count} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No transactions found</h3>
              <p className="text-muted-foreground">
                {hasFilters 
                  ? "No transactions match your filters" 
                  : "Get started by recording your first inventory transaction"
                }
              </p>
              {!hasFilters && (
                <AddTransactionModal onTransactionAdded={() => {
                  // This will trigger a re-render when a transaction is added
                  window.location.reload();
                }} />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-full bg-gray-100">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">
                          {transaction.item?.name || 'Unknown Item'}
                        </h3>
                        <Badge variant={getTransactionTypeColor(transaction.transaction_type)}>
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Quantity: {transaction.quantity} {transaction.item?.unit_of_measure}
                        </span>
                        <span>
                          Cost: ₦{transaction.unit_cost}
                        </span>
                        <span>
                          Total: ₦{transaction.total_cost}
                        </span>
                        <span>
                          Stock: {transaction.previous_stock} → {transaction.new_stock}
                        </span>
                      </div>
                      
                      {transaction.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {transaction.notes}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </span>
                        {transaction.supplier && (
                          <span>
                            Supplier: {transaction.supplier.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {transaction.item && (
                      <Link href={`/inventory/items/${transaction.item.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`?${new URLSearchParams({ ...searchParams, page: (page - 1).toString() })}`}>
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`?${new URLSearchParams({ ...searchParams, page: (page + 1).toString() })}`}>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
