"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Server,
  HardDrive,
  Clock,
  Box,
  Image,
  Play,
  Square,
} from "lucide-react";
import type {
  BackgroundJob,
  ContainerFullBackup,
  InstanceBackupResult,
} from "@/lib/api/types/background-jobs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<
  string,
  { color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  success: { color: "text-green-400", icon: Check },
  partial: { color: "text-yellow-400", icon: AlertTriangle },
  failed: { color: "text-red-400", icon: X },
  running: { color: "text-blue-400", icon: Clock },
  queued: { color: "text-muted-foreground", icon: Clock },
  cancelled: { color: "text-muted-foreground", icon: X },
};

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function countConfigLines(commands: string | null | undefined): number {
  if (!commands) return 0;
  return commands.split("\n").filter((l) => l.trim()).length;
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.queued;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 ${cfg.color}`}>
      <Icon className="size-3" />
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// ContainerRow
// ---------------------------------------------------------------------------

function ContainerRow({ container }: { container: ContainerFullBackup }) {
  const [open, setOpen] = useState(false);

  const hasConfig = countConfigLines(container.config_commands) > 0;
  const hasImageDigest = !!container.image_manifest?.image_digest;
  const imageError = container.image_manifest?.error;
  const isRunning = container.runtime_status?.running ?? false;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full text-left" asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* Expand chevron */}
          {open ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )}

          {/* Container name */}
          <Box className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-mono font-medium truncate min-w-0">
            {container.container_name}
          </span>

          {/* Indicators — push to the right */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {/* Config status */}
            <span
              className="flex items-center gap-1 text-xs"
              title={
                hasConfig
                  ? `${countConfigLines(container.config_commands)} config commands`
                  : "No config commands"
              }
            >
              {hasConfig ? (
                <Check className="size-3.5 text-green-400" />
              ) : (
                <X className="size-3.5 text-red-400" />
              )}
              <span className="text-muted-foreground">config</span>
            </span>

            {/* Image digest status */}
            <span
              className="flex items-center gap-1 text-xs"
              title={
                hasImageDigest
                  ? container.image_manifest.image_digest!
                  : imageError ?? "No image digest"
              }
            >
              {hasImageDigest ? (
                <Check className="size-3.5 text-green-400" />
              ) : (
                <X className="size-3.5 text-red-400" />
              )}
              <span className="text-muted-foreground">image</span>
            </span>

            {/* Volume summary */}
            {container.volumes.length > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <HardDrive className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {container.volumes.filter((v) => !v.error).length}/
                  {container.volumes.length} vols
                </span>
              </span>
            )}

            {/* Runtime status */}
            {container.runtime_status && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 leading-4 ${
                  isRunning
                    ? "text-green-400 border-green-400/30"
                    : "text-muted-foreground border-muted-foreground/30"
                }`}
              >
                {isRunning ? (
                  <Play className="size-2.5 mr-0.5" />
                ) : (
                  <Square className="size-2.5 mr-0.5" />
                )}
                {isRunning ? "Running" : "Stopped"}
              </Badge>
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-7 space-y-3 pb-3 pt-1">
          {/* Volume details */}
          {container.volumes.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Volumes
              </p>
              {container.volumes.map((vol) => (
                <div
                  key={vol.volume_name}
                  className="flex items-center gap-2 text-xs pl-2"
                >
                  <HardDrive className="size-3 text-muted-foreground shrink-0" />
                  <span className="font-mono text-muted-foreground">
                    {vol.source_path}
                  </span>
                  {vol.error ? (
                    <span className="text-red-400 flex items-center gap-1">
                      <X className="size-3" />
                      {vol.error}
                    </span>
                  ) : (
                    <span className="text-green-400 flex items-center gap-1">
                      <Check className="size-3" />
                      {formatBytes(vol.size_bytes)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Image manifest details */}
          {container.image_manifest && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Image
              </p>
              <div className="flex items-center gap-2 text-xs pl-2">
                <Image className="size-3 text-muted-foreground shrink-0" />
                <span className="font-mono text-muted-foreground truncate">
                  {container.image_manifest.image_ref}
                </span>
              </div>
              {container.image_manifest.image_digest && (
                <div className="flex items-center gap-2 text-xs pl-2">
                  <Check className="size-3 text-green-400 shrink-0" />
                  <span className="font-mono text-muted-foreground truncate">
                    {container.image_manifest.image_digest}
                  </span>
                </div>
              )}
              {container.image_manifest.error && (
                <div className="flex items-center gap-2 text-xs pl-2">
                  <X className="size-3 text-red-400 shrink-0" />
                  <span className="text-red-400">
                    {container.image_manifest.error}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Config commands */}
          {hasConfig && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Config Commands ({countConfigLines(container.config_commands)})
              </p>
              <pre className="font-mono text-xs bg-muted/50 p-3 rounded overflow-x-auto max-h-48 overflow-y-auto text-muted-foreground">
                {container.config_commands}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// BackupDetailModal
// ---------------------------------------------------------------------------

interface BackupDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: BackgroundJob;
}

export function BackupDetailModal({
  open,
  onOpenChange,
  job,
}: BackupDetailModalProps) {
  const result = job.result as InstanceBackupResult | null;
  const configLineCount = countConfigLines(result?.config_commands);
  const containers = result?.containers ?? [];
  const containerErrors = result?.container_backup_errors ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="space-y-1 min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Server className="size-5 shrink-0" />
                <span className="truncate">
                  Instance Backup — {job.instance_name}
                </span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                {job.site_name}
              </DialogDescription>
            </div>
            <StatusBadge status={result?.status ?? job.status} />
          </div>
        </DialogHeader>

        <Separator />

        {/* Scrollable body */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-5">
            {/* Summary section */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  VyOS Version
                </p>
                <p className="font-mono">
                  {result?.vyos_version ?? "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  Config Commands
                </p>
                <p className="font-mono">
                  {configLineCount > 0
                    ? `${configLineCount} lines`
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  Backed Up At
                </p>
                <p className="font-mono text-xs">
                  {formatTimestamp(result?.backed_up_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  Host
                </p>
                <p className="font-mono">
                  {result?.host ?? "--"}
                </p>
              </div>
            </div>

            {/* Error (top-level) */}
            {result?.error && (
              <div className="flex items-start gap-2 rounded-md border border-red-400/20 bg-red-400/5 p-3">
                <X className="size-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{result.error}</p>
              </div>
            )}

            {/* Container section */}
            {containers.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Box className="size-4" />
                    Containers ({containers.length})
                  </h3>
                  <div className="rounded-md border divide-y">
                    {containers.map((c) => (
                      <ContainerRow
                        key={c.container_name}
                        container={c}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Container backup errors */}
            {containerErrors.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="size-4" />
                    Container Backup Errors ({containerErrors.length})
                  </h3>
                  <div className="space-y-1.5">
                    {containerErrors.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-md border border-yellow-400/20 bg-yellow-400/5 p-2.5"
                      >
                        <AlertTriangle className="size-3.5 text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-400">{err}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* No result fallback */}
            {!result && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {job.status === "queued" || job.status === "running"
                  ? "Backup is still in progress..."
                  : "No backup result available."}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
