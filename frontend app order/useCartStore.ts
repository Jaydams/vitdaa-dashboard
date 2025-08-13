import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient();

export type DiningOption = "indoor" | "delivery" | null;
export type PaymentMethod = "cash" | "wallet" | null;

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  business_name: string;
}

interface DeliveryLocation {
  id: string;
  name: string;
  price: number;
}

interface CartState {
  items: CartItem[];
  businessName: string | null;
  anonymousToken: string | null;
  status: "active" | "ordered" | "expired";
  diningOption: DiningOption;
  selectedTableId: string | null;
  takeawayPacks: number;
  takeawayPackPrice: number;
  deliveryLocations: DeliveryLocation[];
  selectedDeliveryLocationId: string | null;
  paymentMethod: PaymentMethod;
  riderName: string;
  riderPhone: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;

  setDiningOption: (option: DiningOption) => void;
  selectTable: (id: string) => void;
  setTakeawayPacks: (packs: number) => void;
  setDeliveryLocations: (locations: DeliveryLocation[]) => void;
  setSelectedDeliveryLocation: (id: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setRiderInfo: (name: string, phone: string) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setCustomerAddress: (address: string) => void;

  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  increaseItemQuantity: (id: number) => void;
  decreaseItemQuantity: (id: number) => void;
  syncToSupabase: () => Promise<void>;
  getTotalAmount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      businessName: null,
      anonymousToken: uuidv4(),
      status: "active",
      diningOption: null,
      selectedTableId: null,
      takeawayPacks: 0,
      takeawayPackPrice: 100,
      deliveryLocations: [],
      selectedDeliveryLocationId: null,
      paymentMethod: null,
      riderName: "",
      riderPhone: "",
      customerName: "",
      customerPhone: "",
      customerAddress: "",

      setDiningOption: (option) => set({ diningOption: option }),
      selectTable: (id) => set({ selectedTableId: id }),
      setTakeawayPacks: (packs) => set({ takeawayPacks: packs }),
      setDeliveryLocations: (locations) =>
        set({ deliveryLocations: locations }),
      setSelectedDeliveryLocation: (id) =>
        set({ selectedDeliveryLocationId: id }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setRiderInfo: (name, phone) =>
        set({ riderName: name, riderPhone: phone }),
      setCustomerName: (name) => set({ customerName: name }),
      setCustomerPhone: (phone) => set({ customerPhone: phone }),
      setCustomerAddress: (address) => set({ customerAddress: address }),

      getTotalAmount: () => {
        const {
          items,
          takeawayPacks,
          takeawayPackPrice,
          deliveryLocations,
          selectedDeliveryLocationId,
        } = get();

        const subtotal = items.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0
        );
        const vat = subtotal * 0.075;
        const service = subtotal * 0.025;
        const takeaway = takeawayPacks * takeawayPackPrice;
        const deliveryPrice =
          deliveryLocations.find((loc) => loc.id === selectedDeliveryLocationId)
            ?.price || 0;

        return Math.round(subtotal + vat + service + takeaway + deliveryPrice);
      },

      addItem: (item) => {
        const { items, businessName } = get();

        if (businessName && businessName !== item.business_name) {
          toast.error("You can only add items from one restaurant.");
          return;
        }

        const existingItem = items.find((i) => i.id === item.id);
        const updatedItems = existingItem
          ? items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            )
          : [...items, { ...item, quantity: 1 }];

        set({ items: updatedItems, businessName: item.business_name });
        get().syncToSupabase();
      },

      removeItem: (id) => {
        const filtered = get().items.filter((i) => i.id !== id);
        const newBusiness = filtered.length ? filtered[0].business_name : null;
        set({ items: filtered, businessName: newBusiness });
      },

      increaseItemQuantity: (id) => {
        const { items } = get();
        const updatedItems = items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        );
        set({ items: updatedItems });
      },

      decreaseItemQuantity: (id) => {
        const { items } = get();
        const updatedItems = items
          .map((item) =>
            item.id === id ? { ...item, quantity: item.quantity - 1 } : item
          )
          .filter((item) => item.quantity > 0);

        const businessName =
          updatedItems.length > 0 ? updatedItems[0].business_name : null;

        set({ items: updatedItems, businessName });
      },

      clearCart: () => {
        set({
          items: [],
          businessName: null,
          status: "active",
          diningOption: null,
          selectedTableId: null,
          takeawayPacks: 0,
          selectedDeliveryLocationId: null,
          paymentMethod: null,
          riderName: "",
          riderPhone: "",
          customerName: "",
          customerPhone: "",
          customerAddress: "",
        });
      },

      syncToSupabase: async () => {
        const {
          items,
          businessName,
          anonymousToken,
          getTotalAmount,
          takeawayPacks,
          takeawayPackPrice,
          selectedDeliveryLocationId,
          diningOption,
          riderName,
          riderPhone,
          customerName,
          customerPhone,
          customerAddress,
        } = get();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const user_id = user?.id;
        if (items.length === 0 || (!user_id && !anonymousToken)) return;

        const totalAmount = getTotalAmount();

        const { error } = await supabase.from("cart").upsert({
          user_id: user_id ?? null,
          restaurant_id: null,
          items: items.map((item) => ({
            menu_item_id: item.id,
            quantity: item.quantity,
          })),
          anonymous_token: user_id ? null : anonymousToken,
          status: "active",
          updated_at: new Date(),
          total: totalAmount,
          takeaway_packs: takeawayPacks,
          takeaway_pack_price: takeawayPackPrice,
          delivery_location_id: selectedDeliveryLocationId,
          delivery_method: diningOption,
          rider_name: riderName,
          rider_phone: riderPhone,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
        });

        if (error) {
          // toast.error("Failed to sync cart.");
          console.error("Sync error:", error.message);
        } else {
          toast.success("Cart synced.");
        }
      },
    }),
    {
      name: "vitdaa-cart",
    }
  )
);
