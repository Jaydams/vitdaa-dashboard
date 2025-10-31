"use client";

import { useState, useEffect } from "react";

import { ShoppingCart, Ticket } from "lucide-react";

import { StaffSession } from "@/types/auth";
import { useOrderStore, OpenTicket } from "@/stores/order-store";
import { OrderCreationTab } from "./OrderCreationTab";
import { OpenTicketsTab } from "./OpenTicketsTab";
import { ReceptionDashboardErrorBoundary } from "@/components/error-boundary/ReceptionDashboardErrorBoundary";
import { TicketManagementErrorBoundary } from "@/components/error-boundary/TicketManagementErrorBoundary";
import {
  NotificationProvider,
  PersistentNotificationsPanel,
} from "@/components/notifications/NotificationSystem";

interface EnhancedReceptionDashboardProps {
  staffSession: StaffSession;
  initialTab?: "create-order" | "open-tickets";
}

export default function EnhancedReceptionDashboard({
  staffSession,
  initialTab = "create-order",
}: EnhancedReceptionDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const { currentOrder, openTickets } = useOrderStore();

  // Debug logging
  console.log("EnhancedReceptionDashboard - currentOrder:", currentOrder);
  console.log(
    "EnhancedReceptionDashboard - items count:",
    currentOrder?.items?.length || 0
  );

  // Persist tab state in localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem("reception-dashboard-active-tab");
    if (
      savedTab &&
      (savedTab === "create-order" || savedTab === "open-tickets")
    ) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save tab state when it changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem("reception-dashboard-active-tab", value);
  };

  // Handle switching between tabs
  const handleSwitchToTickets = () => {
    handleTabChange("open-tickets");
  };

  const handleSwitchToOrderCreation = () => {
    handleTabChange("create-order");
  };

  // Handle ticket selection for payment processing
  const handleTicketSelect = (ticket: OpenTicket) => {
    // TODO: Implement payment processing modal
    // This will be implemented in task 4 (payment processing integration)
    console.log("Selected ticket for payment:", ticket);
  };

  // Handle order creation completion
  const handleOrderCreated = (orderId: string) => {
    console.log("Order created:", orderId);
    // Optionally switch to tickets tab or show success message
  };

  return (
    <NotificationProvider>
      <ReceptionDashboardErrorBoundary
        staffId="reception-staff"
        enableAutoRecovery={true}
      >
        <div className="h-full flex flex-col">
          {/* Sticky Tabs - Like Header */}
          <div className="sticky top-0 z-40 bg-background border-b">
            <div className="px-2 md:px-4 py-2">
              <div className="container mx-auto">
                <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg">
                  <button
                    onClick={() => handleTabChange("create-order")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === "create-order"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span className="hidden sm:inline">Create New Order</span>
                    <span className="sm:hidden">Create</span>
                    {currentOrder && currentOrder.items.length > 0 && (
                      <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                        {currentOrder.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        )}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleTabChange("open-tickets")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === "open-tickets"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Ticket className="h-4 w-4" />
                    <span className="hidden sm:inline">Open Tickets</span>
                    <span className="sm:hidden">Tickets</span>
                    {openTickets.length > 0 && (
                      <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                        {openTickets.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "create-order" && (
              <OrderCreationTab
                staffSession={staffSession}
                onOrderCreated={handleOrderCreated}
                onSwitchToTickets={handleSwitchToTickets}
              />
            )}
            {activeTab === "open-tickets" && (
              <TicketManagementErrorBoundary operationType="load">
                <OpenTicketsTab
                  onTicketSelect={handleTicketSelect}
                  onSwitchToOrderCreation={handleSwitchToOrderCreation}
                  businessId={staffSession.business.id}
                />
              </TicketManagementErrorBoundary>
            )}
          </div>
        </div>

        {/* Persistent notifications panel */}
        <PersistentNotificationsPanel />
      </ReceptionDashboardErrorBoundary>
    </NotificationProvider>
  );
}
