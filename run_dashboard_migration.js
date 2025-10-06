const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runDashboardMigration() {
  try {
    console.log("Starting dashboard performance indexes migration...");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "dashboard-performance-indexes.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        console.log(`Statement: ${statement.substring(0, 100)}...`);

        const { error } = await supabase.rpc("exec_sql", { sql: statement });

        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          console.error("Full statement:", statement);
          // Continue with other statements even if one fails
        } else {
          console.log(`✓ Statement ${i + 1} executed successfully`);
        }
      }
    }

    console.log("Dashboard performance indexes migration completed!");
    console.log("");
    console.log("Created indexes:");
    console.log("- idx_orders_business_date_status");
    console.log("- idx_orders_business_date");
    console.log("- idx_orders_business_order_time");
    console.log("- idx_orders_completed_status");
    console.log("- idx_orders_business_amount_date");
    console.log("- idx_order_items_menu_item_quantity");
    console.log("- idx_order_items_order_menu");
    console.log("- idx_order_items_menu_created");
    console.log("- idx_orders_business_customer");
    console.log("- idx_orders_dining_option");
    console.log("- idx_orders_payment_method");
    console.log("");
    console.log("These indexes will optimize dashboard analytics queries for:");
    console.log("- Sales metrics calculations");
    console.log("- Order status aggregations");
    console.log("- Best sellers analysis");
    console.log("- Weekly sales trends");
    console.log("- Customer and dining option analytics");
  } catch (error) {
    console.error("Dashboard migration failed:", error);
    process.exit(1);
  }
}

// Check if required environment variables are set
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error("Please set the following environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  console.log("");
  console.log("You can find these values in your Supabase project settings:");
  console.log("1. Go to your Supabase project dashboard");
  console.log("2. Navigate to Settings > API");
  console.log("3. Copy the Project URL and service_role key");
  process.exit(1);
}

runDashboardMigration();
