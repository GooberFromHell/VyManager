"use client";

import { InProgress } from "@/components/layout/InProgress";
import { IgmpProxyContent } from "@/components/igmp-proxy/IgmpProxyContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Radio, ChevronRight, Wifi } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type MulticastType = "igmp-proxy" | "pim" | "pim6";

const allMulticast = [
  { id: "igmp-proxy" as MulticastType, name: "IGMP Proxy", description: "Internet Group Management Protocol Proxy", icon: Wifi, permission: FeatureGroup.IGMP_PROXY },
  { id: "pim" as MulticastType, name: "PIM", description: "Protocol Independent Multicast", icon: Radio, permission: FeatureGroup.PIM },
  { id: "pim6" as MulticastType, name: "PIM6", description: "Protocol Independent Multicast for IPv6", icon: Radio, permission: FeatureGroup.PIM6 },
];

export default function MulticastPage() {
  const { canRead, isLoading } = usePermissions();

  // Filter multicast protocols based on user permissions
  const multicast = useMemo(() => {
    if (isLoading) return [];
    return allMulticast.filter(protocol => canRead(protocol.permission));
  }, [canRead, isLoading]);

  const [selectedMulticast, setSelectedMulticast] = useState<MulticastType | null>(null);

  // Auto-select first available multicast protocol
  useEffect(() => {
    if (multicast.length > 0 && !selectedMulticast) {
      setSelectedMulticast(multicast[0].id);
    }
  }, [multicast, selectedMulticast]);

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Multicast Protocol Selector */}
      <div className="w-64 border-r border-border bg-card flex flex-col h-full">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Multicast</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multicast routing protocols
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Multicast Protocol List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-xs text-muted-foreground">Loading multicast protocols...</p>
              </div>
            ) : multicast.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-xs text-muted-foreground">No accessible multicast protocols</p>
              </div>
            ) : (
              multicast.map((protocol) => {
                const Icon = protocol.icon;
                return (
                  <button
                    key={protocol.id}
                    onClick={() => setSelectedMulticast(protocol.id)}
                    className={cn(
                      "w-full text-left rounded-md px-2 py-2 transition-all",
                      selectedMulticast === protocol.id
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1",
                        selectedMulticast === protocol.id ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-3.5 w-3.5",
                          selectedMulticast === protocol.id ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-medium text-sm text-foreground">
                            {protocol.name}
                          </span>
                          {selectedMulticast === protocol.id && (
                            <ChevronRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {protocol.description}
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
        {selectedMulticast === "igmp-proxy" ? (
          <IgmpProxyContent />
        ) : (
          <InProgress />
        )}
      </div>
    </div>
  );
}
