"use client";

import { useState } from "react";
import {
  Database,
  Send,
  Activity,
  Download,
  Wrench,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { backgroundJobsService } from "@/lib/api/background-jobs";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/types/api";
import { Button } from "../ui/button";

interface SiteToolsSectionProps {
  siteId: string;
  siteName: string;
  userRole: "ADMIN" | "OPERATOR" | "VIEWER";
}

interface PlaceholderTool {
  icon: React.ElementType;
  name: string;
  description: string;
}

const PLACEHOLDER_TOOLS: PlaceholderTool[] = [
  {
    icon: Send,
    name: "Bulk Config Push",
    description: "Push config templates across routers",
  },
  {
    icon: Activity,
    name: "Health Report",
    description: "Generate aggregate health report",
  },
  {
    icon: Download,
    name: "Firmware Management",
    description: "Coordinate firmware upgrades",
  },
];

export function SiteToolsSection({
  siteId,
  siteName,
  userRole,
}: SiteToolsSectionProps) {
  const { toast } = useToast();
  const [backingUp, setBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = userRole === "ADMIN";

  const handleBackup = async () => {
    if (backingUp || !isAdmin) return;

    try {
      setBackingUp(true);
      setError(null);
      const response = await backgroundJobsService.triggerSiteBackup(siteId);
      toast.success(
        "Backup started",
        `Backup started for ${response.job_ids.length} instance(s). View progress in Management → Jobs.`
      );
    } catch (err) {
      const message = (err as ApiError).message || "Failed to start backup";
      setError(message);
      toast.error("Backup failed", message);
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground/70" />
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
          Site Tools
        </h2>
      </div>

      {/* Tool cards grid */}
      <div className="flex flex-wrap gap-4">
        {/* Site Backup — functional */}
        <Button
          onClick={handleBackup}
          disabled={backingUp || !isAdmin}
          variant="outline"
          size="lg"
          className={cn(
            "min-w-50",
            isAdmin && !backingUp
              ? "hover:bg-card hover:border-border cursor-pointer"
              : "opacity-60 cursor-not-allowed select-none"
          )}
        >
          {backingUp ? (
            <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
          ) : (
            <Database className="h-4 w-4 text-muted-foreground/70 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-muted-foreground">
              {backingUp ? "Backing up..." : "Site Backup"}
            </span>
          </div>
          {!isAdmin ? (
            <Badge
              variant="outline"
              className="text-[10px] shrink-0 text-muted-foreground/70 border-border/50"
            >
              Admin only
            </Badge>
          ) : null}
        </Button>

        {/* Placeholder tools */}
        {PLACEHOLDER_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.name}
              variant="outline"
              size="lg"
              className={cn(
                "min-w-50",
                "flex justify-items-stretch rounded-lg border border-border/50 bg-card/50 px-4 py-3",
                "opacity-60 cursor-not-allowed select-none"
              )}
            >
              <Icon className="h-4 w-4 text-muted-foreground/70 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {tool.name}
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] shrink-0 text-muted-foreground/70 border-border/50"
              >
                Soon
              </Badge>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
