"use client";

import { useState } from "react";
import {
  Server,
  Download,
  XCircle,
  ScrollText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JobLogPanel } from "./JobLogPanel";
import type { BackgroundJob, JobStatus } from "@/lib/api/types/background-jobs";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: BackgroundJob;
  onCancel: (jobId: string) => void;
  onDownload: (jobId: string, instanceName: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day(s) ago`;
}

function getElapsed(startedAt: string | null): string {
  if (!startedAt) return "--";
  const diff = Date.now() - new Date(startedAt).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

const statusConfig: Record<
  JobStatus,
  {
    icon: typeof CheckCircle2;
    label: string;
    badgeClass: string;
    iconClass: string;
  }
> = {
  queued: {
    icon: Clock,
    label: "Queued",
    badgeClass: "bg-muted text-muted-foreground border-border",
    iconClass: "text-muted-foreground",
  },
  running: {
    icon: Loader2,
    label: "Running",
    badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    iconClass: "text-yellow-400 animate-spin",
  },
  success: {
    icon: CheckCircle2,
    label: "Success",
    badgeClass: "bg-green-500/10 text-green-400 border-green-500/20",
    iconClass: "text-green-400",
  },
  partial: {
    icon: AlertTriangle,
    label: "Partial",
    badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    iconClass: "text-yellow-400",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    iconClass: "text-red-400",
  },
  cancelled: {
    icon: Ban,
    label: "Cancelled",
    badgeClass: "bg-muted text-muted-foreground border-border",
    iconClass: "text-muted-foreground",
  },
};

export function JobCard({ job, onCancel, onDownload }: JobCardProps) {
  const [showLogs, setShowLogs] = useState(false);
  const config = statusConfig[job.status];
  const StatusIcon = config.icon;

  const isActive = job.status === "queued" || job.status === "running";
  const isFinished =
    job.status === "success" ||
    job.status === "partial" ||
    job.status === "failed" ||
    job.status === "cancelled";

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      {/* Header: instance name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Server className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {job.instance_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {job.site_name}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0 gap-1", config.badgeClass)}
        >
          <StatusIcon className={cn("h-3 w-3", config.iconClass)} />
          {config.label}
        </Badge>
      </div>

      {/* Progress bar (only when running) */}
      {job.status === "running" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-mono">{job.progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Time info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" />
        {isActive && job.started_at ? (
          <span>
            Running for{" "}
            <span className="font-mono">{getElapsed(job.started_at)}</span>
          </span>
        ) : isActive ? (
          <span>Queued {timeAgo(job.created_at)}</span>
        ) : job.finished_at ? (
          <span>Finished {timeAgo(job.finished_at)}</span>
        ) : (
          <span>Created {timeAgo(job.created_at)}</span>
        )}
      </div>

      {/* Error message */}
      {job.error && (
        <div className="rounded-md bg-red-500/5 border border-red-500/10 px-3 py-2">
          <p className="text-xs text-red-400 line-clamp-2">{job.error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        {job.log.length > 0 && (
          <Button
            variant={showLogs ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
            className="gap-1.5"
          >
            <ScrollText className="h-3 w-3" />
            Logs
            {job.log.length > 0 && (
              <span className="font-mono text-[10px] text-muted-foreground">
                ({job.log.length})
              </span>
            )}
          </Button>
        )}

        {isActive && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onCancel(job.job_id)}
            disabled={job.cancel_requested}
            className="gap-1.5"
          >
            <XCircle className="h-3 w-3" />
            {job.cancel_requested ? "Cancelling..." : "Cancel"}
          </Button>
        )}

        {(job.status === "success" || job.status === "partial") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(job.job_id, job.instance_name)}
            className="gap-1.5"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
        )}
      </div>

      {/* Log panel */}
      {showLogs && <JobLogPanel logs={job.log} />}
    </div>
  );
}
