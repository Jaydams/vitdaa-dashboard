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
    console.log("Starting kitchen order processing migration...");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "add-kitchen-order-processing-fields.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(";")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    console.log(`Executing ${statements.length} migration statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc("exec_sql", {
        sql_query: statement,
      });

      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
        throw error;
      }
    }

    console.log(
      "✅ Kitchen order processing migration completed successfully!"
    );

    // Verify the migration by checking if the new columns exist
    console.log("Verifying migration...");

    const { data: ordersColumns, error: ordersError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "orders")
      .in("column_name", [
        "priority_level",
        "preparation_started_at",
        "preparation_completed_at",
        "assigned_to_staff_id",
        "kitchen_notes",
      ]);

    if (ordersError) {
      console.error("Error verifying orders table:", ordersError);
    } else {
      console.log(
        "✅ Orders table columns verified:",
        ordersColumns.map((c) => c.column_name)
      );
    }

    const { data: itemsColumns, error: itemsError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "order_items")
      .in("column_name", [
        "item_status",
        "preparation_time",
        "preparation_started_at",
        "preparation_notes",
      ]);

    if (itemsError) {
      console.error("Error verifying order_items table:", itemsError);
    } else {
      console.log(
        "✅ Order items table columns verified:",
        itemsColumns.map((c) => c.column_name)
      );
    }

    console.log("🎉 Migration verification completed!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
