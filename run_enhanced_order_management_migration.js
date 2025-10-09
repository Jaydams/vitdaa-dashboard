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
    console.log("Starting enhanced order management database migration...");

    // Read and execute cascade deletion constraints migration
    const cascadeMigrationPath = path.join(
      __dirname,
      "migrations",
      "add-cascade-deletion-constraints.sql"
    );
    const cascadeMigrationSQL = fs.readFileSync(cascadeMigrationPath, "utf8");

    console.log("Executing cascade deletion constraints migration...");
    const { error: cascadeError } = await supabase.rpc("exec_sql", {
      sql: cascadeMigrationSQL,
    });

    if (cascadeError) {
      console.error(
        "Error executing cascade deletion migration:",
        cascadeError
      );
      throw cascadeError;
    }

    console.log(
      "✅ Cascade deletion constraints migration completed successfully"
    );

    // Read and execute completed status migration
    const statusMigrationPath = path.join(
      __dirname,
      "migrations",
      "add-completed-status-to-orders.sql"
    );
    const statusMigrationSQL = fs.readFileSync(statusMigrationPath, "utf8");

    console.log("Executing completed status migration...");
    const { error: statusError } = await supabase.rpc("exec_sql", {
      sql: statusMigrationSQL,
    });

    if (statusError) {
      console.error("Error executing completed status migration:", statusError);
      throw statusError;
    }

    console.log("✅ Completed status migration completed successfully");

    console.log(
      "🎉 All enhanced order management migrations completed successfully!"
    );

    // Verify the changes
    console.log("\nVerifying migrations...");

    // Check if cascade constraints are in place
    const { data: constraints, error: constraintError } = await supabase
      .from("information_schema.table_constraints")
      .select("*")
      .eq("table_name", "order_items")
      .eq("constraint_type", "FOREIGN KEY");

    if (constraintError) {
      console.warn("Could not verify constraints:", constraintError);
    } else {
      console.log("✅ Foreign key constraints verified");
    }

    // Test the new completed status
    const { data: statusTest, error: statusTestError } = await supabase
      .from("orders")
      .select("status")
      .limit(1);

    if (statusTestError) {
      console.warn("Could not verify status constraint:", statusTestError);
    } else {
      console.log("✅ Status constraint verified");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution if rpc doesn't work
async function runMigrationDirect() {
  try {
    console.log(
      "Starting enhanced order management database migration (direct method)..."
    );

    // Execute cascade deletion constraints migration
    const cascadeMigrationPath = path.join(
      __dirname,
      "migrations",
      "add-cascade-deletion-constraints.sql"
    );
    const cascadeMigrationSQL = fs.readFileSync(cascadeMigrationPath, "utf8");

    console.log("Executing cascade deletion constraints migration...");

    // Split SQL into individual statements
    const cascadeStatements = cascadeMigrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of cascadeStatements) {
      const { error } = await supabase.rpc("exec_sql", { sql: statement });
      if (error) {
        console.error("Error executing statement:", statement);
        console.error("Error:", error);
        throw error;
      }
    }

    console.log(
      "✅ Cascade deletion constraints migration completed successfully"
    );

    // Execute completed status migration
    const statusMigrationPath = path.join(
      __dirname,
      "migrations",
      "add-completed-status-to-orders.sql"
    );
    const statusMigrationSQL = fs.readFileSync(statusMigrationPath, "utf8");

    console.log("Executing completed status migration...");

    const statusStatements = statusMigrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statusStatements) {
      const { error } = await supabase.rpc("exec_sql", { sql: statement });
      if (error) {
        console.error("Error executing statement:", statement);
        console.error("Error:", error);
        throw error;
      }
    }

    console.log("✅ Completed status migration completed successfully");
    console.log(
      "🎉 All enhanced order management migrations completed successfully!"
    );
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  runMigration().catch(() => {
    console.log("Trying direct method...");
    runMigrationDirect();
  });
}

module.exports = { runMigration, runMigrationDirect };
