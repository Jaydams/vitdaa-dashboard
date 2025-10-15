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

async function runBusinessSettingsFix() {
  try {
    console.log("🔧 Starting business settings schema fix...");

    // Read the SQL file
    const sqlPath = path.join(__dirname, "fix_business_settings_schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Split SQL into individual statements
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n⚡ Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + "...");

      const { data, error } = await supabase.rpc("exec_sql", {
        sql_query: statement,
      });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        throw error;
      }

      if (data) {
        console.log("✅ Result:", data);
      } else {
        console.log("✅ Statement executed successfully");
      }
    }

    console.log("\n🎉 Business settings schema fix completed successfully!");

    // Test the API endpoints
    console.log("\n🧪 Testing API endpoints...");

    // Note: These would need to be tested with actual HTTP requests
    console.log("✅ Business settings fix completed. Please test:");
    console.log("   - GET /api/business/settings");
    console.log("   - GET /api/business/info");
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runBusinessSettingsFix();
}

module.exports = { runBusinessSettingsFix };
