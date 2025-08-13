"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- Type Definitions ---

export interface InventoryCategory {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  category_type: 'food' | 'beverage' | 'supplies' | 'equipment' | 'cleaning' | 'other';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  credit_limit: number;
  current_balance: number;
  rating?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  business_id: string;
  category_id?: string;
  supplier_id?: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  unit_of_measure: 'pieces' | 'kg' | 'grams' | 'liters' | 'ml' | 'boxes' | 'bottles' | 'cans' | 'bags' | 'packs' | 'units';
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  unit_cost: number;
  selling_price: number;
  cost_per_unit: number;
  expiry_date?: string;
  location?: string;
  is_perishable: boolean;
  is_alcoholic: boolean;
  is_ingredient: boolean;
  is_available: boolean;
  image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  category?: InventoryCategory;
  supplier?: Supplier;
}

export interface InventoryTransaction {
  id: string;
  business_id: string;
  item_id: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'waste' | 'transfer_in' | 'transfer_out' | 'return' | 'damage' | 'expiry';
  quantity: number;
  unit_cost: number;
  total_cost: number;
  previous_stock: number;
  new_stock: number;
  reference_number?: string;
  supplier_id?: string;
  order_id?: string;
  staff_id?: string;
  notes?: string;
  transaction_date: string;
  created_at: string;
  item?: InventoryItem;
  supplier?: Supplier;
}

export interface InventoryAlert {
  id: string;
  business_id: string;
  item_id: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired' | 'overstock' | 'price_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  item?: InventoryItem;
}

export interface PurchaseOrder {
  id: string;
  business_id: string;
  supplier_id: string;
  po_number: string;
  order_date: string;
  expected_delivery_date?: string;
  delivery_date?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
}

export interface MenuItemIngredient {
  id: string;
  menu_item_id: number;
  inventory_item_id: string;
  quantity_required: number;
  unit_of_measure: string;
  is_optional: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  inventory_item?: InventoryItem;
}

// --- Pagination Types ---

export interface PaginationQueryProps {
  page: number;
  perPage?: number;
}

// --- Server Action Functions ---

/**
 * Fetches inventory categories with pagination
 */
export async function fetchInventoryCategories({
  page,
  perPage = 10,
  businessId,
}: PaginationQueryProps & { businessId: string }): Promise<any> {
  const supabase = await createClient();
  try {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage - 1;

    const { data, count, error } = await supabase
      .from("inventory_categories")
      .select("*", { count: "exact" })
      .eq("business_id", businessId)
      .eq("is_active", true)
      .range(startIndex, endIndex)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching inventory categories:", error.message);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
    };
  } catch (error) {
    console.error("Error in fetchInventoryCategories:", error);
    throw error;
  }
}

/**
 * Fetches inventory items with pagination and filters
 */
export async function fetchInventoryItems({
  page,
  perPage = 10,
  businessId,
  categoryId,
  search,
  lowStock,
  expiring,
}: PaginationQueryProps & { 
  businessId: string;
  categoryId?: string;
  search?: string;
  lowStock?: boolean;
  expiring?: boolean;
}): Promise<any> {
  const supabase = await createClient();
  try {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage - 1;

    let query = supabase
      .from("inventory_items")
      .select("*, category:inventory_categories(*), supplier:suppliers(*)", { count: "exact" })
      .eq("business_id", businessId)
      .eq("is_available", true);

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    if (lowStock) {
      query = query.lte("current_stock", "minimum_stock");
    }

    if (expiring) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query = query.lte("expiry_date", thirtyDaysFromNow.toISOString().split('T')[0]);
    }

    const { data, count, error } = await query
      .range(startIndex, endIndex)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching inventory items:", error.message);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
    };
  } catch (error) {
    console.error("Error in fetchInventoryItems:", error);
    throw error;
  }
}

/**
 * Fetches suppliers with pagination
 */
export async function fetchSuppliers({
  page,
  perPage = 10,
  businessId,
}: PaginationQueryProps & { businessId: string }): Promise<any> {
  const supabase = await createClient();
  try {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage - 1;

    const { data, count, error } = await supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .eq("business_id", businessId)
      .eq("is_active", true)
      .range(startIndex, endIndex)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching suppliers:", error.message);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
    };
  } catch (error) {
    console.error("Error in fetchSuppliers:", error);
    throw error;
  }
}

/**
 * Fetches inventory alerts
 */
export async function fetchInventoryAlerts({
  page,
  perPage = 10,
  businessId,
  resolved,
}: PaginationQueryProps & { 
  businessId: string;
  resolved?: boolean;
}): Promise<any> {
  const supabase = await createClient();
  try {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage - 1;

    let query = supabase
      .from("inventory_alerts")
      .select("*, item:inventory_items(*)", { count: "exact" })
      .eq("business_id", businessId);

    if (resolved !== undefined) {
      query = query.eq("is_resolved", resolved);
    }

    const { data, count, error } = await query
      .range(startIndex, endIndex)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching inventory alerts:", error.message);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
    };
  } catch (error) {
    console.error("Error in fetchInventoryAlerts:", error);
    throw error;
  }
}

/**
 * Fetches inventory transactions
 */
export async function fetchInventoryTransactions({
  page,
  perPage = 10,
  businessId,
  itemId,
  transactionType,
}: PaginationQueryProps & { 
  businessId: string;
  itemId?: string;
  transactionType?: string;
}): Promise<any> {
  const supabase = await createClient();
  try {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage - 1;

    let query = supabase
      .from("inventory_transactions")
      .select("*, item:inventory_items(*), supplier:suppliers(*)", { count: "exact" })
      .eq("business_id", businessId);

    if (itemId) {
      query = query.eq("item_id", itemId);
    }

    if (transactionType) {
      query = query.eq("transaction_type", transactionType);
    }

    const { data, count, error } = await query
      .range(startIndex, endIndex)
      .order("transaction_date", { ascending: false });

    if (error) {
      console.error("Error fetching inventory transactions:", error.message);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
    };
  } catch (error) {
    console.error("Error in fetchInventoryTransactions:", error);
    throw error;
  }
}

/**
 * Adds a new inventory category
 */
export async function addInventoryCategory(
  formData: FormData
): Promise<{ success: boolean; error?: string; category?: InventoryCategory }> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const businessOwner = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (!businessOwner.data) {
      return { success: false, error: "Business owner not found" };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const categoryType = formData.get("category_type") as string;
    const parentCategoryId = formData.get("parent_category_id") as string;

    if (!name || !categoryType) {
      return { success: false, error: "Name and category type are required" };
    }

    const { data, error } = await supabase
      .from("inventory_categories")
      .insert([{
        business_id: businessOwner.data.id,
        name,
        description,
        category_type: categoryType,
        parent_category_id: parentCategoryId || null,
        is_active: true,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding inventory category:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/inventory/categories");
    return { success: true, category: data as InventoryCategory };
  } catch (error: any) {
    console.error("Error in addInventoryCategory:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Adds a new inventory item
 */
export async function addInventoryItem(
  formData: FormData
): Promise<{ success: boolean; error?: string; item?: InventoryItem }> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const businessOwner = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (!businessOwner.data) {
      return { success: false, error: "Business owner not found" };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const sku = formData.get("sku") as string;
    const categoryId = formData.get("category_id") as string;
    const supplierId = formData.get("supplier_id") as string;
    const unitOfMeasure = formData.get("unit_of_measure") as string;
    const minimumStock = parseFloat(formData.get("minimum_stock") as string);
    const reorderPoint = parseFloat(formData.get("reorder_point") as string);
    const reorderQuantity = parseFloat(formData.get("reorder_quantity") as string);
    const unitCost = parseFloat(formData.get("unit_cost") as string);
    const sellingPrice = parseFloat(formData.get("selling_price") as string);
    const isPerishable = formData.get("is_perishable") === "true";
    const expiryDate = formData.get("expiry_date") as string;
    const location = formData.get("location") as string;
    const isAlcoholic = formData.get("is_alcoholic") === "true";
    const isIngredient = formData.get("is_ingredient") === "true";

    if (!name || !unitOfMeasure || isNaN(minimumStock) || isNaN(unitCost)) {
      return { success: false, error: "Required fields are missing or invalid" };
    }

    const { data, error } = await supabase
      .from("inventory_items")
      .insert([{
        business_id: businessOwner.data.id,
        name,
        description,
        sku,
        category_id: categoryId || null,
        supplier_id: supplierId || null,
        unit_of_measure: unitOfMeasure,
        minimum_stock: minimumStock,
        reorder_point: reorderPoint,
        reorder_quantity: reorderQuantity,
        unit_cost: unitCost,
        selling_price: sellingPrice,
        cost_per_unit: unitCost,
        is_perishable: isPerishable,
        expiry_date: expiryDate || null,
        location,
        is_alcoholic: isAlcoholic,
        is_ingredient: isIngredient,
        is_available: true,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding inventory item:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/inventory/items");
    return { success: true, item: data as InventoryItem };
  } catch (error: any) {
    console.error("Error in addInventoryItem:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Records an inventory transaction
 */
export async function recordInventoryTransaction(
  formData: FormData
): Promise<{ success: boolean; error?: string; transaction?: InventoryTransaction }> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const businessOwner = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (!businessOwner.data) {
      return { success: false, error: "Business owner not found" };
    }

    const itemId = formData.get("item_id") as string;
    const transactionType = formData.get("transaction_type") as string;
    const quantity = parseFloat(formData.get("quantity") as string);
    const unitCost = parseFloat(formData.get("unit_cost") as string);
    const supplierId = formData.get("supplier_id") as string;
    const orderId = formData.get("order_id") as string;
    const notes = formData.get("notes") as string;

    if (!itemId || !transactionType || isNaN(quantity)) {
      return { success: false, error: "Required fields are missing or invalid" };
    }

    // Get current stock level
    const { data: currentItem } = await supabase
      .from("inventory_items")
      .select("current_stock")
      .eq("id", itemId)
      .single();

    if (!currentItem) {
      return { success: false, error: "Inventory item not found" };
    }

    const previousStock = currentItem.current_stock;
    let newStock = previousStock;

    // Calculate new stock based on transaction type
    if (['purchase', 'transfer_in', 'return'].includes(transactionType)) {
      newStock = previousStock + quantity;
    } else if (['sale', 'waste', 'transfer_out', 'damage', 'expiry'].includes(transactionType)) {
      newStock = previousStock - quantity;
    }

    const totalCost = quantity * unitCost;

    const { data, error } = await supabase
      .from("inventory_transactions")
      .insert([{
        business_id: businessOwner.data.id,
        item_id: itemId,
        transaction_type: transactionType,
        quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        previous_stock: previousStock,
        new_stock: newStock,
        supplier_id: supplierId || null,
        order_id: orderId || null,
        notes,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error recording inventory transaction:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/inventory/transactions");
    return { success: true, transaction: data as InventoryTransaction };
  } catch (error: any) {
    console.error("Error in recordInventoryTransaction:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Resolves an inventory alert
 */
export async function resolveInventoryAlert(
  alertId: string,
  resolvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from("inventory_alerts")
      .update({
        is_resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) {
      console.error("Error resolving inventory alert:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/inventory/alerts");
    return { success: true };
  } catch (error: any) {
    console.error("Error in resolveInventoryAlert:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Gets inventory dashboard statistics
 */
export async function getInventoryStats(businessId: string): Promise<any> {
  const supabase = await createClient();
  
  try {
    // Get total items
    const { count: totalItems } = await supabase
      .from("inventory_items")
      .select("*", { count: "exact" })
      .eq("business_id", businessId)
      .eq("is_available", true);

    // Get all items to calculate low stock and expiring counts
    const { data: allItems } = await supabase
      .from("inventory_items")
      .select("current_stock, minimum_stock, expiry_date")
      .eq("business_id", businessId)
      .eq("is_available", true);

    // Calculate low stock items count
    const lowStockItems = allItems?.filter(item => 
      item.current_stock <= item.minimum_stock
    ).length || 0;

    // Calculate expiring items count (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const expiringItems = allItems?.filter(item => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= sevenDaysFromNow;
    }).length || 0;

    // Get active alerts
    const { count: activeAlerts } = await supabase
      .from("inventory_alerts")
      .select("*", { count: "exact" })
      .eq("business_id", businessId)
      .eq("is_resolved", false);

    // Get total inventory value
    const { data: valuationData } = await supabase
      .from("inventory_items")
      .select("current_stock, unit_cost")
      .eq("business_id", businessId)
      .eq("is_available", true);

    const totalValue = valuationData?.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.unit_cost || 0)), 0) || 0;

    return {
      totalItems: totalItems || 0,
      lowStockItems: lowStockItems || 0,
      expiringItems: expiringItems || 0,
      activeAlerts: activeAlerts || 0,
      totalValue,
    };
  } catch (error) {
    console.error("Error getting inventory stats:", error);
    throw error;
  }
}

/**
 * Gets low stock items
 */
export async function getLowStockItems(businessId: string): Promise<InventoryItem[]> {
  const supabase = await createClient();
  
  try {
    // First get all items for this business
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*, category:inventory_categories(*), supplier:suppliers(*)")
      .eq("business_id", businessId)
      .eq("is_available", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching low stock items:", error);
      throw error;
    }

    // Filter for low stock items in JavaScript
    const lowStockItems = data?.filter(item => 
      item.current_stock <= item.minimum_stock
    ) || [];

    return lowStockItems;
  } catch (error) {
    console.error("Error in getLowStockItems:", error);
    throw error;
  }
}

/**
 * Gets expiring items
 */
export async function getExpiringItems(businessId: string): Promise<any[]> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*, category:inventory_categories(*), supplier:suppliers(*)")
      .eq("business_id", businessId)
      .eq("is_available", true)
      .not("expiry_date", "is", null)
      .order("expiry_date", { ascending: true });

    if (error) {
      console.error("Error fetching expiring items:", error);
      throw error;
    }

    // Filter for items expiring within 30 days in JavaScript
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringItems = data?.filter(item => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= thirtyDaysFromNow;
    }) || [];

    return expiringItems;
  } catch (error) {
    console.error("Error in getExpiringItems:", error);
    throw error;
  }
}

/**
 * Gets inventory valuation
 */
export async function getInventoryValuation(businessId: string): Promise<any[]> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, name, current_stock, unit_cost, category:inventory_categories(name, category_type)")
      .eq("business_id", businessId)
      .eq("is_available", true)
      .gt("current_stock", 0)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching inventory valuation:", error);
      throw error;
    }

    // Calculate total value for each item
    const valuationData = data?.map(item => ({
      ...item,
      total_value: (item.current_stock || 0) * (item.unit_cost || 0)
    })) || [];

    return valuationData;
  } catch (error) {
    console.error("Error in getInventoryValuation:", error);
    throw error;
  }
}
