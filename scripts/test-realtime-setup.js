// Test script to verify Supabase Realtime is working
// Run this in your browser console or as a Node.js script

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test realtime connection
async function testRealtimeSetup() {
  console.log("🧪 Testing Supabase Realtime Setup...");

  // Test 1: Check if realtime is available
  if (!supabase.realtime) {
    console.error("❌ Realtime not available");
    return;
  }
  console.log("✅ Realtime client available");

  // Test 2: Subscribe to restaurant_shifts changes
  const shiftsChannel = supabase
    .channel("test-shifts")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "restaurant_shifts",
      },
      (payload) => {
        console.log("🔄 Shift change detected:", payload);
      }
    )
    .subscribe((status) => {
      console.log("📡 Shifts subscription status:", status);
    });

  // Test 3: Subscribe to staff_sessions changes
  const sessionsChannel = supabase
    .channel("test-sessions")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "staff_sessions",
      },
      (payload) => {
        console.log("👥 Session change detected:", payload);
      }
    )
    .subscribe((status) => {
      console.log("📡 Sessions subscription status:", status);
    });

  // Test 4: Subscribe to audit_logs
  const auditChannel = supabase
    .channel("test-audit")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "audit_logs",
      },
      (payload) => {
        console.log("🔍 Audit log detected:", payload);
      }
    )
    .subscribe((status) => {
      console.log("📡 Audit subscription status:", status);
    });

  // Wait a bit then cleanup
  setTimeout(() => {
    console.log("🧹 Cleaning up test subscriptions...");
    supabase.removeChannel(shiftsChannel);
    supabase.removeChannel(sessionsChannel);
    supabase.removeChannel(auditChannel);
    console.log("✅ Test complete!");
  }, 10000);
}

// Run the test
testRealtimeSetup();

// Export for use in other files
export { testRealtimeSetup };
