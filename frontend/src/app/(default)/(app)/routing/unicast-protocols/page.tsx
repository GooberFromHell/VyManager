"use client";

import { InProgress } from "@/components/layout/InProgress";
import { BabelContent } from "@/components/babel/BabelContent";
import { BgpContent } from "@/components/bgp/BgpContent";
import { IsisContent } from "@/components/isis/IsisContent";
import { OspfContent } from "@/components/ospf/OspfContent";
import { Ospfv3Content } from "@/components/ospfv3/Ospfv3Content";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Network, ChevronRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type ProtocolType = "bgp" | "ospf" | "ospfv3" | "isis" | "openfabric" | "rip" | "ripng" | "babel";

const allProtocols = [
  { id: "bgp" as ProtocolType, name: "BGP", description: "Border Gateway Protocol", permission: FeatureGroup.BGP },
  { id: "ospf" as ProtocolType, name: "OSPF", description: "Open Shortest Path First", permission: FeatureGroup.OSPF },
  { id: "ospfv3" as ProtocolType, name: "OSPFv3", description: "OSPF for IPv6", permission: FeatureGroup.OSPFV3 },
  { id: "isis" as ProtocolType, name: "IS-IS", description: "Intermediate System to Intermediate System", permission: FeatureGroup.ISIS },
  { id: "openfabric" as ProtocolType, name: "OpenFabric", description: "OpenFabric Protocol", permission: FeatureGroup.OPENFABRIC },
  { id: "rip" as ProtocolType, name: "RIP", description: "Routing Information Protocol", permission: FeatureGroup.RIP },
  { id: "ripng" as ProtocolType, name: "RIPng", description: "RIP Next Generation", permission: FeatureGroup.RIPNG },
  { id: "babel" as ProtocolType, name: "Babel", description: "Babel Routing Protocol", permission: FeatureGroup.BABEL },
];

export default function UnicastProtocolsPage() {
  const { canRead, isLoading } = usePermissions();

  // Filter protocols based on user permissions
  const protocols = useMemo(() => {
    if (isLoading) return [];
    return allProtocols.filter(protocol => canRead(protocol.permission));
  }, [canRead, isLoading]);

  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType | null>(null);

  // Auto-select first available protocol
  useEffect(() => {
    if (protocols.length > 0 && !selectedProtocol) {
      setSelectedProtocol(protocols[0].id);
    }
  }, [protocols, selectedProtocol]);

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Protocol Selector */}
      <div className="w-56 border-r border-border bg-sidebar flex flex-col h-full">
        <div className="p-3">
          <div className="flex items-center gap-2.5">
            <Network className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-sm font-semibold text-foreground">Unicast Protocols</h2>
          </div>
        </div>

        <Separator />

        {/* Protocol List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-xs text-muted-foreground">Loading protocols...</p>
              </div>
            ) : protocols.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-xs text-muted-foreground">No accessible protocols</p>
              </div>
            ) : (
              protocols.map((protocol) => (
                <button
                  key={protocol.id}
                  onClick={() => setSelectedProtocol(protocol.id)}
                  className={cn(
                    "w-full text-left rounded-md px-3 py-2 transition-all",
                    selectedProtocol === protocol.id
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Network className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      selectedProtocol === protocol.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className="font-medium text-sm truncate flex-1">
                      {protocol.name}
                    </span>
                    {selectedProtocol === protocol.id && (
                      <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {selectedProtocol === "bgp" ? (
          <BgpContent />
        ) : selectedProtocol === "ospf" ? (
          <OspfContent />
        ) : selectedProtocol === "ospfv3" ? (
          <Ospfv3Content />
        ) : selectedProtocol === "babel" ? (
          <BabelContent />
        ) : selectedProtocol === "isis" ? (
          <IsisContent />
        ) : (
          <InProgress />
        )}
      </div>
    </div>
  );
}
