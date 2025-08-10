"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  Users,
  RefreshCw,
} from "lucide-react";

interface DatabaseStatus {
  success: boolean;
  message: string;
  status?: {
    connected: boolean;
    connectedAt: string;
    lastHealthCheck: string;
    poolSize: number;
  };
  data?: {
    totalUsers: number;
    users: Array<{
      id: string;
      emailAddress: string;
      firstName: string | null;
      lastName: string | null;
      createdAt: string;
    }>;
  };
  error?: string;
}

export function DatabaseStatusCard() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const checkDatabaseStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/test-db");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        success: false,
        message: "Failed to connect to API",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Status
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={checkDatabaseStatus}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !status ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Checking database connection...</span>
          </div>
        ) : status ? (
          <>
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {status.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <Badge variant={status.success ? "default" : "destructive"}>
                {status.success ? "Connected" : "Disconnected"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {status.message}
              </span>
            </div>

            {/* Connection Details */}
            {status.success && status.status && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Connected At:</strong>
                  <br />
                  <span className="text-muted-foreground">
                    {new Date(status.status.connectedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <strong>Last Health Check:</strong>
                  <br />
                  <span className="text-muted-foreground">
                    {new Date(status.status.lastHealthCheck).toLocaleString()}
                  </span>
                </div>
                <div>
                  <strong>Pool Size:</strong>
                  <br />
                  <span className="text-muted-foreground">
                    {status.status.poolSize}
                  </span>
                </div>
                <div>
                  <strong>Status:</strong>
                  <br />
                  <span className="text-green-600">Healthy</span>
                </div>
              </div>
            )}

            {/* User Data */}
            {status.success && status.data && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <strong>Users in Database: {status.data.totalUsers}</strong>
                </div>
                {status.data.users.length > 0 && (
                  <div className="bg-muted/50 rounded p-3">
                    <div className="text-sm space-y-1">
                      {status.data.users.map((user) => (
                        <div key={user.id} className="flex justify-between">
                          <span>
                            {user.firstName || "Unknown"} {user.lastName || ""}
                            <span className="text-muted-foreground ml-2">
                              ({user.emailAddress})
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Details */}
            {!status.success && status.error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <strong className="text-red-800">Error:</strong>
                <pre className="text-sm text-red-700 mt-1 whitespace-pre-wrap">
                  {status.error}
                </pre>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Click refresh to check database status
          </div>
        )}
      </CardContent>
    </Card>
  );
}
