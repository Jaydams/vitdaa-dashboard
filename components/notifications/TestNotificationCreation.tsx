"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TestNotificationCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const supabase = createClient();

  const createTestNotification = async () => {
    setIsCreating(true);
    try {
      // Get the current user's business ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("No user found");
        return;
      }

      // Try to get business ID from business_owner table
      const { data: businessOwner } = await supabase
        .from('business_owner')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!businessOwner) {
        toast.error("No business found for user");
        return;
      }

      // Create a test notification
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          business_id: businessOwner.id,
          type: 'new_order',
          title: 'Test Order Notification',
          message: 'This is a test order notification',
          data: {
            order_id: 'test-' + Date.now(),
            invoice_no: 'TEST-' + Date.now(),
            customer_name: 'Test Customer',
            customer_phone: '+2348012345678',
            total_amount: 5000,
            payment_method: 'cash',
            dining_option: 'indoor',
          },
          priority: 'high',
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating notification:", error);
        toast.error(`Failed to create notification: ${error.message}`);
      } else {
        console.log("Test notification created:", notification);
        toast.success("Test notification created successfully!");
      }
    } catch (error) {
      console.error("Error in createTestNotification:", error);
      toast.error("Failed to create test notification");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Test Notification Creation</h3>
      <p className="text-sm text-gray-600 mb-4">
        Click the button below to test if notification creation is working.
      </p>
      <Button 
        onClick={createTestNotification} 
        disabled={isCreating}
        variant="outline"
      >
        {isCreating ? "Creating..." : "Create Test Notification"}
      </Button>
    </div>
  );
}
