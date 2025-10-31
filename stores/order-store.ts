import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DiningOption, OrderItem, CustomCharge } from "@/types/order";
import { ReceptionAuditLogger } from "@/lib/audit-logger";

// Enhanced interfaces for the OrderStore
export interface CustomerInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface OrderCalculations {
  subtotal: number;
  vatAmount: number;
  serviceChargeAmount: number;
  customChargesTotal: number;
  total: number;
}

export interface OrderState {
  id?: string;
  ticketNumber?: string;
  items: OrderItem[];
  customer: CustomerInfo;
  tableNumber?: number;
  diningOption: DiningOption;
  specialInstructions?: string;
  status: "draft" | "open_ticket" | "payment_pending" | "completed";
  calculations: OrderCalculations;
  customCharges: CustomCharge[];
  timestamps: {
    created: Date;
    lastModified: Date;
    savedAsTicket?: Date;
  };
}

export interface OpenTicket {
  id: string;
  ticketNumber: string;
  orderState: OrderState;
  status: "pending_payment" | "preparing" | "ready" | "completed";
  priority: "normal" | "high" | "urgent";
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  estimatedCompletionTime?: Date;
  paymentStatus: "pending" | "processing" | "completed" | "failed";
}

// Operation queue for offline scenarios
interface QueuedOperation {
  id: string;
  type: "create" | "update" | "delete";
  ticketId?: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

interface OrderStoreState {
  currentOrder: OrderState | null;
  openTickets: OpenTicket[];

  // Synchronization state
  syncStatus: "idle" | "syncing" | "error";
  lastSyncTime: Date | null;
  conflictedTickets: string[]; // IDs of tickets with conflicts
  backgroundSyncInterval: NodeJS.Timeout | null;

  // Offline state management
  isOnline: boolean;
  operationQueue: QueuedOperation[];
  isProcessingQueue: boolean;

  // Audit logging
  auditLogger: ReceptionAuditLogger | null;
}

interface OrderStoreActions {
  // Basic order management actions
  addItem: (menuItem: {
    id: number;
    name: string;
    price: number;
    image_url?: string;
  }) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCurrentOrder: () => void;

  // Customer and order details
  updateCustomer: (customer: Partial<CustomerInfo>) => void;
  updateDiningOption: (option: DiningOption) => void;
  updateTableNumber: (tableNumber: number | undefined) => void;
  updateSpecialInstructions: (instructions: string) => void;

  // Calculations
  recalculateOrder: () => void;

  // Open ticket management
  saveAsOpenTicket: () => Promise<string>;
  loadOpenTicket: (ticketId: string) => void;
  deleteOpenTicket: (ticketId: string) => void;
  updateTicketStatus: (ticketId: string, status: OpenTicket["status"]) => void;
  loadTicketsFromServer: (dateFrom?: string, dateTo?: string) => Promise<void>;

  // Additional ticket management helpers
  updateTicketPriority: (
    ticketId: string,
    priority: OpenTicket["priority"]
  ) => void;
  getTicketById: (ticketId: string) => OpenTicket | undefined;
  getSortedTickets: () => OpenTicket[];
  completeTicketPayment: (ticketId: string) => void;

  // Server synchronization
  syncWithServer: () => Promise<void>;
  syncTicketWithServer: (ticketId: string) => Promise<void>;
  resolveConflict: (
    ticketId: string,
    resolution: "local" | "server"
  ) => Promise<void>;

  // Background sync management
  startBackgroundSync: () => void;
  stopBackgroundSync: () => void;

  // Offline state management
  setOnlineStatus: (isOnline: boolean) => void;
  queueOperation: (
    operation: Omit<QueuedOperation, "id" | "timestamp" | "retryCount">
  ) => void;
  processOperationQueue: () => Promise<void>;
  clearOperationQueue: () => void;

  // Audit logging
  setAuditLogger: (logger: ReceptionAuditLogger) => void;
}

type OrderStore = OrderStoreState & OrderStoreActions;

// Helper function to create initial order state
const createInitialOrderState = (): OrderState => ({
  items: [],
  customer: {},
  diningOption: "indoor",
  status: "draft",
  calculations: {
    subtotal: 0,
    vatAmount: 0,
    serviceChargeAmount: 0,
    customChargesTotal: 0,
    total: 0,
  },
  customCharges: [],
  timestamps: {
    created: new Date(),
    lastModified: new Date(),
  },
});

// Helper function to calculate order totals
const calculateOrderTotals = (
  items: OrderItem[],
  customCharges: CustomCharge[] = [],
  vatRate: number = 0.075, // 7.5% default VAT
  serviceChargeRate: number = 0.05 // 5% default service charge
): OrderCalculations => {
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

  const customChargesTotal = customCharges.reduce((sum, charge) => {
    if (charge.charge_type === "percentage") {
      return sum + (subtotal * charge.charge_value) / 100;
    }
    return sum + charge.charge_value;
  }, 0);

  const vatAmount = subtotal * vatRate;
  const serviceChargeAmount = subtotal * serviceChargeRate;
  const total = subtotal + vatAmount + serviceChargeAmount + customChargesTotal;

  return {
    subtotal,
    vatAmount,
    serviceChargeAmount,
    customChargesTotal,
    total,
  };
};

// Generate unique ticket number
const generateTicketNumber = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  return `TKT-${timestamp}-${random}`.toUpperCase();
};

// Simple encryption/decryption for sensitive data (basic implementation)
const encryptSensitiveData = (data: string): string => {
  // Basic encoding - in production, use proper encryption
  return btoa(data);
};

const decryptSensitiveData = (encryptedData: string): string => {
  try {
    return atob(encryptedData);
  } catch {
    return encryptedData; // Return as-is if decryption fails
  }
};

// Custom storage with encryption for sensitive data
const createEncryptedStorage = () => {
  return {
    getItem: (name: string): string | null => {
      try {
        const item = localStorage.getItem(name);
        if (!item) return null;

        const parsed = JSON.parse(item);

        // Decrypt sensitive customer data if present
        if (parsed.state?.currentOrder?.customer) {
          const customer = parsed.state.currentOrder.customer;
          if (customer.phone) {
            customer.phone = decryptSensitiveData(customer.phone);
          }
          if (customer.email) {
            customer.email = decryptSensitiveData(customer.email);
          }
          if (customer.address) {
            customer.address = decryptSensitiveData(customer.address);
          }
        }

        return JSON.stringify(parsed);
      } catch (error) {
        console.error("Error reading from localStorage:", error);
        return null;
      }
    },

    setItem: (name: string, value: string): void => {
      try {
        const parsed = JSON.parse(value);

        // Encrypt sensitive customer data before storing
        if (parsed.state?.currentOrder?.customer) {
          const customer = { ...parsed.state.currentOrder.customer };
          if (customer.phone) {
            customer.phone = encryptSensitiveData(customer.phone);
          }
          if (customer.email) {
            customer.email = encryptSensitiveData(customer.email);
          }
          if (customer.address) {
            customer.address = encryptSensitiveData(customer.address);
          }

          parsed.state.currentOrder.customer = customer;
        }

        localStorage.setItem(name, JSON.stringify(parsed));
      } catch (error) {
        console.error("Error writing to localStorage:", error);
        // Fallback to memory storage - will be lost on refresh
      }
    },

    removeItem: (name: string): void => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.error("Error removing from localStorage:", error);
      }
    },
  };
};

// Memory fallback storage for when localStorage fails
let memoryStorage: Record<string, string> = {};

const createMemoryStorage = () => {
  return {
    getItem: (name: string): string | null => {
      return memoryStorage[name] || null;
    },
    setItem: (name: string, value: string): void => {
      memoryStorage[name] = value;
    },
    removeItem: (name: string): void => {
      delete memoryStorage[name];
    },
  };
};

// Storage with fallback mechanism
const createStorageWithFallback = () => {
  // Test if localStorage is available
  const isLocalStorageAvailable = (() => {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  })();

  return isLocalStorageAvailable
    ? createEncryptedStorage()
    : createMemoryStorage();
};

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentOrder: null,
      openTickets: [],
      syncStatus: "idle",
      lastSyncTime: null,
      conflictedTickets: [],
      backgroundSyncInterval: null,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      operationQueue: [],
      isProcessingQueue: false,
      auditLogger: null,

      // Basic order management actions
      addItem: (menuItem) => {
        set((state) => {
          const currentOrder = state.currentOrder || createInitialOrderState();

          // Check if item already exists
          const existingItemIndex = currentOrder.items.findIndex(
            (item) => item.menu_item_id === menuItem.id
          );

          let updatedItems: OrderItem[];

          if (existingItemIndex >= 0) {
            // Update existing item quantity
            updatedItems = currentOrder.items.map((item, index) => {
              if (index === existingItemIndex) {
                const newQuantity = item.quantity + 1;
                return {
                  ...item,
                  quantity: newQuantity,
                  total_price: item.menu_item_price * newQuantity,
                };
              }
              return item;
            });
          } else {
            // Add new item
            const newItem: OrderItem = {
              id: `temp-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2)}`,
              order_id: currentOrder.id || "",
              menu_item_id: menuItem.id,
              menu_item_name: menuItem.name,
              menu_item_price: menuItem.price,
              quantity: 1,
              total_price: menuItem.price,
              image_url: menuItem.image_url,
              created_at: new Date().toISOString(),
            };
            updatedItems = [...currentOrder.items, newItem];
          }

          const updatedOrder: OrderState = {
            ...currentOrder,
            items: updatedItems,
            calculations: calculateOrderTotals(
              updatedItems,
              currentOrder.customCharges
            ),
            timestamps: {
              ...currentOrder.timestamps,
              lastModified: new Date(),
            },
          };

          return {
            currentOrder: updatedOrder,
          };
        });
      },

      updateQuantity: (itemId, quantity) => {
        set((state) => {
          if (!state.currentOrder) return state;

          const updatedItems = state.currentOrder.items
            .map((item) => {
              if (item.id === itemId) {
                return {
                  ...item,
                  quantity: Math.max(0, quantity),
                  total_price: item.menu_item_price * Math.max(0, quantity),
                };
              }
              return item;
            })
            .filter((item) => item.quantity > 0); // Remove items with 0 quantity

          const updatedOrder: OrderState = {
            ...state.currentOrder,
            items: updatedItems,
            calculations: calculateOrderTotals(
              updatedItems,
              state.currentOrder.customCharges
            ),
            timestamps: {
              ...state.currentOrder.timestamps,
              lastModified: new Date(),
            },
          };

          return {
            currentOrder: updatedOrder,
          };
        });
      },

      removeItem: (itemId) => {
        set((state) => {
          if (!state.currentOrder) return state;

          const updatedItems = state.currentOrder.items.filter(
            (item) => item.id !== itemId
          );

          const updatedOrder: OrderState = {
            ...state.currentOrder,
            items: updatedItems,
            calculations: calculateOrderTotals(
              updatedItems,
              state.currentOrder.customCharges
            ),
            timestamps: {
              ...state.currentOrder.timestamps,
              lastModified: new Date(),
            },
          };

          return {
            currentOrder: updatedOrder,
          };
        });
      },

      clearCurrentOrder: () => {
        set({ currentOrder: null });
      },

      // Customer and order details
      updateCustomer: (customer) => {
        set((state) => {
          if (!state.currentOrder) {
            const newOrder = createInitialOrderState();
            newOrder.customer = { ...newOrder.customer, ...customer };
            return { currentOrder: newOrder };
          }

          const updatedOrder: OrderState = {
            ...state.currentOrder,
            customer: { ...state.currentOrder.customer, ...customer },
            timestamps: {
              ...state.currentOrder.timestamps,
              lastModified: new Date(),
            },
          };

          return { currentOrder: updatedOrder };
        });
      },

      updateDiningOption: (option) => {
        set((state) => {
          if (!state.currentOrder) {
            const newOrder = createInitialOrderState();
            newOrder.diningOption = option;
            return { currentOrder: newOrder };
          }

          const updatedOrder: OrderState = {
            ...state.currentOrder,
            diningOption: option,
            timestamps: {
              ...state.currentOrder.timestamps,
              lastModified: new Date(),
            },
          };

          return { currentOrder: updatedOrder };
        });
      },

      updateTableNumber: (tableNumber) => {
        set((state) => {
          if (!state.currentOrder) {
            const newOrder = createInitialOrderState();
            newOrder.tableNumber = tableNumber;
            return { currentOrder: newOrder };
          }

          const updatedOrder: OrderState = {
            ...state.currentOrder,
            tableNumber,
            timestamps: {
              ...state.currentOrder.timestamps,
              lastModified: new Date(),
            },
          };

          return { currentOrder: updatedOrder };
        });
      },

      updateSpecialInstructions: (instructions) => {
        set((state) => {
          if (!state.currentOrder) {
            const newOrder = createInitialOrderState();
            newOrder.specialInstructions = instructions;
            return { currentOrder: newOrder };
          }

          const updatedOrder: OrderState = {
            ...state.currentOrder,
            specialInstructions: instructions,
            timestamps: {
              ...state.currentOrder.timestamps,
              lastModified: new Date(),
            },
          };

          return { currentOrder: updatedOrder };
        });
      },

      // Calculations
      recalculateOrder: () => {
        set((state) => {
          if (!state.currentOrder) return state;

          const updatedOrder: OrderState = {
            ...state.currentOrder,
            calculations: calculateOrderTotals(
              state.currentOrder.items,
              state.currentOrder.customCharges
            ),
            timestamps: {
              ...state.currentOrder.timestamps,
              lastModified: new Date(),
            },
          };

          return { currentOrder: updatedOrder };
        });
      },

      // Open ticket management actions
      saveAsOpenTicket: async () => {
        const state = get();
        if (!state.currentOrder) {
          throw new Error("No current order to save as ticket");
        }

        if (state.currentOrder.items.length === 0) {
          throw new Error("Cannot save empty order as ticket");
        }

        const ticketNumber = generateTicketNumber();
        const ticketId = `ticket-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}`;

        // Create the open ticket
        const openTicket: OpenTicket = {
          id: ticketId,
          ticketNumber,
          orderState: {
            ...state.currentOrder,
            id: ticketId,
            ticketNumber,
            status: "open_ticket",
            timestamps: {
              ...state.currentOrder.timestamps,
              savedAsTicket: new Date(),
            },
          },
          status: "pending_payment",
          priority: "normal",
          createdBy: "current-staff", // TODO: Get from auth context
          createdAt: new Date(),
          lastModified: new Date(),
          paymentStatus: "pending",
        };

        // Add to open tickets list locally first
        set((state) => ({
          openTickets: [...state.openTickets, openTicket],
          currentOrder: null, // Clear current order after saving as ticket
        }));

        // Try to sync to server or queue for later if offline
        const currentState = get();
        if (currentState.isOnline) {
          try {
            const response = await fetch("/api/tickets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ticketNumber: openTicket.ticketNumber,
                orderState: openTicket.orderState,
                status: openTicket.status,
                priority: openTicket.priority,
                estimatedCompletionTime:
                  openTicket.estimatedCompletionTime?.toISOString(),
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(
                "Failed to sync ticket to server:",
                response.status,
                errorText
              );
              // Keep ticket locally but mark as needing sync
              set((state) => ({
                conflictedTickets: [...state.conflictedTickets, ticketId],
              }));
            } else {
              // Successfully created on server, reload tickets to get the latest data
              await get().loadTicketsFromServer();
            }
          } catch (error) {
            console.error("Failed to sync ticket to server:", error);
            // Keep ticket locally but mark as needing sync
            set((state) => ({
              conflictedTickets: [...state.conflictedTickets, ticketId],
            }));
          }
        } else {
          // Queue operation for when we come back online
          get().queueOperation({
            type: "create",
            data: {
              ticketNumber: openTicket.ticketNumber,
              orderState: openTicket.orderState,
              status: openTicket.status,
              priority: openTicket.priority,
              estimatedCompletionTime:
                openTicket.estimatedCompletionTime?.toISOString(),
            },
          });
        }

        return ticketNumber;
      },

      loadOpenTicket: (ticketId) => {
        const state = get();
        const ticket = state.openTickets.find((t) => t.id === ticketId);

        if (!ticket) {
          throw new Error(`Ticket with ID ${ticketId} not found`);
        }

        // Load the ticket's order state into current order
        set((state) => ({
          currentOrder: {
            ...ticket.orderState,
            status: "draft", // Reset to draft when loading for editing
            timestamps: {
              ...ticket.orderState.timestamps,
              lastModified: new Date(),
            },
          },
        }));
      },

      deleteOpenTicket: (ticketId) => {
        set((state) => ({
          openTickets: state.openTickets.filter(
            (ticket) => ticket.id !== ticketId
          ),
        }));
      },

      updateTicketStatus: (ticketId, status) => {
        set((state) => ({
          openTickets: state.openTickets.map((ticket) => {
            if (ticket.id === ticketId) {
              return {
                ...ticket,
                status,
                lastModified: new Date(),
                // Update payment status based on order status
                paymentStatus:
                  status === "completed" ? "completed" : ticket.paymentStatus,
              };
            }
            return ticket;
          }),
        }));
      },

      // Additional helper actions for ticket management
      updateTicketPriority: (
        ticketId: string,
        priority: OpenTicket["priority"]
      ) => {
        set((state) => ({
          openTickets: state.openTickets.map((ticket) => {
            if (ticket.id === ticketId) {
              return {
                ...ticket,
                priority,
                lastModified: new Date(),
              };
            }
            return ticket;
          }),
        }));
      },

      getTicketById: (ticketId: string): OpenTicket | undefined => {
        const state = get();
        return state.openTickets.find((ticket) => ticket.id === ticketId);
      },

      getSortedTickets: (): OpenTicket[] => {
        const state = get();
        return [...state.openTickets].sort((a, b) => {
          // Sort by status priority first (incomplete orders first)
          const statusPriority = {
            pending_payment: 1,
            preparing: 2,
            ready: 3,
            completed: 4,
          };

          const aPriority = statusPriority[a.status] || 5;
          const bPriority = statusPriority[b.status] || 5;

          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }

          // Within same status, sort by creation time (oldest first)
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
      },

      completeTicketPayment: (ticketId: string) => {
        set((state) => {
          const updatedTickets = state.openTickets.map((ticket) => {
            if (ticket.id === ticketId) {
              return {
                ...ticket,
                status: "completed" as const,
                paymentStatus: "completed" as const,
                lastModified: new Date(),
              };
            }
            return ticket;
          });

          // Remove completed tickets from the list after a short delay
          // In a real app, you might want to keep them for a while or move to a different store
          return {
            openTickets: updatedTickets.filter(
              (ticket) => ticket.status !== "completed"
            ),
          };
        });
      },

      // Server synchronization methods
      syncWithServer: async () => {
        // Since we're using real-time updates from the orders table,
        // we just need to refresh the tickets from the server
        try {
          await get().loadTicketsFromServer();
        } catch (error) {
          console.error("Sync with server failed:", error);
          throw error;
        }
      },

      syncTicketWithServer: async (ticketId: string) => {
        // Since we're using the orders table directly with real-time updates,
        // individual ticket sync is not needed. The real-time subscription
        // handles all updates automatically.
        console.log(
          `Sync for ticket ${ticketId} skipped - using real-time updates`
        );
        return Promise.resolve();
      },

      resolveConflict: async (
        ticketId: string,
        resolution: "local" | "server"
      ) => {
        // With real-time updates, conflicts are automatically resolved
        // Just remove from conflicted list and refresh
        set((state) => ({
          conflictedTickets: state.conflictedTickets.filter(
            (id) => id !== ticketId
          ),
        }));

        // Refresh tickets to get latest state
        await get().loadTicketsFromServer();
      },

      startBackgroundSync: () => {
        const state = get();

        // Clear existing interval if any
        if (state.backgroundSyncInterval) {
          clearInterval(state.backgroundSyncInterval);
        }

        // Start new background sync every 30 seconds
        const interval = setInterval(async () => {
          try {
            await get().syncWithServer();
          } catch (error) {
            console.error("Background sync failed:", error);
          }
        }, 30000);

        set({ backgroundSyncInterval: interval });
      },

      stopBackgroundSync: () => {
        const state = get();

        if (state.backgroundSyncInterval) {
          clearInterval(state.backgroundSyncInterval);
          set({ backgroundSyncInterval: null });
        }
      },

      // Offline state management methods
      setOnlineStatus: (isOnline: boolean) => {
        const wasOffline = !get().isOnline;

        set({ isOnline });

        // If we just came back online, process queued operations
        if (isOnline && wasOffline) {
          get().processOperationQueue();
        }
      },

      queueOperation: (operation) => {
        const queuedOp: QueuedOperation = {
          ...operation,
          id: `op-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          timestamp: new Date(),
          retryCount: 0,
        };

        set((state) => ({
          operationQueue: [...state.operationQueue, queuedOp],
        }));
      },

      processOperationQueue: async () => {
        const state = get();

        if (state.isProcessingQueue || state.operationQueue.length === 0) {
          return;
        }

        set({ isProcessingQueue: true });

        const processedOperations: string[] = [];
        const failedOperations: QueuedOperation[] = [];

        for (const operation of state.operationQueue) {
          try {
            switch (operation.type) {
              case "create":
                const createResponse = await fetch("/api/tickets", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(operation.data),
                });

                if (!createResponse.ok) {
                  throw new Error(`Create failed: ${createResponse.status}`);
                }
                break;

              case "update":
                const updateResponse = await fetch(
                  `/api/tickets/${operation.ticketId}`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(operation.data),
                  }
                );

                if (updateResponse.status === 409) {
                  // Conflict - add to conflicted tickets
                  set((state) => ({
                    conflictedTickets: [
                      ...state.conflictedTickets,
                      operation.ticketId!,
                    ],
                  }));
                } else if (!updateResponse.ok) {
                  throw new Error(`Update failed: ${updateResponse.status}`);
                }
                break;

              case "delete":
                const deleteResponse = await fetch(
                  `/api/tickets/${operation.ticketId}`,
                  {
                    method: "DELETE",
                  }
                );

                if (!deleteResponse.ok && deleteResponse.status !== 404) {
                  throw new Error(`Delete failed: ${deleteResponse.status}`);
                }
                break;
            }

            processedOperations.push(operation.id);
          } catch (error) {
            console.error(
              `Failed to process operation ${operation.id}:`,
              error
            );

            // Retry logic
            if (operation.retryCount < 3) {
              failedOperations.push({
                ...operation,
                retryCount: operation.retryCount + 1,
              });
            } else {
              console.error(
                `Operation ${operation.id} failed after 3 retries, discarding`
              );
            }
          }
        }

        // Update queue - remove processed operations, keep failed ones for retry
        set((state) => ({
          operationQueue: [
            ...failedOperations,
            ...state.operationQueue.filter(
              (op) => !processedOperations.includes(op.id)
            ),
          ],
          isProcessingQueue: false,
        }));

        // If there are still operations in queue, schedule another processing attempt
        if (failedOperations.length > 0) {
          setTimeout(() => {
            get().processOperationQueue();
          }, 5000); // Retry after 5 seconds
        }
      },

      clearOperationQueue: () => {
        set({ operationQueue: [] });
      },

      // Load tickets from server
      loadTicketsFromServer: async (dateFrom?: string, dateTo?: string) => {
        try {
          set({ syncStatus: "syncing" });

          // Build query parameters
          const params = new URLSearchParams({
            limit: "100",
            ...(dateFrom && { dateFrom }),
            ...(dateTo && { dateTo }),
          });

          const response = await fetch(`/api/tickets?${params.toString()}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Server response error:", response.status, errorText);
            throw new Error(
              `Failed to load tickets: ${response.status} - ${errorText}`
            );
          }

          const responseData = await response.json();
          const serverTickets = responseData.tickets || [];

          // Transform server tickets to proper format
          const transformedTickets: OpenTicket[] = serverTickets.map(
            (ticket: any) => ({
              id: ticket.id,
              ticketNumber: ticket.ticketNumber || ticket.ticket_number,
              orderState: ticket.orderState || ticket.order_data,
              status: ticket.status,
              priority: ticket.priority,
              createdBy: ticket.createdBy || ticket.created_by,
              createdAt: new Date(ticket.createdAt || ticket.created_at),
              lastModified: new Date(
                ticket.lastModified || ticket.last_modified
              ),
              estimatedCompletionTime:
                ticket.estimatedCompletionTime ||
                ticket.estimated_completion_time
                  ? new Date(
                      ticket.estimatedCompletionTime ||
                        ticket.estimated_completion_time
                    )
                  : undefined,
              paymentStatus: ticket.paymentStatus || ticket.payment_status,
            })
          );

          set({
            openTickets: transformedTickets,
            syncStatus: "idle",
            lastSyncTime: new Date(),
          });
        } catch (error) {
          console.error("Failed to load tickets from server:", error);
          set({ syncStatus: "error" });
          throw error;
        }
      },

      // Audit logging methods
      setAuditLogger: (logger: ReceptionAuditLogger) => {
        set({ auditLogger: logger });
      },
    }),
    {
      name: "reception-order-state",
      storage: createJSONStorage(() => createStorageWithFallback()),
      partialize: (state) => ({
        // Only persist currentOrder, not openTickets (they should come from server)
        currentOrder: state.currentOrder,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.currentOrder) {
          // Update timestamps on rehydration to reflect that data was restored
          state.currentOrder.timestamps.lastModified = new Date();
        }
      },
    }
  )
);
