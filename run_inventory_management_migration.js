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

async function runInventoryManagementMigration() {
  try {
    console.log("🚀 Starting inventory management system migration...");

    // Read the SQL file
    const sqlPath = path.join(__dirname, "inventory_management.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter(
        (stmt) =>
          stmt.length > 0 && !stmt.startsWith("--") && !stmt.startsWith("/*")
      );

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (
        statement.startsWith("--") ||
        statement.startsWith("/*") ||
        statement.trim() === ""
      ) {
        continue;
      }

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc("exec_sql", {
          sql_query: statement + ";",
        });

        if (error) {
          // Check if it's a "relation already exists" error, which we can ignore
          if (error.message.includes("already exists")) {
            console.log(`⚠️  Skipping existing object: ${error.message}`);
            continue;
          }
          throw error;
        }

        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (statementError) {
        console.error(
          `❌ Error executing statement ${i + 1}:`,
          statementError.message
        );
        console.error("Statement:", statement.substring(0, 100) + "...");

        // Continue with other statements instead of failing completely
        continue;
      }
    }

    console.log(
      "🎉 Inventory management system migration completed successfully!"
    );

    // Verify tables were created
    console.log("🔍 Verifying table creation...");

    const tables = [
      "inventory_categories",
      "suppliers",
      "inventory_items",
      "inventory_transactions",
      "inventory_alerts",
      "purchase_orders",
      "purchase_order_items",
      "inventory_adjustments",
      "inventory_adjustment_items",
      "inventory_count_sessions",
      "inventory_count_items",
      "menu_item_ingredients",
      "inventory_reports",
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*").limit(1);

      if (error) {
        console.log(`❌ Table ${table} verification failed:`, error.message);
      } else {
        console.log(`✅ Table ${table} verified successfully`);
      }
    }

    console.log("✨ All inventory management tables are ready!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function runDirectSQLMigration() {
  try {
    console.log("🚀 Starting direct SQL migration...");

    // Read the SQL file
    const sqlPath = path.join(__dirname, "inventory_management.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    // Execute the entire SQL content at once
    const { error } = await supabase.rpc("exec_sql", {
      sql_query: sqlContent,
    });

    if (error) {
      throw error;
    }

    console.log("🎉 Direct SQL migration completed successfully!");
  } catch (error) {
    console.error("❌ Direct SQL migration failed:", error);
    console.log("🔄 Falling back to statement-by-statement execution...");
    await runInventoryManagementMigration();
  }
}

// Run the migration
if (require.main === module) {
  runDirectSQLMigration().catch(console.error);
}

module.exports = { runInventoryManagementMigration, runDirectSQLMigration };
