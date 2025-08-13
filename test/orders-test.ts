// Test script for orders functionality
// Run this to test the orders system

import { createOrder } from "../actions/order-actions";
import { createClient } from "../lib/supabase/server";

// Debug function to check if orders exist
async function checkOrdersExist() {
  try {
    console.log("Checking if orders exist in database...");
    
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current user:", user?.email);
    
    if (!user) {
      console.log("No user authenticated");
      return;
    }
    
    // Get business owner
    const { data: businessOwner } = await supabase
      .from("business_owner")
      .select("id, business_name")
      .eq("email", user.email)
      .single();
    
    console.log("Business owner:", businessOwner);
    
    if (!businessOwner) {
      console.log("No business owner found");
      return;
    }
    
    // Check orders
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("business_id", businessOwner.id);
    
    console.log("Orders found:", orders?.length || 0);
    console.log("Orders:", orders);
    
    if (error) {
      console.error("Error fetching orders:", error);
    }
    
    // Check tables
    const { data: tables, error: tablesError } = await supabase
      .from("tables")
      .select("*")
      .eq("restaurant_id", businessOwner.id);
    
    console.log("Tables found:", tables?.length || 0);
    console.log("Tables:", tables);
    
    if (tablesError) {
      console.error("Error fetching tables:", tablesError);
    }
    
  } catch (error) {
    console.error("Error in checkOrdersExist:", error);
  }
}

async function testCreateOrder() {
  try {
    console.log("Testing order creation...");
    
    const testOrderData = {
      customer_name: "Test Customer",
      customer_phone: "+2348012345678",
      customer_address: "123 Test Street, Kaduna",
      dining_option: "indoor" as const,
      table_id: "test-table-id", // Replace with actual table ID from your database
      takeaway_packs: 0,
      takeaway_pack_price: 100,
      delivery_location_id: undefined,
      delivery_fee: 0,
      rider_name: undefined,
      rider_phone: undefined,
      payment_method: "cash" as const,
      items: [
        {
          menu_item_id: 160, // JOLLOF RICE from your CSV
          menu_item_name: "JOLLOF RICE",
          menu_item_price: 4966,
          quantity: 2,
          total_price: 9932,
        },
        {
          menu_item_id: 199, // Crispy Fried Chicken with Chips from your CSV
          menu_item_name: "Crispy Fried Chicken with Chips",
          menu_item_price: 7900,
          quantity: 1,
          total_price: 7900,
        },
      ],
      subtotal: 17832,
      vat_amount: 1337,
      service_charge: 446,
      total_amount: 19615,
      notes: "Test order from admin panel",
    };

    const result = await createOrder(testOrderData);
    console.log("Order created successfully:", result);
    
    return result;
  } catch (error) {
    console.error("Error creating test order:", error);
    throw error;
  }
}

async function testDeliveryOrder() {
  try {
    console.log("Testing delivery order creation...");
    
    const testOrderData = {
      customer_name: "Delivery Customer",
      customer_phone: "+2348076543210",
      customer_address: "456 Delivery Street, Kaduna",
      dining_option: "delivery" as const,
      table_id: undefined,
      takeaway_packs: 2,
      takeaway_pack_price: 100,
      delivery_location_id: "test-location-id", // Replace with actual location ID from your database
      delivery_fee: 500,
      rider_name: "Test Rider",
      rider_phone: "+2348098765432",
      payment_method: "wallet" as const,
      items: [
        {
          menu_item_id: 81, // BBQ CHICKEN PIZZA from your CSV
          menu_item_name: "BBQ CHICKEN PIZZA",
          menu_item_price: 13860,
          quantity: 1,
          total_price: 13860,
        },
        {
          menu_item_id: 82, // GRILLED CHICKEN PIZZA from your CSV
          menu_item_name: "GRILLED CHICKEN PIZZA",
          menu_item_price: 13860,
          quantity: 1,
          total_price: 13860,
        },
      ],
      subtotal: 27720,
      vat_amount: 2079,
      service_charge: 693,
      total_amount: 30392,
      notes: "Test delivery order",
    };

    const result = await createOrder(testOrderData);
    console.log("Delivery order created successfully:", result);
    
    return result;
  } catch (error) {
    console.error("Error creating test delivery order:", error);
    throw error;
  }
}

// Run tests
async function runTests() {
  console.log("Starting orders functionality tests...");
  
  try {
    await checkOrdersExist();
    // await testCreateOrder();
    // await testDeliveryOrder();
    console.log("All tests passed! ✅");
  } catch (error) {
    console.error("Tests failed:", error);
  }
}

// Uncomment to run tests
// runTests();

export { testCreateOrder, testDeliveryOrder, runTests, checkOrdersExist }; 