import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerBusinessOwnerId } from "@/lib/getServerBusinessOwnerId";

export async function GET(request: NextRequest) {
  try {
    const businessOwnerId = await getServerBusinessOwnerId();
    if (!businessOwnerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch role permission templates
    const { data: roleTemplates, error: templatesError } = await supabase
      .from("role_permission_templates")
      .select(`
        role_name,
        permissions,
        description,
        is_active
      `)
      .eq("is_active", true)
      .order("role_name");

    if (templatesError) {
      console.error("Error fetching role templates:", templatesError);
      return NextResponse.json(
        { error: "Failed to fetch role templates" },
        { status: 500 }
      );
    }

    // Transform the data to include permissions as an array
    const transformedTemplates = (roleTemplates || []).map(template => ({
      role_name: template.role_name,
      permissions: Array.isArray(template.permissions) ? template.permissions : [],
      description: template.description,
    }));

    return NextResponse.json(transformedTemplates);
  } catch (error) {
    console.error("Error in GET /api/role-templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
