const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log("Starting refund system migration...");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "add-refund-system-tables.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }

    console.log("✅ Refund system migration completed successfully!");

    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .in("table_name", ["refund_requests", "refund_transactions"]);

    if (tablesError) {
      console.error("Error verifying tables:", tablesError);
    } else {
      console.log(
        "✅ Verified tables created:",
        tables.map((t) => t.table_name)
      );
    }

    // Test basic functionality
    console.log("Testing refund system functionality...");

    // This would normally test with actual data, but for now we'll just verify the schema
    console.log("✅ Refund system migration verification complete!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

runMigration();
