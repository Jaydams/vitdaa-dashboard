import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API endpoint for creating audit log entries
 * Handles logging of all reception dashboard activities
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the request body
    const body = await request.json();

    // Validate required fields
    if (!body.business_id || !body.action) {
      return NextResponse.json(
        { error: "Missing required fields: business_id and action" },
        { status: 400 }
      );
    }

    // Extract client IP from headers
    const clientIP =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip") ||
      request.ip ||
      "unknown";

    // Prepare audit log entry
    const auditLogEntry = {
      admin_id: body.admin_id || null,
      staff_id: body.staff_id || null,
      business_id: body.business_id,
      action: body.action,
      target_type: body.target_type || null,
      target_id: body.target_id || null,
      details: body.details || {},
      reason: body.reason || null,
      ip_address: clientIP,
      user_agent: body.user_agent || request.headers.get("user-agent") || null,
    };

    // Insert audit log entry into database
    const { data, error } = await supabase
      .from("audit_logs")
      .insert([auditLogEntry])
      .select()
      .single();

    if (error) {
      console.error("Database error creating audit log:", error);
      return NextResponse.json(
        { error: "Failed to create audit log entry" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        auditLogId: data.id,
        message: "Audit log entry created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating audit log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * API endpoint for retrieving audit logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const businessId = searchParams.get("business_id");
    const staffId = searchParams.get("staff_id");
    const action = searchParams.get("action");
    const targetType = searchParams.get("target_type");
    const targetId = searchParams.get("target_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Validate business_id is provided
    if (!businessId) {
      return NextResponse.json(
        { error: "business_id parameter is required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from("audit_logs")
      .select(
        `
        id,
        admin_id,
        staff_id,
        business_id,
        action,
        target_type,
        target_id,
        details,
        reason,
        ip_address,
        user_agent,
        created_at
      `
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (staffId) {
      query = query.eq("staff_id", staffId);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (targetType) {
      query = query.eq("target_type", targetType);
    }

    if (targetId) {
      query = query.eq("target_id", targetId);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Database error retrieving audit logs:", error);
      return NextResponse.json(
        { error: "Failed to retrieve audit logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      auditLogs: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error("Error retrieving audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
