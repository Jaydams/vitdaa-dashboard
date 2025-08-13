import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "No user authenticated" }, { status: 401 });
    }
    
    // Get business owner
    const { data: businessOwner, error: businessError } = await supabase
      .from("business_owner")
      .select("id, business_name, email")
      .eq("email", user.email)
      .single();
    
    if (businessError || !businessOwner) {
      return NextResponse.json({ 
        error: "Business owner not found", 
        userEmail: user.email,
        businessError 
      }, { status: 404 });
    }
    
    // Check orders
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("business_id", businessOwner.id);
    
    // Check tables
    const { data: tables, error: tablesError } = await supabase
      .from("tables")
      .select("*")
      .eq("restaurant_id", businessOwner.id);
    
    return NextResponse.json({
      businessOwner,
      orders: {
        count: orders?.length || 0,
        data: orders,
        error: ordersError
      },
      tables: {
        count: tables?.length || 0,
        data: tables,
        error: tablesError
      }
    });
    
  } catch (error) {
    console.error("Test orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 