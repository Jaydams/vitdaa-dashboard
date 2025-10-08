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
    console.log("🔧 Fixing delivery location foreign key constraints...");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "fix-delivery-location-constraints.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    }

    console.log("✅ Successfully fixed delivery location constraints!");
    console.log("📝 Changes made:");
    console.log(
      "   - Orders table: Added ON DELETE SET NULL to delivery_location_id constraint"
    );
    console.log(
      "   - Cart table: Verified ON DELETE SET NULL constraint exists"
    );
    console.log("");
    console.log("🎉 Users can now delete delivery locations freely!");
    console.log(
      "   - Deleted locations will set delivery_location_id to NULL in existing orders"
    );
    console.log(
      "   - This maintains data integrity while allowing flexible location management"
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Alternative manual SQL if the above doesn't work
console.log("🚀 Starting delivery location constraint fix...");
console.log("");
console.log(
  "If this script fails, you can run this SQL manually in your Supabase SQL editor:"
);
console.log("");
console.log("-- Fix delivery location constraints");
console.log(
  "ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_location_id_fkey;"
);
console.log(
  "ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_location_id_fkey FOREIGN KEY (delivery_location_id) REFERENCES public.delivery_locations(id) ON DELETE SET NULL;"
);
console.log("");

runMigration();
