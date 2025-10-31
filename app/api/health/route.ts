import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Health check endpoint for performance monitoring
 * Returns system health status and basic metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();

    // Test database connectivity
    const dbStart = Date.now();
    const { error: dbError } = await supabase
      .from("business_owner")
      .select("id")
      .limit(1);
    const dbLatency = Date.now() - dbStart;

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      responseTime,
      database: {
        status: dbError ? "error" : "healthy",
        latency: dbLatency,
        error: dbError?.message,
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Simple HEAD request for latency testing
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
