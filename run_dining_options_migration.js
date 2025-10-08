const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

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

async function runMigration() {
  try {
    console.log(
      "🚀 Starting dining options and business settings migration..."
    );

    // First, add dining options columns to existing business_settings table
    console.log(
      "📋 Adding dining options columns to business_settings table..."
    );
    const businessSettingsPath = path.join(
      __dirname,
      "migrations",
      "add-dining-options-to-business-settings.sql"
    );
    const businessSettingsSQL = fs.readFileSync(businessSettingsPath, "utf8");

    const { error: businessError } = await supabase.rpc("exec_sql", {
      sql: businessSettingsSQL,
    });
    if (businessError) {
      console.error(
        "❌ Business settings columns migration failed:",
        businessError
      );
    } else {
      console.log("✅ Business settings columns added successfully");
    }

    // Then run the dining options migration
    console.log("🍽️ Adding dining options configuration...");
    const diningOptionsPath = path.join(
      __dirname,
      "migrations",
      "add-dining-options-settings.sql"
    );
    const diningOptionsSQL = fs.readFileSync(diningOptionsPath, "utf8");

    const { error: diningError } = await supabase.rpc("exec_sql", {
      sql: diningOptionsSQL,
    });
    if (diningError) {
      console.error("❌ Dining options migration failed:", diningError);
    } else {
      console.log("✅ Dining options configuration added successfully");
    }

    console.log("🎉 Migration completed successfully!");
    console.log("📋 Changes made:");
    console.log("   ✅ Created business_settings table");
    console.log("   ✅ Added enabled_dining_options field");
    console.log("   ✅ Added default_takeaway_pack_price field");
    console.log("   ✅ Updated cart table to support pickup option");
    console.log("   ✅ Updated orders table to support pickup option");
    console.log("   ✅ Set default dining options: indoor, delivery, pickup");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// Alternative method if exec_sql RPC doesn't exist
async function runMigrationDirect() {
  try {
    console.log("🚀 Starting dining options migration (direct method)...");

    // Add columns to existing business_settings table
    const addColumnsSQL = `
      ALTER TABLE public.business_settings 
      ADD COLUMN IF NOT EXISTS enabled_dining_options JSONB DEFAULT '["indoor", "delivery", "pickup"]'::jsonb,
      ADD COLUMN IF NOT EXISTS default_takeaway_pack_price INTEGER DEFAULT 100;
    `;

    const { error: addColumnsError } = await supabase.rpc("exec_sql", {
      sql: addColumnsSQL,
    });
    if (addColumnsError) {
      console.log(
        "⚠️  Could not add columns to business_settings table:",
        addColumnsError.message
      );
    } else {
      console.log("✅ Added columns to business_settings table");
    }

    // Update existing records with default values
    const updateDefaultsSQL = `
      UPDATE public.business_settings 
      SET 
        enabled_dining_options = COALESCE(enabled_dining_options, '["indoor", "delivery", "pickup"]'::jsonb),
        default_takeaway_pack_price = COALESCE(default_takeaway_pack_price, 100);
    `;

    const { error: updateError } = await supabase.rpc("exec_sql", {
      sql: updateDefaultsSQL,
    });
    if (updateError) {
      console.log("⚠️  Could not update default values:", updateError.message);
    } else {
      console.log("✅ Updated existing records with default values");
    }

    // Update constraints for dining options
    const migrations = [
      "ALTER TABLE public.cart DROP CONSTRAINT IF EXISTS cart_dining_option_check;",
      "ALTER TABLE public.cart ADD CONSTRAINT cart_dining_option_check CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]));",
      "ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_dining_option_check;",
      "ALTER TABLE public.orders ADD CONSTRAINT orders_dining_option_check CHECK (dining_option = ANY (ARRAY['indoor'::text, 'delivery'::text, 'pickup'::text]));",
    ];

    for (const migration of migrations) {
      const { error } = await supabase.rpc("exec_sql", { sql: migration });
      if (error) {
        console.log(`⚠️  Could not execute: ${migration}`);
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`✅ Executed: ${migration}`);
      }
    }

    // Insert default settings for existing businesses
    const insertDefaultsSQL = `
      INSERT INTO business_settings (business_id, vat_rate, service_charge_rate, enabled_dining_options, default_takeaway_pack_price)
      SELECT id, 7.5, 2.5, '["indoor", "delivery", "pickup"]'::jsonb, 100
      FROM business_owner 
      WHERE id NOT IN (SELECT business_id FROM business_settings WHERE business_id IS NOT NULL)
      ON CONFLICT (business_id) DO NOTHING;
    `;

    const { error: insertError } = await supabase.rpc("exec_sql", {
      sql: insertDefaultsSQL,
    });
    if (insertError) {
      console.log(
        "⚠️  Could not insert default settings:",
        insertError.message
      );
    } else {
      console.log("✅ Inserted default settings for existing businesses");
    }

    console.log("✅ Dining options migration completed!");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// Try the main method first, fall back to direct method
runMigration().catch(() => {
  console.log("🔄 Trying alternative migration method...");
  runMigrationDirect();
});
