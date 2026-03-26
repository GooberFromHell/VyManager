"use client";

import { InProgress } from "@/components/layout/InProgress";
import { BfdContent } from "@/components/bfd/BfdContent";
import { MplsContent } from "@/components/mpls/MplsContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Settings, ChevronRight, Activity, Box, Waypoints, Globe, Shield } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type InfraType = "bfd" | "mpls" | "segment-routing" | "nhrp" | "rpki";

const allInfrastructure = [
  { id: "bfd" as InfraType, name: "BFD", description: "Bidirectional Forwarding Detection", icon: Activity, permission: FeatureGroup.BFD },
  { id: "mpls" as InfraType, name: "MPLS", description: "Multiprotocol Label Switching", icon: Box, permission: FeatureGroup.MPLS },
  { id: "segment-routing" as InfraType, name: "Segment Routing", description: "Source routing with segments", icon: Waypoints, permission: FeatureGroup.SEGMENT_ROUTING },
  { id: "nhrp" as InfraType, name: "NHRP", description: "Next Hop Resolution Protocol", icon: Globe, permission: FeatureGroup.NHRP },
  { id: "rpki" as InfraType, name: "RPKI", description: "Resource Public Key Infrastructure", icon: Shield, permission: FeatureGroup.RPKI },
];

export default function InfrastructurePage() {
  const { canRead, isLoading } = usePermissions();

  // Filter infrastructure based on user permissions
  const infrastructure = useMemo(() => {
    if (isLoading) return [];
    return allInfrastructure.filter(infra => canRead(infra.permission));
  }, [canRead, isLoading]);

  const [selectedInfra, setSelectedInfra] = useState<InfraType | null>(null);

  // Auto-select first available infrastructure component
  useEffect(() => {
    if (infrastructure.length > 0 && !selectedInfra) {
      setSelectedInfra(infrastructure[0].id);
    }
  }, [infrastructure, selectedInfra]);

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Infrastructure Selector */}
      <div className="w-64 border-r border-border bg-card flex flex-col h-full">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Routing Infrastructure</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Advanced routing features
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Infrastructure List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-xs text-muted-foreground">Loading infrastructure...</p>
              </div>
            ) : infrastructure.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-xs text-muted-foreground">No accessible infrastructure</p>
              </div>
            ) : (
              infrastructure.map((infra) => {
                const Icon = infra.icon;
                return (
                  <button
                    key={infra.id}
                    onClick={() => setSelectedInfra(infra.id)}
                    className={cn(
                      "w-full text-left rounded-md px-2 py-2 transition-all",
                      selectedInfra === infra.id
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1",
                        selectedInfra === infra.id ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-3.5 w-3.5",
                          selectedInfra === infra.id ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-medium text-sm text-foreground">
                            {infra.name}
                          </span>
                          {selectedInfra === infra.id && (
                            <ChevronRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {infra.description}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {selectedInfra === "bfd" ? (
          <BfdContent />
        ) : selectedInfra === "mpls" ? (
          <MplsContent />
        ) : (
          <InProgress />
        )}
      </div>
    </div>
  );
}
