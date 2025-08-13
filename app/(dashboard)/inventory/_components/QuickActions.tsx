"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { AddItemModal } from "../items/_components/AddItemModal";
import { AddTransactionModal } from "../transactions/_components/AddTransactionModal";

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common inventory management tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <AddItemModal onItemAdded={() => {
            // This will trigger a re-render when an item is added
            window.location.reload();
          }} />
          
          <AddTransactionModal onTransactionAdded={() => {
            // This will trigger a re-render when a transaction is added
            window.location.reload();
          }} />
          
          <Link href="/inventory/alerts">
            <Button variant="outline" className="w-full justify-start">
              <AlertCircle className="mr-2 h-4 w-4" />
              View Alerts
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
