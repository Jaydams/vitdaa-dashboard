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
    console.log("Starting custom charges migration...");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "add-custom-charges-table.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }

    console.log("✅ Custom charges migration completed successfully!");

    // Verify the table was created
    const { data: tables, error: tableError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "order_custom_charges");

    if (tableError) {
      console.error("Error verifying table creation:", tableError);
    } else if (tables && tables.length > 0) {
      console.log("✅ order_custom_charges table verified");
    } else {
      console.log("⚠️  Could not verify table creation");
    }

    // Verify the column was added to orders table
    const { data: columns, error: columnError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_schema", "public")
      .eq("table_name", "orders")
      .eq("column_name", "custom_charges_total");

    if (columnError) {
      console.error("Error verifying column addition:", columnError);
    } else if (columns && columns.length > 0) {
      console.log("✅ custom_charges_total column verified");
    } else {
      console.log("⚠️  Could not verify column addition");
    }
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

runMigration();
