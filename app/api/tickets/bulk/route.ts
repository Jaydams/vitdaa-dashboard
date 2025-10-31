import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/tickets/bulk - Bulk operations on tickets
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { operation, ticketIds, updateData } = body;

    // Validate required fields
    if (!operation || !ticketIds || !Array.isArray(ticketIds)) {
      return NextResponse.json(
        { error: "Missing required fields: operation, ticketIds" },
        { status: 400 }
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let result;

    switch (operation) {
      case "update_status":
        if (!updateData?.status) {
          return NextResponse.json(
            { error: "Status is required for update_status operation" },
            { status: 400 }
          );
        }

        result = await supabase
          .from("open_tickets")
          .update({
            status: updateData.status,
            version: supabase.rpc("increment_version"), // Use a database function to increment version
          })
          .in("id", ticketIds)
          .select("id, ticket_number, status");

        break;

      case "update_priority":
        if (!updateData?.priority) {
          return NextResponse.json(
            { error: "Priority is required for update_priority operation" },
            { status: 400 }
          );
        }

        result = await supabase
          .from("open_tickets")
          .update({
            priority: updateData.priority,
            version: supabase.rpc("increment_version"),
          })
          .in("id", ticketIds)
          .select("id, ticket_number, priority");

        break;

      case "delete":
        result = await supabase
          .from("open_tickets")
          .delete()
          .in("id", ticketIds)
          .select("id, ticket_number");

        break;

      case "complete_payment":
        result = await supabase
          .from("open_tickets")
          .update({
            status: "completed",
            payment_status: "completed",
            version: supabase.rpc("increment_version"),
          })
          .in("id", ticketIds)
          .select("id, ticket_number, status, payment_status");

        break;

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }

    if (result.error) {
      console.error(`Error in bulk ${operation}:`, result.error);
      return NextResponse.json(
        { error: `Failed to ${operation} tickets` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Bulk ${operation} completed successfully`,
      affectedTickets: result.data,
      count: result.data?.length || 0,
    });
  } catch (error) {
    console.error("Error in POST /api/tickets/bulk:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/tickets/bulk - Get tickets by multiple IDs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const idsParam = searchParams.get("ids");
    if (!idsParam) {
      return NextResponse.json(
        { error: "Missing required parameter: ids" },
        { status: 400 }
      );
    }

    const ticketIds = idsParam.split(",");

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tickets, error } = await supabase
      .from("open_tickets")
      .select("*")
      .in("id", ticketIds);

    if (error) {
      console.error("Error fetching tickets:", error);
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 }
      );
    }

    // Transform to OpenTicket format
    const transformedTickets = tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      orderState: ticket.order_data,
      status: ticket.status,
      priority: ticket.priority,
      createdBy: ticket.created_by,
      createdAt: new Date(ticket.created_at),
      lastModified: new Date(ticket.last_modified),
      estimatedCompletionTime: ticket.estimated_completion_time
        ? new Date(ticket.estimated_completion_time)
        : undefined,
      paymentStatus: ticket.payment_status,
    }));

    return NextResponse.json({
      tickets: transformedTickets,
      count: transformedTickets.length,
    });
  } catch (error) {
    console.error("Error in GET /api/tickets/bulk:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
