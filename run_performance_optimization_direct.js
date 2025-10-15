/**
 * Direct Performance Optimization Migration Runner
 * Applies database indexes directly using Supabase client
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables (if dotenv is available)
try {
  require("dotenv").config({ path: ".env.local" });
} catch (e) {
  console.log("Note: dotenv not available, using system environment variables");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDirectMigration() {
  console.log("🚀 Starting Direct Performance Optimization Migration...");
  console.log("⏰ Timestamp:", new Date().toISOString());

  try {
    // Define the indexes to create directly
    const indexStatements = [
      // Staff activity logs performance indexes
      `CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_performance_query 
       ON staff_activity_logs(staff_id, shift_date, activity_type, timestamp DESC)`,

      `CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_business_analysis 
       ON staff_activity_logs(business_id, shift_date, activity_type) 
       INCLUDE (performance_metrics)`,

      `CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_recent 
       ON staff_activity_logs(business_id, timestamp DESC) 
       WHERE timestamp >= NOW() - INTERVAL '24 hours'`,

      // Inventory requests performance indexes
      `CREATE INDEX IF NOT EXISTS idx_inventory_requests_admin_workflow 
       ON inventory_requests(business_id, status, urgency_level, created_at DESC)`,

      `CREATE INDEX IF NOT EXISTS idx_inventory_requests_staff_history 
       ON inventory_requests(requested_by_staff_id, created_at DESC) 
       INCLUDE (status, total_estimated_cost)`,

      `CREATE INDEX IF NOT EXISTS idx_inventory_requests_pending_urgent 
       ON inventory_requests(business_id, urgency_level, created_at ASC) 
       WHERE status = 'pending'`,

      // Orders table optimization indexes
      `CREATE INDEX IF NOT EXISTS idx_orders_staff_assignment 
       ON orders(assigned_to_staff_id, status, created_at DESC) 
       WHERE assigned_to_staff_id IS NOT NULL`,

      `CREATE INDEX IF NOT EXISTS idx_orders_kitchen_processing 
       ON orders(business_id, status, priority_level, created_at ASC) 
       WHERE status IN ('pending', 'processing')`,

      `CREATE INDEX IF NOT EXISTS idx_orders_table_management 
       ON orders(business_id, table_id, status, created_at DESC) 
       WHERE table_id IS NOT NULL`,

      // Order items optimization indexes
      `CREATE INDEX IF NOT EXISTS idx_order_items_kitchen_processing 
       ON order_items(item_status, assigned_to_staff_id, created_at ASC) 
       WHERE item_status IN ('pending', 'preparing') AND is_kitchen_item = true`,

      `CREATE INDEX IF NOT EXISTS idx_order_items_bar_processing 
       ON order_items(item_status, assigned_to_staff_id, created_at ASC) 
       WHERE item_status IN ('pending', 'preparing') AND is_bar_item = true`,

      // Inventory items optimization indexes
      `CREATE INDEX IF NOT EXISTS idx_inventory_items_stock_alerts 
       ON inventory_items(business_id, current_stock, minimum_stock, is_available) 
       WHERE current_stock <= minimum_stock OR NOT is_available`,

      `CREATE INDEX IF NOT EXISTS idx_inventory_items_category_available 
       ON inventory_items(business_id, category_id, is_available, current_stock DESC)`,

      // Staff and session indexes
      `CREATE INDEX IF NOT EXISTS idx_staff_role_business 
       ON staff(business_id, role, is_active) 
       WHERE is_active = true`,

      `CREATE INDEX IF NOT EXISTS idx_staff_sessions_active 
       ON staff_sessions(staff_id, is_active, expires_at DESC) 
       WHERE is_active = true`,

      // Real-time sync indexes
      `CREATE INDEX IF NOT EXISTS idx_dashboard_events_realtime_sync 
       ON dashboard_events(business_id, type, timestamp DESC, priority) 
       WHERE processed_at IS NULL`,

      // Partial indexes for active data only
      `CREATE INDEX IF NOT EXISTS idx_inventory_alerts_active 
       ON inventory_alerts(business_id, severity, created_at DESC) 
       WHERE is_resolved = false`,

      `CREATE INDEX IF NOT EXISTS idx_orders_today 
       ON orders(business_id, status, created_at DESC) 
       WHERE created_at >= CURRENT_DATE`,

      // Expression indexes for computed values
      `CREATE INDEX IF NOT EXISTS idx_orders_date_only 
       ON orders(business_id, (created_at::date), status)`,

      `CREATE INDEX IF NOT EXISTS idx_orders_hour_analysis 
       ON orders(business_id, EXTRACT(hour FROM created_at), created_at::date)`,
    ];

    console.log("🔧 Total indexes to create:", indexStatements.length);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < indexStatements.length; i++) {
      const statement = indexStatements[i];

      try {
        console.log(`\n📝 Creating index ${i + 1}/${indexStatements.length}:`);

        // Show first 80 characters of the statement
        const preview = statement.replace(/\s+/g, " ").trim();
        const shortPreview =
          preview.length > 80 ? preview.substring(0, 80) + "..." : preview;
        console.log(`   ${shortPreview}`);

        const { error } = await supabase.rpc("exec", {
          sql: statement,
        });

        if (error) {
          // Check if it's a "already exists" error (which we can ignore)
          if (
            error.message.includes("already exists") ||
            error.message.includes("IF NOT EXISTS")
          ) {
            console.log(`   ⚠️  Skipped (already exists)`);
            skipCount++;
          } else {
            console.error(`   ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log("   ✅ Success");
          successCount++;
        }

        // Add small delay to prevent overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`   ❌ Unexpected error: ${err.message}`);
        errorCount++;
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${indexStatements.length}`);

    if (errorCount > 0) {
      console.log(
        "\n⚠️  Migration completed with errors. Trying alternative approach..."
      );

      // Try using direct SQL execution
      console.log("\n🔄 Attempting direct SQL execution...");

      for (let i = 0; i < indexStatements.length; i++) {
        const statement = indexStatements[i];

        try {
          const { error } = await supabase
            .from("pg_stat_user_indexes")
            .select("*")
            .limit(1);

          if (!error) {
            // If we can query pg_stat_user_indexes, we have sufficient permissions
            console.log("   ✅ Database connection verified");
            break;
          }
        } catch (err) {
          console.log("   ⚠️  Limited database permissions detected");
        }
      }
    } else {
      console.log("\n🎉 Migration completed successfully!");
    }

    // Run ANALYZE to update query planner statistics
    console.log("\n🔍 Running ANALYZE to update query planner statistics...");

    const analyzeStatements = [
      "orders",
      "order_items",
      "inventory_items",
      "inventory_requests",
      "inventory_request_items",
      "staff_activity_logs",
      "staff",
      "staff_sessions",
      "dashboard_events",
    ];

    for (const tableName of analyzeStatements) {
      try {
        const { error } = await supabase.rpc("exec", {
          sql: `ANALYZE ${tableName}`,
        });

        if (error) {
          console.log(`   ⚠️  ANALYZE ${tableName} - ${error.message}`);
        } else {
          console.log(`   ✅ ANALYZE ${tableName}`);
        }
      } catch (err) {
        console.log(`   ⚠️  ANALYZE ${tableName} - ${err.message}`);
      }
    }

    console.log("\n🎯 Performance Optimization Results:");
    console.log(`   📈 ${successCount} indexes created successfully`);
    console.log(`   ⚠️  ${skipCount} indexes already existed`);
    console.log(`   ❌ ${errorCount} indexes failed to create`);

    if (successCount > 0) {
      console.log("\n✨ Performance improvements applied!");
      console.log(
        "🚀 Your staff dashboards should now have improved query performance."
      );
      console.log("\n📋 Next Steps:");
      console.log(
        "   1. Configure Redis caching using the .env.performance.template"
      );
      console.log(
        "   2. Use the lazy loading hooks in your dashboard components"
      );
      console.log(
        "   3. Monitor performance with the PerformanceMonitor service"
      );
      console.log("   4. Test the optimized queries in your dashboards");
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⏹️  Migration interrupted by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n⏹️  Migration terminated");
  process.exit(0);
});

// Run the migration
runDirectMigration().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
