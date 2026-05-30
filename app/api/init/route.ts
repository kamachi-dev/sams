import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/runMigrations";

export async function GET() {
  try {
    console.log("🔄 Initializing database migrations...");
    await runMigrations();
    return NextResponse.json({ 
      success: true, 
      message: "Database migrations completed" 
    });
  } catch (err) {
    console.error("Migration initialization failed:", err);
    return NextResponse.json(
      { 
        success: false, 
        error: "Database migration failed" 
      },
      { status: 500 }
    );
  }
}
