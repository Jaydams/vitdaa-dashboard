import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OpenTicket, OrderState } from "@/stores/order-store";

// GET /api/tickets/[id] - Get a specific ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const ticketId = params.id;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: ticket, error } = await supabase
      .from("open_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching ticket:", error);
      return NextResponse.json(
        { error: "Failed to fetch ticket" },
        { status: 500 }
      );
    }

    // Transform to OpenTicket format
    const transformedTicket: OpenTicket = {
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      orderState: ticket.order_data as OrderState,
      status: ticket.status,
      priority: ticket.priority,
      createdBy: ticket.created_by,
      createdAt: new Date(ticket.created_at),
      lastModified: new Date(ticket.last_modified),
      estimatedCompletionTime: ticket.estimated_completion_time
        ? new Date(ticket.estimated_completion_time)
        : undefined,
      paymentStatus: ticket.payment_status,
    };

    return NextResponse.json(transformedTicket);
  } catch (error) {
    console.error("Error in GET /api/tickets/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/tickets/[id] - Update a ticket with optimistic locking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const ticketId = params.id;
    const body = await request.json();

    const {
      orderState,
      status,
      priority,
      estimatedCompletionTime,
      paymentStatus,
      version, // For optimistic locking
    } = body;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the current ticket to check version for optimistic locking
    const { data: currentTicket, error: fetchError } = await supabase
      .from("open_tickets")
      .select("version")
      .eq("id", ticketId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching current ticket:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch ticket" },
        { status: 500 }
      );
    }

    // Check for conflicts (optimistic locking)
    if (version && currentTicket.version !== version) {
      return NextResponse.json(
        {
          error: "Conflict detected",
          message:
            "This ticket has been modified by another user. Please refresh and try again.",
          currentVersion: currentTicket.version,
        },
        { status: 409 }
      );
    }

    // Build update object
    const updateData: any = {
      version: currentTicket.version + 1, // Increment version
    };

    if (orderState !== undefined) updateData.order_data = orderState;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (estimatedCompletionTime !== undefined) {
      updateData.estimated_completion_time = estimatedCompletionTime;
    }
    if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;

    const { data: updatedTicket, error: updateError } = await supabase
      .from("open_tickets")
      .update(updateData)
      .eq("id", ticketId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating ticket:", updateError);
      return NextResponse.json(
        { error: "Failed to update ticket" },
        { status: 500 }
      );
    }

    // Transform to OpenTicket format
    const transformedTicket: OpenTicket = {
      id: updatedTicket.id,
      ticketNumber: updatedTicket.ticket_number,
      orderState: updatedTicket.order_data as OrderState,
      status: updatedTicket.status,
      priority: updatedTicket.priority,
      createdBy: updatedTicket.created_by,
      createdAt: new Date(updatedTicket.created_at),
      lastModified: new Date(updatedTicket.last_modified),
      estimatedCompletionTime: updatedTicket.estimated_completion_time
        ? new Date(updatedTicket.estimated_completion_time)
        : undefined,
      paymentStatus: updatedTicket.payment_status,
    };

    return NextResponse.json({
      ticket: transformedTicket,
      message: "Ticket updated successfully",
    });
  } catch (error) {
    console.error("Error in PUT /api/tickets/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Delete a ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const ticketId = params.id;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("open_tickets")
      .delete()
      .eq("id", ticketId);

    if (error) {
      console.error("Error deleting ticket:", error);
      return NextResponse.json(
        { error: "Failed to delete ticket" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/tickets/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
