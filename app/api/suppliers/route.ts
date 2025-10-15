import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get business owner
    const { data: businessOwner, error: businessError } = await supabase
      .from("business_owner")
      .select("id")
      .eq("email", user.email)
      .single();

    if (businessError || !businessOwner) {
      return NextResponse.json(
        { error: "Business owner not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");
    const active = searchParams.get("active");

    // Build query
    let query = supabase
      .from("suppliers")
      .select("*")
      .eq("business_id", businessOwner.id)
      .order("name", { ascending: true });

    // Apply filters
    if (active !== null && active !== "all") {
      query = query.eq("is_active", active === "true");
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: suppliers, error: suppliersError } = await query;

    if (suppliersError) {
      console.error("Error fetching suppliers:", suppliersError);
      return NextResponse.json(
        { error: "Failed to fetch suppliers" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from("suppliers")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessOwner.id);

    if (countError) {
      console.error("Error getting suppliers count:", countError);
    }

    return NextResponse.json({
      suppliers: suppliers || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in suppliers API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
