"use client";

import { TicketsList } from "./TicketsList";
import { OpenTicket } from "@/stores/order-store";

interface OpenTicketsTabProps {
  onTicketSelect?: (ticket: OpenTicket) => void;
  onSwitchToOrderCreation?: () => void;
  businessId?: string;
  selectedTicketId?: string;
}

export function OpenTicketsTab({
  onTicketSelect,
  onSwitchToOrderCreation,
  businessId,
  selectedTicketId,
}: OpenTicketsTabProps) {
  const handleTicketEdit = (ticket: OpenTicket) => {
    onSwitchToOrderCreation?.();
  };

  return (
    <div className="h-full">
      <TicketsList
        onTicketSelect={onTicketSelect}
        onTicketEdit={handleTicketEdit}
        onProcessPayment={onTicketSelect}
        onSwitchToOrderCreation={onSwitchToOrderCreation}
        selectedTicketId={selectedTicketId}
        businessId={businessId}
        enableRealTimeUpdates={true}
      />
    </div>
  );
}
