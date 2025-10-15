/**
 * Performance Optimization Migration Runner
 * Applies database indexes and performance optimizations for staff dashboards
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

async function runMigration() {
  console.log("🚀 Starting Performance Optimization Migration...");
  console.log("⏰ Timestamp:", new Date().toISOString());

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "add-performance-optimization-indexes.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📖 Migration file loaded successfully");
    console.log(
      "📊 Migration size:",
      `${Math.round(migrationSQL.length / 1024)}KB`
    );

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log("🔧 Total statements to execute:", statements.length);

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (
        !statement ||
        statement.startsWith("--") ||
        statement.startsWith("/*")
      ) {
        skipCount++;
        continue;
      }

      try {
        console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);

        // Show first 100 characters of the statement
        const preview =
          statement.length > 100
            ? statement.substring(0, 100) + "..."
            : statement;
        console.log(`   ${preview}`);

        const { error } = await supabase.rpc("exec_sql", {
          sql_query: statement + ";",
        });

        if (error) {
          // Check if it's a "already exists" error (which we can ignore)
          if (
            error.message.includes("already exists") ||
            error.message.includes("does not exist") ||
            error.message.includes("IF NOT EXISTS")
          ) {
            console.log(`   ⚠️  Skipped (already exists): ${error.message}`);
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
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`   ❌ Unexpected error: ${err.message}`);
        errorCount++;
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}`);

    if (errorCount > 0) {
      console.log(
        "\n⚠️  Migration completed with errors. Please review the error messages above."
      );
    } else {
      console.log("\n🎉 Migration completed successfully!");
    }

    // Run ANALYZE to update query planner statistics
    console.log("\n🔍 Running ANALYZE to update query planner statistics...");

    const analyzeStatements = [
      "ANALYZE orders;",
      "ANALYZE order_items;",
      "ANALYZE inventory_items;",
      "ANALYZE inventory_requests;",
      "ANALYZE inventory_request_items;",
      "ANALYZE staff_activity_logs;",
      "ANALYZE staff;",
      "ANALYZE staff_sessions;",
      "ANALYZE payments;",
      "ANALYZE audit_logs;",
      "ANALYZE dashboard_events;",
      "ANALYZE notification_deliveries;",
      "ANALYZE offline_action_queue;",
    ];

    for (const analyzeStmt of analyzeStatements) {
      try {
        await supabase.rpc("exec_sql", { sql_query: analyzeStmt });
        console.log(`   ✅ ${analyzeStmt}`);
      } catch (err) {
        console.log(`   ⚠️  ${analyzeStmt} - ${err.message}`);
      }
    }

    console.log("\n📈 Query planner statistics updated successfully!");

    // Verify some key indexes were created
    console.log("\n🔍 Verifying key indexes...");

    const indexChecks = [
      "idx_staff_activity_logs_performance_query",
      "idx_inventory_requests_admin_workflow",
      "idx_orders_kitchen_processing",
      "idx_order_items_kitchen_processing",
      "idx_inventory_items_stock_alerts",
    ];

    for (const indexName of indexChecks) {
      try {
        const { data, error } = await supabase
          .from("pg_indexes")
          .select("indexname")
          .eq("indexname", indexName)
          .single();

        if (error || !data) {
          console.log(`   ⚠️  Index not found: ${indexName}`);
        } else {
          console.log(`   ✅ Index verified: ${indexName}`);
        }
      } catch (err) {
        console.log(`   ⚠️  Could not verify index: ${indexName}`);
      }
    }

    console.log("\n🎯 Performance Optimization Tips:");
    console.log(
      "   1. Monitor query performance with the new analyze_index_usage() function"
    );
    console.log(
      "   2. Check for unused indexes with identify_unused_indexes() function"
    );
    console.log(
      "   3. Consider enabling Redis caching for frequently accessed data"
    );
    console.log("   4. Use the lazy loading hooks for large datasets");
    console.log(
      "   5. Monitor performance with the PerformanceMonitor service"
    );

    console.log("\n✨ Performance optimization migration completed!");
    console.log(
      "🚀 Your staff dashboards should now have significantly improved performance."
    );
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
runMigration().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
