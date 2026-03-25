"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Server, Power, PowerOff, Loader2, MoreVertical, Pencil, Trash2, MoveRight } from "lucide-react";
import { Instance } from "@/lib/api/session";
import { ApiError } from "@/lib/types/api";

type ReachabilityStatus = "online" | "offline" | "error" | "checking";

interface ReachabilityIndicatorProps {
  status: ReachabilityStatus;
  latencyMs?: number;
}

function ReachabilityIndicator({ status, latencyMs }: ReachabilityIndicatorProps) {
  if (status === "online") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-medium text-emerald-500">Online</span>
        {latencyMs !== undefined && (
          <span className="text-xs text-muted-foreground">{latencyMs}ms</span>
        )}
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-xs font-medium text-red-500">Unreachable</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-xs font-medium text-amber-500">Error</span>
      </div>
    );
  }

  // "checking"
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse" />
      <span className="text-xs text-muted-foreground">Checking...</span>
    </div>
  );
}

interface InstanceCardProps {
  instance: Instance;
  isActive: boolean;
  userRole: string;
  reachabilityStatus?: ReachabilityStatus;
  latencyMs?: number;
  onConnect: (instanceId: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onEdit: (instance: Instance) => void;
  onMove: (instance: Instance) => void;
  onDelete: (instance: Instance) => void;
}

export function InstanceCard({
  instance,
  isActive,
  userRole,
  reachabilityStatus,
  latencyMs,
  onConnect,
  onDisconnect,
  onEdit,
  onMove,
  onDelete,
}: InstanceCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = userRole === "ADMIN";

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConnect(instance.id);
    } catch (err) {
      setError((err as ApiError).message || "Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await onDisconnect();
    } catch (err) {
      setError((err as ApiError).message || "Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-200 ease-[var(--ease-out-quart)] ${
        isActive
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg p-2 ${
              isActive ? "bg-primary/10" : "bg-muted"
            }`}
          >
            <Server
              className={`h-5 w-5 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground leading-tight">{instance.name}</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {instance.host}:{instance.port}
            </p>
            {reachabilityStatus !== undefined && (
              <div className="mt-1">
                <ReachabilityIndicator
                  status={reachabilityStatus}
                  latencyMs={latencyMs}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Status Badge */}
          {isActive && (
            <Badge variant="default" className="bg-primary text-xs">
              Connected
            </Badge>
          )}
          {!instance.is_active && !isActive && (
            <Badge variant="secondary" className="text-xs">Inactive</Badge>
          )}

          {/* Instance Management Dropdown */}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(instance)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMove(instance)}>
                  <MoveRight className="h-4 w-4 mr-2" />
                  Move to Site
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(instance)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Description */}
      {instance.description && (
        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
          {instance.description}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
        {!isActive ? (
          <Button
            onClick={handleConnect}
            disabled={loading || !instance.is_active}
            size="sm"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Power className="h-4 w-4 mr-2" />
                Connect
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleDisconnect}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <PowerOff className="h-4 w-4 mr-2" />
                Disconnect
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
