"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Server,
  Upload,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Box,
  HardDrive,
  Image,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { sessionService, Instance } from "@/lib/api/session";
import { backgroundJobsService } from "@/lib/api/background-jobs";
import type {
  ContainerFullBackup,
  ContainerRestoreResponse,
  RestoreStepResult,
} from "@/lib/api/types/background-jobs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function countConfigLines(commands: string | null | undefined): number {
  if (!commands) return 0;
  return commands.split("\n").filter((l) => l.trim()).length;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContainerRestoreWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: ContainerFullBackup;
  siteId: string;
  siteName: string;
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<1 | 2 | 3, string> = {
  1: "Select Target",
  2: "Confirm Restoration",
  3: "Results",
};

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {([1, 2, 3] as const).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span
            className={`flex items-center justify-center size-5 rounded-full text-[10px] font-medium border ${
              s === step
                ? "bg-primary text-primary-foreground border-primary"
                : s < step
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-muted border-border text-muted-foreground"
            }`}
          >
            {s < step ? <Check className="size-3" /> : s}
          </span>
          <span
            className={
              s === step ? "text-foreground font-medium" : "text-muted-foreground"
            }
          >
            {STEP_LABELS[s]}
          </span>
          {s < 3 && (
            <span className="text-muted-foreground/50 mx-1">/</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Select Target Instance
// ---------------------------------------------------------------------------

function StepSelectInstance({
  instances,
  loadingInstances,
  instancesError,
  selectedInstanceId,
  onSelect,
}: {
  instances: Array<{ id: string; name: string; host: string }>;
  loadingInstances: boolean;
  instancesError: string | null;
  selectedInstanceId: string;
  onSelect: (id: string) => void;
}) {
  if (loadingInstances) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading instances...</p>
      </div>
    );
  }

  if (instancesError) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-red-400/20 bg-red-400/5 p-4">
        <AlertTriangle className="size-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-400">
            Failed to load instances
          </p>
          <p className="text-xs text-red-400/80 mt-1">{instancesError}</p>
        </div>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
        <Server className="size-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No instances available in this site.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium" htmlFor="target-instance">
        Target Instance
      </label>
      <Select value={selectedInstanceId} onValueChange={onSelect}>
        <SelectTrigger id="target-instance">
          <SelectValue placeholder="Select an instance to restore to" />
        </SelectTrigger>
        <SelectContent>
          {instances.map((inst) => (
            <SelectItem key={inst.id} value={inst.id}>
              <div className="flex items-center gap-2">
                <Server className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">{inst.name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {inst.host}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        The container will be restored to the selected VyOS instance.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Confirm Restoration
// ---------------------------------------------------------------------------

function StepConfirm({ container }: { container: ContainerFullBackup }) {
  const configLines = countConfigLines(container.config_commands);
  const successfulVolumes = container.volumes.filter((v) => !v.error);
  const wasRunning = container.runtime_status?.running ?? false;

  return (
    <div className="space-y-4">
      {/* Container summary */}
      <div className="rounded-md border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Box className="size-4 text-muted-foreground" />
          <span className="font-mono font-medium text-sm">
            {container.container_name}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              Config Commands
            </p>
            <p className="font-mono">
              {configLines > 0 ? `${configLines} commands` : "None"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Image</p>
            <p className="font-mono text-xs truncate" title={container.image_manifest.image_ref}>
              {container.image_manifest.image_ref}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              Restart After Restore
            </p>
            <p className="font-mono">{wasRunning ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              Volumes
            </p>
            <p className="font-mono">
              {successfulVolumes.length > 0
                ? `${successfulVolumes.length} volume${successfulVolumes.length !== 1 ? "s" : ""}`
                : "None"}
            </p>
          </div>
        </div>
      </div>

      {/* Volume details */}
      {successfulVolumes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Volumes to Restore
          </p>
          <div className="rounded-md border divide-y">
            {successfulVolumes.map((vol) => (
              <div
                key={vol.volume_name}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <HardDrive className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs truncate min-w-0">
                  {vol.volume_name}
                </span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {formatBytes(vol.size_bytes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-400">Warning</p>
            <p className="text-xs text-muted-foreground mt-1">
              This will overwrite any existing container configuration with the
              same name on the target instance. Volume data will be replaced. This
              action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Execute & Results
// ---------------------------------------------------------------------------

function StepResults({
  loading,
  result,
  error,
}: {
  loading: boolean;
  result: ContainerRestoreResponse | null;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Restoring container...
        </p>
        <p className="text-xs text-muted-foreground">
          This may take a moment depending on volume sizes.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-red-400/20 bg-red-400/5 p-4">
          <X className="size-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">
              Restore Failed
            </p>
            <p className="text-xs text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-4">
      {/* Overall status */}
      <div
        className={`flex items-center gap-3 rounded-md border p-3 ${
          result.success
            ? "border-green-400/20 bg-green-400/5"
            : "border-red-400/20 bg-red-400/5"
        }`}
      >
        {result.success ? (
          <Check className="size-5 text-green-400 shrink-0" />
        ) : (
          <X className="size-5 text-red-400 shrink-0" />
        )}
        <div>
          <p
            className={`text-sm font-medium ${
              result.success ? "text-green-400" : "text-red-400"
            }`}
          >
            {result.success
              ? "Container restored successfully"
              : "Container restore completed with errors"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {result.container_name}
          </p>
        </div>
      </div>

      {/* Per-step results */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Restore Steps
        </p>
        <div className="rounded-md border divide-y">
          {result.steps.map((stepResult: RestoreStepResult, idx: number) => (
            <div
              key={idx}
              className="flex items-start gap-3 px-3 py-2.5 text-sm"
            >
              {stepResult.success ? (
                <Check className="size-4 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <X className="size-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{stepResult.step}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stepResult.message}
                </p>
                {stepResult.error && (
                  <p className="text-xs text-red-400 mt-1 font-mono">
                    {stepResult.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContainerRestoreWizard
// ---------------------------------------------------------------------------

export function ContainerRestoreWizard({
  open,
  onOpenChange,
  container,
  siteId,
  siteName,
}: ContainerRestoreWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [instances, setInstances] = useState<
    Array<{ id: string; name: string; host: string }>
  >([]);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [instancesError, setInstancesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContainerRestoreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch instances when the dialog opens
  const fetchInstances = useCallback(async () => {
    setLoadingInstances(true);
    setInstancesError(null);
    try {
      const data: Instance[] = await sessionService.listInstances(siteId);
      setInstances(
        data.map((inst) => ({
          id: inst.id,
          name: inst.name,
          host: inst.host,
        })),
      );
    } catch (err) {
      setInstancesError(
        err instanceof Error ? err.message : "Failed to load instances",
      );
    } finally {
      setLoadingInstances(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (open) {
      fetchInstances();
    }
  }, [open, fetchInstances]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedInstanceId("");
      setInstances([]);
      setLoading(false);
      setResult(null);
      setError(null);
      setInstancesError(null);
    }
  }, [open]);

  // Execute the restore
  const handleRestore = async () => {
    if (!selectedInstanceId) return;

    setStep(3);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await backgroundJobsService.restoreContainer(
        siteId,
        selectedInstanceId,
        container,
      );
      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to restore container",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 shrink-0" />
            Restore Container
          </DialogTitle>
          <DialogDescription>
            Restore <span className="font-mono font-medium text-foreground">{container.container_name}</span> to
            an instance in <span className="font-medium text-foreground">{siteName}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="pb-1">
          <StepIndicator step={step} />
        </div>

        {/* Step content */}
        <div className="min-h-[180px]">
          {step === 1 && (
            <StepSelectInstance
              instances={instances}
              loadingInstances={loadingInstances}
              instancesError={instancesError}
              selectedInstanceId={selectedInstanceId}
              onSelect={setSelectedInstanceId}
            />
          )}
          {step === 2 && <StepConfirm container={container} />}
          {step === 3 && (
            <StepResults loading={loading} result={result} error={error} />
          )}
        </div>

        {/* Footer */}
        <DialogFooter>
          {step === 1 && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedInstanceId}
                onClick={() => setStep(2)}
              >
                Next
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button onClick={handleRestore}>
                <Upload className="mr-2 size-4" />
                Restore to {selectedInstance?.name ?? "Instance"}
              </Button>
            </>
          )}

          {step === 3 && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {loading ? "Restoring..." : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
