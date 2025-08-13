import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;

    // Validate staffId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(staffId)) {
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch staff member by ID, ensuring they belong to the current business
    const { data: staff, error } = await supabase
      .from("staff")
      .select("*")
      .eq("id", staffId)
      .eq("business_id", businessOwnerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Staff member not found" },
          { status: 404 }
        );
      }
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch staff member" },
        { status: 500 }
      );
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Error in GET /api/staff/[staffId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    console.log("PUT /api/staff/[staffId] - Request received");
    
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      console.log("Unauthorized - No business owner ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await params;
    console.log("Staff ID:", staffId);

    // Validate staffId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(staffId)) {
      console.log("Invalid staff ID format:", staffId);
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("Request body:", body);
    
    const supabase = await createClient();

    // First verify the staff member exists and belongs to this business
    const { error: fetchError } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staffId)
      .eq("business_id", businessOwnerId)
      .single();

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Staff member not found" },
          { status: 404 }
        );
      }
      console.error("Database error:", fetchError);
      return NextResponse.json(
        { error: "Failed to verify staff member" },
        { status: 500 }
      );
    }

    console.log("Staff member verified, updating...");

    // Prepare update data, ensuring JSON fields are properly handled
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // Handle empty strings for date fields - convert to NULL
    if (updateData.date_of_birth === '') {
      updateData.date_of_birth = null;
    }
    if (updateData.employment_start_date === '') {
      updateData.employment_start_date = null;
    }

    // Handle empty strings for other optional fields
    const optionalFields = [
      'phone_number', 'emergency_contact_name', 'emergency_contact_phone',
      'emergency_contact_relationship', 'department', 'employee_id',
      'notes', 'profile_image_url'
    ];

    optionalFields.forEach(field => {
      if (updateData[field] === '') {
        updateData[field] = null;
      }
    });

    // Ensure address is properly formatted as JSON if provided
    if (body.address && typeof body.address === 'object') {
      updateData.address = body.address;
    }

    // Ensure other JSON fields are properly handled
    if (body.permissions && Array.isArray(body.permissions)) {
      updateData.permissions = body.permissions;
    }

    console.log("Update data to be sent:", updateData);

    // Update staff profile
    const { data: updatedStaff, error: updateError } = await supabase
      .from("staff")
      .update(updateData)
      .eq("id", staffId)
      .eq("business_id", businessOwnerId)
      .select()
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update staff profile" },
        { status: 500 }
      );
    }

    console.log("Update successful:", updatedStaff);
    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error("Error in PUT /api/staff/[staffId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
