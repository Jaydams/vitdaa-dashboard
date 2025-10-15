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
    console.log("Running payment processing fields migration...");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "add-payment-processing-fields.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }

    console.log(
      "✅ Payment processing fields migration completed successfully!"
    );

    // Verify the changes
    const { data: tableInfo, error: verifyError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type")
      .eq("table_name", "payments")
      .eq("table_schema", "public");

    if (verifyError) {
      console.error("Verification failed:", verifyError);
    } else {
      console.log("✅ Payments table structure:");
      tableInfo.forEach((col) => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

runMigration();
