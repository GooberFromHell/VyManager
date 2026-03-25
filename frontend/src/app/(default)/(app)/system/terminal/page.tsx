"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PageHeader } from "@/components/ui/page-header";
import {
  Loader2,
  Lock,
  PlugZap,
  SquareTerminal,
  Unplug,
} from "lucide-react";
import {
  monitoringService,
  MonitoringStatus,
} from "@/lib/api/monitoring";
import { sessionService, ActiveSession } from "@/lib/api/session";
import { useTerminalWebSocket } from "@/hooks/useTerminalWebSocket";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

// xterm requires the DOM — never SSR this component
const SSHTerminal = dynamic(
  () =>
    import("@/components/terminal/SSHTerminal").then((m) => m.SSHTerminal),
  { ssr: false }
);

// ============================================================================
// Status badge helpers
// ============================================================================

const STATUS_LABELS = {
  disconnected: "Disconnected",
  connecting: "Connecting",
  connected: "Connected",
  error: "Error",
} as const;

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  connected: "default",
  connecting: "secondary",
  disconnected: "outline",
  error: "destructive",
};

// ============================================================================
// Page component
// ============================================================================

export default function TerminalPage() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [sshStatus, setSSHStatus] = useState<MonitoringStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // write() function exposed by the xterm instance
  const writeRef = useRef<((data: string) => void) | null>(null);

  const { canWrite } = usePermissions();
  const hasWriteAccess = canWrite(FeatureGroup.MONITORING);

  const { status, error, connect, disconnect, sendInput, sendResize } =
    useTerminalWebSocket({
      onOutput: useCallback((data: string) => {
        writeRef.current?.(data);
      }, []),
      onReady: useCallback(() => {
        // Connection is established — terminal is ready for input
      }, []),
      onError: useCallback(() => {
        // Error state is reflected via the `status` / `error` values from the hook
      }, []),
      onClosed: useCallback(() => {
        // Closed state is reflected via `status`
      }, []),
    });

  // Load page data on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const currentSession = await sessionService.getCurrentSession();
        setSession(currentSession);
        if (!currentSession) return;

        const statusData = await monitoringService.getMonitoringStatus();
        setSSHStatus(statusData);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load terminal data";
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Called by SSHTerminal once xterm has initialised and the DOM is ready.
  // At this point we know the real terminal dimensions, so we open the
  // WebSocket with an accurate initial size.
  const handleTerminalReady = useCallback(
    (
      write: (data: string) => void,
      cols: number,
      rows: number
    ) => {
      writeRef.current = write;
      if (hasWriteAccess) {
        connect(cols, rows);
      }
    },
    [connect, hasWriteAccess]
  );

  const handleReconnect = useCallback(() => {
    // We don't have direct access to the terminal dimensions here, so fall
    // back to a sensible default.  The FitAddon's ResizeObserver will fire
    // a resize event immediately after mount and correct the size.
    connect(220, 50);
  }, [connect]);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isDisconnected = status === "disconnected";

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="shrink-0">
        <PageHeader
          title="Terminal"
          description="Interactive SSH shell session"
          actions={
            <>
              {session && (
                <Badge variant="outline" className="text-xs">
                  {session.instance_name}
                </Badge>
              )}

              {!loading && sshStatus?.configured && (
                <Badge
                  variant={STATUS_VARIANTS[status]}
                  className="flex items-center gap-1.5"
                >
                  {isConnecting && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {isConnected && (
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse inline-block" />
                  )}
                  {STATUS_LABELS[status]}
                </Badge>
              )}

              {!loading && sshStatus?.configured && hasWriteAccess && (
                <>
                  {isDisconnected || status === "error" ? (
                    <Button size="sm" onClick={handleReconnect}>
                      <PlugZap className="mr-2 h-4 w-4" />
                      {status === "error" ? "Reconnect" : "Connect"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={disconnect}
                      disabled={isConnecting}
                    >
                      <Unplug className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  )}
                </>
              )}
            </>
          }
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Error alert (WebSocket errors)                                      */}
      {/* ------------------------------------------------------------------ */}
      {error && (
        <div className="shrink-0">
          <ErrorAlert
            title="Connection Error"
            message={error}
            onRetry={handleReconnect}
            retryLabel="Reconnect"
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <div className="flex items-center justify-center h-96">
          <ErrorAlert
            title="Failed to load"
            message={loadError}
            onRetry={() => window.location.reload()}
            className="max-w-md"
          />
        </div>
      ) : !session ? (
        <EmptyState
          icon={Unplug}
          title="No Active Instance"
          description="Connect to a VyOS instance to open a terminal session."
        />
      ) : !sshStatus?.configured ? (
        <EmptyState
          icon={SquareTerminal}
          title="SSH Not Configured"
          description={`SSH key access is not set up for ${session.instance_name}. Go to Sites → Edit Instance → SSH to configure.`}
        />
      ) : !hasWriteAccess ? (
        <EmptyState
          icon={Lock}
          title="Access Denied"
          description="You need write access to Monitoring to use the terminal."
        />
      ) : (
        /* Terminal card fills all remaining vertical space */
        <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <CardContent className="flex-1 min-h-0 p-0">
            <SSHTerminal
              onData={sendInput}
              onResize={sendResize}
              onReady={handleTerminalReady}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
