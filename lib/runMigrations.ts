import pool from "@/app/services/database";
import fs from "fs";
import path from "path";

const migrationsRun = new Set<string>();

export async function runMigrations() {
  try {
    const migrationsDir = path.join(process.cwd(), "migrations");
    
    if (!fs.existsSync(migrationsDir)) {
      console.log("No migrations directory found");
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (migrationsRun.has(file)) continue;

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      try {
        console.log(`🔄 Running migration: ${file}`);
        await pool.query(sql);
        migrationsRun.add(file);
        console.log(`✅ Migration completed: ${file}`);
      } catch (err) {
        console.error(`❌ Migration failed: ${file}`, err);
        throw err;
      }
    }

    console.log("✅ All migrations completed successfully");
  } catch (err) {
    console.error("Fatal migration error:", err);
    process.exit(1);
  }
}
