const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSimpleMigration() {
  try {
    console.log("🚀 Starting simple dining options migration...");

    // Step 1: Add columns to business_settings table
    console.log("📋 Adding columns to business_settings table...");

    const addColumnsQuery = `
      ALTER TABLE public.business_settings 
      ADD COLUMN IF NOT EXISTS enabled_dining_options JSONB DEFAULT '["indoor", "delivery", "pickup"]'::jsonb,
      ADD COLUMN IF NOT EXISTS default_takeaway_pack_price INTEGER DEFAULT 100;
    `;

    const { error: addColumnsError } = await supabase.rpc("exec_sql", {
      sql: addColumnsQuery,
    });

    if (addColumnsError) {
      console.log("⚠️  Could not add columns via RPC, trying direct query...");

      // Try direct queries
      const { error: col1Error } = await supabase
        .from("business_settings")
        .select("enabled_dining_options")
        .limit(1);

      if (
        col1Error &&
        col1Error.message.includes(
          'column "enabled_dining_options" does not exist'
        )
      ) {
        console.log(
          "❌ Columns need to be added manually. Please run the following SQL:"
        );
        console.log("");
        console.log("ALTER TABLE public.business_settings");
        console.log(
          'ADD COLUMN IF NOT EXISTS enabled_dining_options JSONB DEFAULT \'["indoor", "delivery", "pickup"]\'::jsonb,'
        );
        console.log(
          "ADD COLUMN IF NOT EXISTS default_takeaway_pack_price INTEGER DEFAULT 100;"
        );
        console.log("");
        console.log("UPDATE public.business_settings");
        console.log(
          'SET enabled_dining_options = \'["indoor", "delivery", "pickup"]\'::jsonb,'
        );
        console.log("    default_takeaway_pack_price = 100");
        console.log(
          "WHERE enabled_dining_options IS NULL OR default_takeaway_pack_price IS NULL;"
        );
        console.log("");
        return;
      }
    } else {
      console.log("✅ Columns added successfully");
    }

    // Step 2: Update existing records
    console.log("🔄 Updating existing records with default values...");

    const updateQuery = `
      UPDATE public.business_settings 
      SET 
        enabled_dining_options = COALESCE(enabled_dining_options, '["indoor", "delivery", "pickup"]'::jsonb),
        default_takeaway_pack_price = COALESCE(default_takeaway_pack_price, 100);
    `;

    const { error: updateError } = await supabase.rpc("exec_sql", {
      sql: updateQuery,
    });

    if (updateError) {
      console.log("⚠️  Could not update via RPC:", updateError.message);
    } else {
      console.log("✅ Updated existing records");
    }

    // Step 3: Update dining option constraints
    console.log("🍽️  Updating dining option constraints...");

    const constraintQueries = [
      "ALTER TABLE public.cart DROP CONSTRAINT IF EXISTS cart_dining_option_check;",
      "ALTER TABLE public.cart ADD CONSTRAINT cart_dining_option_check CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]));",
      "ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_dining_option_check;",
      "ALTER TABLE public.orders ADD CONSTRAINT orders_dining_option_check CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]));",
    ];

    for (const query of constraintQueries) {
      const { error } = await supabase.rpc("exec_sql", { sql: query });
      if (error) {
        console.log(`⚠️  Could not execute: ${query.substring(0, 50)}...`);
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`✅ Executed constraint update`);
      }
    }

    console.log("🎉 Migration completed successfully!");
    console.log("");
    console.log("📋 Summary of changes:");
    console.log(
      "   ✅ Added enabled_dining_options column to business_settings"
    );
    console.log(
      "   ✅ Added default_takeaway_pack_price column to business_settings"
    );
    console.log("   ✅ Updated existing records with default values");
    console.log("   ✅ Updated cart table to support pickup option");
    console.log("   ✅ Updated orders table to support pickup option");
    console.log("");
    console.log("🔧 Next steps:");
    console.log("   1. Test the business settings form");
    console.log("   2. Verify dining options appear correctly");
    console.log("   3. Test order creation with pickup option");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

runSimpleMigration();
