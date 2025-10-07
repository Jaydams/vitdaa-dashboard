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

async function runBusinessSettingsMigration() {
  try {
    console.log("Running business settings table migration...");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "business-settings-table.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }

    console.log("✅ Business settings table migration completed successfully!");

    // Verify the table was created
    const { data, error: verifyError } = await supabase
      .from("business_settings")
      .select("count(*)")
      .limit(1);

    if (verifyError) {
      console.error("Table verification failed:", verifyError);
    } else {
      console.log("✅ Business settings table verified and ready to use");
    }
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

// Run the migration
runBusinessSettingsMigration();
