const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log("🔧 Adding status field to delivery_locations table...");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "add-delivery-location-status.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    }

    console.log("✅ Successfully added status field to delivery_locations!");
    console.log("📝 Changes made:");
    console.log("   - Added status column (active/inactive/deleted)");
    console.log("   - Added index for better performance");
    console.log("   - Set existing records to active status");
    console.log("");
    console.log("🎉 Soft delete functionality is now available!");
    console.log("   - Deleted locations will be marked as inactive");
    console.log("   - Only active locations will show in settings");
    console.log("   - Physical deletion happens safely in background");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Alternative manual SQL if the above doesn't work
console.log("🚀 Starting delivery location status migration...");
console.log("");
console.log(
  "If this script fails, you can run this SQL manually in your Supabase SQL editor:"
);
console.log("");
console.log("-- Add status field to delivery_locations");
console.log(
  "ALTER TABLE public.delivery_locations ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted'));"
);
console.log(
  "CREATE INDEX IF NOT EXISTS idx_delivery_locations_status ON public.delivery_locations(business_id, status);"
);
console.log(
  "UPDATE public.delivery_locations SET status = 'active' WHERE status IS NULL;"
);
console.log("");

runMigration();
