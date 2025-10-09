const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Use environment variables directly
const supabaseUrl = "https://jackylkenbhvhszghcra.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphY2t5bGtlbmJodmhzemdoY3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzY2MzY4NCwiZXhwIjoyMDM5MjM5Njg0fQ.HSBPyEZ8kTnheNECq-3xJioQnEbmTTLzqKGsgmVgQ4I";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log("Starting VAT and service charge rates migration...");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "add-vat-service-charge-rates-to-orders.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }

    console.log(
      "✅ VAT and service charge rates migration completed successfully"
    );
    console.log(
      "Added vat_rate and service_charge_rate columns to orders table"
    );
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

runMigration();
