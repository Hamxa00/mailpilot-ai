/**
 * API endpoint to test database connection
 */
import { NextRequest, NextResponse } from "next/server";
import {
  initializeDatabase,
  getDatabaseStatus,
  getDatabase,
} from "@/lib/database/database-connection";
import { user } from "@/db/schema";

export async function GET() {
  try {
    // Initialize database
    await initializeDatabase({
      enableRLS: true,
    });

    const status = getDatabaseStatus();
    const db = getDatabase();

    // Test a simple query
    const userCount = await db.select().from(user).limit(10);

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      status: {
        connected: status.connected,
        connectedAt: status.connectedAt,
        lastHealthCheck: status.lastHealthCheck,
        poolSize: status.poolSize,
      },
      data: {
        totalUsers: userCount.length,
        users: userCount.map((u) => ({
          id: u.id,
          emailAddress: u.emailAddress,
          firstName: u.firstName,
          lastName: u.lastName,
          createdAt: u.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Database connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
