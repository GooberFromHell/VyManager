"use client";

import { useState, useMemo } from "react";
import {
  RefreshCw,
  Clock,
  Briefcase,
  Filter,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useJobPolling } from "@/hooks/useJobPolling";
import { JobCard } from "./JobCard";
import { backgroundJobsService } from "@/lib/api/background-jobs";
import type { BackgroundJob, TriggerGroup } from "@/lib/api/types/background-jobs";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "running" | "completed" | "failed";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day(s) ago`;
}

function groupByTrigger(jobs: BackgroundJob[]): TriggerGroup[] {
  const map = new Map<string, BackgroundJob[]>();
  for (const job of jobs) {
    const existing = map.get(job.trigger_id) || [];
    existing.push(job);
    map.set(job.trigger_id, existing);
  }
  return Array.from(map.entries())
    .map(([triggerId, groupJobs]) => ({
      trigger_id: triggerId,
      site_name: groupJobs[0]?.site_name || "Unknown",
      created_at: groupJobs[0]?.created_at || "",
      jobs: groupJobs.sort((a, b) =>
        a.instance_name.localeCompare(b.instance_name)
      ),
    }))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

function filterJobsByStatus(
  jobs: BackgroundJob[],
  filter: StatusFilter
): BackgroundJob[] {
  if (filter === "all") return jobs;
  if (filter === "running")
    return jobs.filter((j) => j.status === "queued" || j.status === "running");
  if (filter === "completed")
    return jobs.filter(
      (j) => j.status === "success" || j.status === "partial"
    );
  if (filter === "failed")
    return jobs.filter(
      (j) => j.status === "failed" || j.status === "cancelled"
    );
  return jobs;
}

function getGroupStatusSummary(jobs: BackgroundJob[]): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  const statuses = new Set(jobs.map((j) => j.status));
  if (statuses.has("running") || statuses.has("queued")) {
    return { label: "In Progress", variant: "default" };
  }
  if (statuses.has("failed")) {
    return { label: "Has Failures", variant: "destructive" };
  }
  if (statuses.has("partial")) {
    return { label: "Partial", variant: "secondary" };
  }
  if (statuses.has("cancelled")) {
    return { label: "Cancelled", variant: "outline" };
  }
  return { label: "Complete", variant: "secondary" };
}

export function BackgroundJobsView() {
  const { jobs, loading, error, refetch, runningCount } = useJobPolling();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");

  // Unique site names for filter dropdown
  const siteNames = useMemo(() => {
    const names = new Set(jobs.map((j) => j.site_name));
    return Array.from(names).sort();
  }, [jobs]);

  // Apply filters
  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (siteFilter !== "all") {
      result = result.filter((j) => j.site_name === siteFilter);
    }
    result = filterJobsByStatus(result, statusFilter);
    return result;
  }, [jobs, statusFilter, siteFilter]);

  const groups = useMemo(
    () => groupByTrigger(filteredJobs),
    [filteredJobs]
  );

  const handleCancel = async (jobId: string) => {
    try {
      await backgroundJobsService.cancelJob(jobId);
      refetch();
    } catch (err) {
      console.error("Failed to cancel job:", err);
    }
  };

  const handleDownload = async (jobId: string, instanceName: string) => {
    try {
      await backgroundJobsService.downloadJobBackup(jobId, instanceName);
    } catch (err) {
      console.error("Failed to download backup:", err);
    }
  };

  const handleDownloadAll = async (triggerId: string, siteName: string) => {
    try {
      await backgroundJobsService.downloadSiteBackup(triggerId, siteName);
    } catch (err) {
      console.error("Failed to download site backup:", err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading jobs..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-3 w-3 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const statusFilters: { value: StatusFilter; label: string; count: number }[] =
    [
      { value: "all", label: "All", count: jobs.length },
      {
        value: "running",
        label: "Running",
        count: jobs.filter(
          (j) => j.status === "queued" || j.status === "running"
        ).length,
      },
      {
        value: "completed",
        label: "Completed",
        count: jobs.filter(
          (j) => j.status === "success" || j.status === "partial"
        ).length,
      },
      {
        value: "failed",
        label: "Failed",
        count: jobs.filter(
          (j) => j.status === "failed" || j.status === "cancelled"
        ).length,
      },
    ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            {statusFilters.map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter(f.value)}
                className="gap-1.5"
              >
                {f.label}
                {f.count > 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1 rounded",
                      statusFilter === f.value
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {f.count}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Site filter */}
          {siteNames.length > 1 && (
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger size="sm" className="w-[180px]">
                <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {siteNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {runningCount > 0 && (
            <Badge variant="default" className="gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-foreground" />
              </span>
              {runningCount} active
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Job groups */}
      {groups.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description={
            statusFilter !== "all" || siteFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "Background jobs will appear here when you trigger site backups or other operations."
          }
          action={
            statusFilter !== "all" || siteFilter !== "all"
              ? {
                  label: "Clear Filters",
                  onClick: () => {
                    setStatusFilter("all");
                    setSiteFilter("all");
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const statusSummary = getGroupStatusSummary(group.jobs);
            const hasDownloadable = group.jobs.some(
              (j) =>
                (j.status === "success" || j.status === "partial") &&
                j.result !== null
            );
            const isGroupDone = group.jobs.every(
              (j) =>
                j.status !== "queued" && j.status !== "running"
            );
            return (
              <div key={group.trigger_id} className="space-y-3">
                {/* Group header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {group.site_name}
                    </h3>
                    <Badge variant={statusSummary.variant} className="text-[10px]">
                      {statusSummary.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(group.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isGroupDone && hasDownloadable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadAll(group.trigger_id, group.site_name)
                        }
                        className="gap-1.5"
                      >
                        <Download className="h-3 w-3" />
                        Download All
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      {group.jobs.length}{" "}
                      {group.jobs.length === 1 ? "instance" : "instances"}
                    </span>
                  </div>
                </div>

                {/* Job cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {group.jobs.map((job) => (
                    <JobCard
                      key={job.job_id}
                      job={job}
                      onCancel={handleCancel}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
