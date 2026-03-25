"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw, AlertCircle, Search, Cable, Pencil, Trash2, Network, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { ethernetService } from "@/lib/api/ethernet";
import { tunnelService } from "@/lib/api/tunnel";
import { vxlanService } from "@/lib/api/vxlan";
import type { EthernetInterface, EthernetCapabilities, VIFConfig } from "@/lib/api/types/ethernet";
import type { TunnelInterface, TunnelCapabilities } from "@/lib/api/types/tunnel";
import type { VxlanInterface, VxlanCapabilities } from "@/lib/api/types/vxlan";
import { ComprehensiveEthernetModal } from "@/components/network/ComprehensiveEthernetModal";
import { ComprehensiveVLANModal } from "@/components/network/ComprehensiveVLANModal";
import { DeleteEthernetModal } from "@/components/network/DeleteEthernetModal";
import { TunnelModal } from "@/components/network/TunnelModal";
import { VxlanModal } from "@/components/network/VxlanModal";
import { DeleteTunnelModal } from "@/components/network/DeleteTunnelModal";
import { DeleteVxlanModal } from "@/components/network/DeleteVxlanModal";

type InterfaceType = "all" | "ethernet" | "vlan";

// VLAN with parent interface info
interface VLANWithParent extends VIFConfig {
  parentInterface: string;
  fullName: string;
}

export default function InterfacesPage() {
  const [interfaces, setInterfaces] = useState<EthernetInterface[]>([]);
  const [capabilities, setCapabilities] = useState<EthernetCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<InterfaceType>("all");

  // Ethernet Modal states
  const [isCreateInterfaceModalOpen, setIsCreateInterfaceModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<EthernetInterface | null>(null);
  const [deletingInterface, setDeletingInterface] = useState<EthernetInterface | null>(null);

  // VLAN Modal states
  const [isCreateVLANModalOpen, setIsCreateVLANModalOpen] = useState(false);
  const [editingVLAN, setEditingVLAN] = useState<VLANWithParent | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<string>("ethernet");

  // Tunnel state
  const [tunnelInterfaces, setTunnelInterfaces] = useState<TunnelInterface[]>([]);
  const [tunnelCapabilities, setTunnelCapabilities] = useState<TunnelCapabilities | null>(null);
  const [tunnelLoading, setTunnelLoading] = useState(false);
  const [isCreateTunnelModalOpen, setIsCreateTunnelModalOpen] = useState(false);
  const [editingTunnel, setEditingTunnel] = useState<TunnelInterface | null>(null);
  const [deletingTunnel, setDeletingTunnel] = useState<TunnelInterface | null>(null);

  // VXLAN state
  const [vxlanInterfaces, setVxlanInterfaces] = useState<VxlanInterface[]>([]);
  const [vxlanCapabilities, setVxlanCapabilities] = useState<VxlanCapabilities | null>(null);
  const [vxlanLoading, setVxlanLoading] = useState(false);
  const [isCreateVxlanModalOpen, setIsCreateVxlanModalOpen] = useState(false);
  const [editingVxlan, setEditingVxlan] = useState<VxlanInterface | null>(null);
  const [deletingVxlan, setDeletingVxlan] = useState<VxlanInterface | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      setRefreshing(true);
      const [configData, capabilitiesData] = await Promise.all([
        ethernetService.getConfig(),
        ethernetService.getCapabilities(),
      ]);
      setInterfaces(configData.interfaces);
      setCapabilities(capabilitiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interface data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadTunnelData = async () => {
    setTunnelLoading(true);
    try {
      const [configRes, capsRes] = await Promise.all([
        tunnelService.getConfig(),
        tunnelService.getCapabilities(),
      ]);
      setTunnelInterfaces(configRes.interfaces || []);
      setTunnelCapabilities(capsRes);
    } catch (err) {
      console.error("Failed to load tunnel data", err);
    } finally {
      setTunnelLoading(false);
    }
  };

  const loadVxlanData = async () => {
    setVxlanLoading(true);
    try {
      const [configRes, capsRes] = await Promise.all([
        vxlanService.getConfig(),
        vxlanService.getCapabilities(),
      ]);
      setVxlanInterfaces(configRes.interfaces || []);
      setVxlanCapabilities(capsRes);
    } catch (err) {
      console.error("Failed to load vxlan data", err);
    } finally {
      setVxlanLoading(false);
    }
  };

  // Lazy-load tunnel/vxlan data when their tabs are first activated
  useEffect(() => {
    if (activeTab === "tunnel" && tunnelInterfaces.length === 0 && !tunnelLoading) {
      loadTunnelData();
    } else if (activeTab === "vxlan" && vxlanInterfaces.length === 0 && !vxlanLoading) {
      loadVxlanData();
    }
  }, [activeTab]);

  // Build list of all interface names for source-interface dropdowns
  const availableInterfaces = useMemo(() => {
    const names: string[] = [];
    interfaces.forEach((iface) => names.push(iface.name));
    tunnelInterfaces.forEach((iface) => names.push(iface.name));
    vxlanInterfaces.forEach((iface) => names.push(iface.name));
    return names.sort();
  }, [interfaces, tunnelInterfaces, vxlanInterfaces]);

  // Extract all VLANs from interfaces
  const allVlans: VLANWithParent[] = interfaces.flatMap((iface) => {
    const vlans: VLANWithParent[] = [];

    // Add VIFs (802.1q)
    if (iface.vif) {
      iface.vif.forEach((vif) => {
        vlans.push({
          ...vif,
          parentInterface: iface.name,
          fullName: `${iface.name}.${vif.vlan_id}`,
        });
      });
    }

    // Add VIF-S (QinQ) if needed in the future
    if (iface.vif_s) {
      iface.vif_s.forEach((vifs) => {
        vlans.push({
          ...vifs,
          parentInterface: iface.name,
          fullName: `${iface.name}.${vifs.vlan_id}`,
        });
      });
    }

    return vlans;
  });

  // Calculate statistics
  const totalInterfaces = interfaces.length;
  const totalVlans = allVlans.length;

  // Filter interfaces based on type
  const filteredInterfaces = interfaces.filter((iface) => {
    if (typeFilter === "vlan") return false; // Don't show interfaces when VLANs are selected

    const matchesType = typeFilter === "all" || iface.type === typeFilter;
    const matchesSearch =
      searchQuery === "" ||
      iface.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      iface.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      iface.vrf?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  });

  // Filter VLANs
  const filteredVlans = allVlans.filter((vlan) => {
    if (typeFilter !== "vlan" && typeFilter !== "all") return false; // Only show VLANs when selected or in "all" mode

    return (
      searchQuery === "" ||
      vlan.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vlan.parentInterface.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vlan.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vlan.addresses?.some((addr) => addr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      vlan.vrf?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Network Interfaces</h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor network interface configurations
            </p>
          </div>
        </div>

        {/* Interface Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="ethernet">Ethernet</TabsTrigger>
            <TabsTrigger value="tunnel">Tunnel</TabsTrigger>
            <TabsTrigger value="vxlan">VXLAN</TabsTrigger>
          </TabsList>

          {/* ===== Ethernet Tab ===== */}
          <TabsContent value="ethernet">
            <div className="space-y-6 mt-4">
              {/* Stats Dashboard */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-border">
                  <CardContent className="px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Network className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{totalInterfaces}</p>
                        <p className="text-xs text-muted-foreground">Total Interfaces</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Cable className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{totalInterfaces}</p>
                        <p className="text-xs text-muted-foreground">Ethernet</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                        <Network className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{totalVlans}</p>
                        <p className="text-xs text-muted-foreground">VLANs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive">Failed to load interfaces</h3>
                    <p className="text-sm text-destructive/90 mt-1">{error}</p>
                    <Button variant="outline" size="sm" onClick={loadData} className="mt-3">
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Filters and Actions */}
              {!error && (
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, description, IP address, or VRF..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={typeFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter("all")}
                    >
                      All ({totalInterfaces + totalVlans})
                    </Button>
                    <Button
                      variant={typeFilter === "ethernet" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter("ethernet")}
                    >
                      Ethernet ({totalInterfaces})
                    </Button>
                    <Button
                      variant={typeFilter === "vlan" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter("vlan")}
                    >
                      VLAN ({totalVlans})
                    </Button>
                  </div>

                  <Button
                    onClick={() => {
                      if (typeFilter === "vlan") {
                        setIsCreateVLANModalOpen(true);
                      } else {
                        setIsCreateInterfaceModalOpen(true);
                      }
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create {typeFilter === "vlan" ? "VLAN" : "Interface"}
                  </Button>
                </div>
              )}

              {/* Interface Cards */}
              {!error && (
                <div className="space-y-4 mt-6">
                  {/* Ethernet Interfaces */}
                  {(typeFilter === "all" || typeFilter === "ethernet") && filteredInterfaces.length > 0 && (
                    <div className="space-y-3">
                      {typeFilter === "all" && (
                        <h2 className="text-lg font-semibold text-foreground">Ethernet Interfaces</h2>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredInterfaces.map((iface) => {
                          const vlanCount = (iface.vif?.length || 0) + (iface.vif_s?.length || 0);
                          return (
                            <Card key={iface.name} className="border-border hover:border-primary/50 transition-colors group">
                              <CardContent className="px-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                                      <Cable className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div>
                                      <code className="font-semibold font-mono text-foreground text-base">
                                        {iface.name}
                                      </code>
                                      {vlanCount > 0 && (
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                          {vlanCount} VLAN(s)
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingInterface(iface)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeletingInterface(iface)}
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                  {iface.description && (
                                    <div className="text-muted-foreground truncate">
                                      {iface.description}
                                    </div>
                                  )}

                                  {iface.addresses && iface.addresses.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {iface.addresses.slice(0, 2).map((addr, idx) => (
                                        <code
                                          key={idx}
                                          className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                        >
                                          {addr}
                                        </code>
                                      ))}
                                      {iface.addresses.length > 2 && (
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                          +{iface.addresses.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {iface.vrf && (
                                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                        VRF: {iface.vrf}
                                      </Badge>
                                    )}
                                    {iface.hw_id && (
                                      <code className="text-xs font-mono text-muted-foreground">
                                        {iface.hw_id}
                                      </code>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* VLANs */}
                  {(typeFilter === "all" || typeFilter === "vlan") && filteredVlans.length > 0 && (
                    <div className="space-y-3">
                      {typeFilter === "all" && (
                        <h2 className="text-lg font-semibold text-foreground">VLANs</h2>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredVlans.map((vlan) => (
                          <Card key={vlan.fullName} className="border-border hover:border-primary/50 transition-colors group">
                            <CardContent className="px-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                                    <Network className="h-4 w-4 text-purple-500" />
                                  </div>
                                  <div>
                                    <code className="font-semibold font-mono text-foreground text-base">
                                      {vlan.fullName}
                                    </code>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      Parent: {vlan.parentInterface}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingVLAN(vlan)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // TODO: Implement VLAN delete
                                    }}
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                {vlan.description && (
                                  <div className="text-muted-foreground truncate">
                                    {vlan.description}
                                  </div>
                                )}

                                {vlan.addresses && vlan.addresses.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {vlan.addresses.slice(0, 2).map((addr, idx) => (
                                      <code
                                        key={idx}
                                        className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                      >
                                        {addr}
                                      </code>
                                    ))}
                                    {vlan.addresses.length > 2 && (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                        +{vlan.addresses.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-1">
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs"
                                  >
                                    VLAN {vlan.vlan_id}
                                  </Badge>
                                  {vlan.vrf && (
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                      VRF: {vlan.vrf}
                                    </Badge>
                                  )}
                                  {vlan.disable ? (
                                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                      Disabled
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                      Enabled
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {filteredInterfaces.length === 0 && filteredVlans.length === 0 && (
                    <Card className="border-border">
                      <CardContent className="py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Network className="h-12 w-12 text-muted-foreground/30" />
                          <p className="text-muted-foreground">
                            {searchQuery
                              ? "No interfaces or VLANs found matching your search"
                              : typeFilter === "vlan"
                                ? "No VLANs configured"
                                : "No interfaces configured"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Count */}
                  {(filteredInterfaces.length > 0 || filteredVlans.length > 0) && (
                    <p className="text-sm text-muted-foreground text-center">
                      Showing {filteredInterfaces.length + filteredVlans.length} of {totalInterfaces + totalVlans} item{totalInterfaces + totalVlans !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== Tunnel Tab ===== */}
          <TabsContent value="tunnel">
            <div className="space-y-6 mt-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Tunnel Interfaces</h2>
                <Button onClick={() => setIsCreateTunnelModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tunnel
                </Button>
              </div>

              {/* Loading */}
              {tunnelLoading && (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Tunnel Cards */}
              {!tunnelLoading && tunnelInterfaces.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tunnelInterfaces.map((tun) => (
                    <Card key={tun.name} className="border-border hover:border-primary/50 transition-colors group">
                      <CardContent className="px-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
                              <Network className="h-4 w-4 text-orange-500" />
                            </div>
                            <div>
                              <code className="font-semibold font-mono text-foreground text-base">
                                {tun.name}
                              </code>
                              {tun.encapsulation && (
                                <div className="mt-0.5">
                                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
                                    {tun.encapsulation.toUpperCase()}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTunnel(tun)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingTunnel(tun)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {tun.description && (
                            <div className="text-muted-foreground truncate">
                              {tun.description}
                            </div>
                          )}

                          {tun.source_address && (
                            <div className="text-xs text-muted-foreground">
                              Source: <code className="font-mono">{tun.source_address}</code>
                            </div>
                          )}

                          {tun.remote && (
                            <div className="text-xs text-muted-foreground">
                              Remote: <code className="font-mono">{tun.remote}</code>
                            </div>
                          )}

                          {tun.addresses && tun.addresses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {tun.addresses.slice(0, 2).map((addr, idx) => (
                                <code
                                  key={idx}
                                  className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                >
                                  {addr}
                                </code>
                              ))}
                              {tun.addresses.length > 2 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  +{tun.addresses.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            {tun.vrf && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                VRF: {tun.vrf}
                              </Badge>
                            )}
                            {tun.disable && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!tunnelLoading && tunnelInterfaces.length === 0 && (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Network className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">No tunnel interfaces configured</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ===== VXLAN Tab ===== */}
          <TabsContent value="vxlan">
            <div className="space-y-6 mt-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">VXLAN Interfaces</h2>
                <Button onClick={() => setIsCreateVxlanModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create VXLAN
                </Button>
              </div>

              {/* Loading */}
              {vxlanLoading && (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* VXLAN Cards */}
              {!vxlanLoading && vxlanInterfaces.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vxlanInterfaces.map((vx) => (
                    <Card key={vx.name} className="border-border hover:border-primary/50 transition-colors group">
                      <CardContent className="px-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                              <Network className="h-4 w-4 text-cyan-500" />
                            </div>
                            <div>
                              <code className="font-semibold font-mono text-foreground text-base">
                                {vx.name}
                              </code>
                              {vx.vni && (
                                <div className="mt-0.5">
                                  <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20 text-xs">
                                    VNI {vx.vni}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingVxlan(vx)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingVxlan(vx)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {vx.description && (
                            <div className="text-muted-foreground truncate">
                              {vx.description}
                            </div>
                          )}

                          {vx.source_address && (
                            <div className="text-xs text-muted-foreground">
                              Source: <code className="font-mono">{vx.source_address}</code>
                            </div>
                          )}

                          {vx.remote && vx.remote.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Remote: <code className="font-mono">{vx.remote.join(", ")}</code>
                            </div>
                          )}

                          {vx.group && (
                            <div className="text-xs text-muted-foreground">
                              Group: <code className="font-mono">{vx.group}</code>
                            </div>
                          )}

                          {vx.addresses && vx.addresses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {vx.addresses.slice(0, 2).map((addr, idx) => (
                                <code
                                  key={idx}
                                  className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                >
                                  {addr}
                                </code>
                              ))}
                              {vx.addresses.length > 2 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  +{vx.addresses.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            {vx.vrf && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                VRF: {vx.vrf}
                              </Badge>
                            )}
                            {vx.port && (
                              <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-xs">
                                Port {vx.port}
                              </Badge>
                            )}
                            {vx.disable && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!vxlanLoading && vxlanInterfaces.length === 0 && (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Network className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">No VXLAN interfaces configured</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Ethernet Modals */}
      <ComprehensiveEthernetModal
        open={isCreateInterfaceModalOpen}
        onOpenChange={setIsCreateInterfaceModalOpen}
        mode="create"
        capabilities={capabilities}
        onSuccess={loadData}
      />

      {editingInterface && (
        <ComprehensiveEthernetModal
          open={!!editingInterface}
          onOpenChange={(open) => !open && setEditingInterface(null)}
          mode="edit"
          interface={editingInterface}
          capabilities={capabilities}
          onSuccess={() => {
            setEditingInterface(null);
            loadData();
          }}
        />
      )}

      {deletingInterface && (
        <DeleteEthernetModal
          open={!!deletingInterface}
          onOpenChange={(open) => !open && setDeletingInterface(null)}
          interface={deletingInterface}
          onSuccess={() => {
            setDeletingInterface(null);
            loadData();
          }}
        />
      )}

      {/* VLAN Modals */}
      <ComprehensiveVLANModal
        open={isCreateVLANModalOpen}
        onOpenChange={setIsCreateVLANModalOpen}
        mode="create"
        interfaces={interfaces}
        capabilities={capabilities}
        onSuccess={loadData}
      />

      {editingVLAN && (
        <ComprehensiveVLANModal
          open={!!editingVLAN}
          onOpenChange={(open) => !open && setEditingVLAN(null)}
          mode="edit"
          vlan={editingVLAN}
          interfaces={interfaces}
          capabilities={capabilities}
          onSuccess={() => {
            setEditingVLAN(null);
            loadData();
          }}
        />
      )}

      {/* Tunnel Modals */}
      <TunnelModal
        open={isCreateTunnelModalOpen}
        onOpenChange={setIsCreateTunnelModalOpen}
        capabilities={tunnelCapabilities}
        onSuccess={loadTunnelData}
        mode="create"
        availableInterfaces={availableInterfaces}
      />
      {editingTunnel && (
        <TunnelModal
          open={!!editingTunnel}
          onOpenChange={(open) => !open && setEditingTunnel(null)}
          tunnel={editingTunnel}
          capabilities={tunnelCapabilities}
          onSuccess={loadTunnelData}
          mode="edit"
          availableInterfaces={availableInterfaces}
        />
      )}
      {deletingTunnel && (
        <DeleteTunnelModal
          open={!!deletingTunnel}
          onOpenChange={(open) => !open && setDeletingTunnel(null)}
          tunnel={deletingTunnel}
          onSuccess={loadTunnelData}
        />
      )}

      {/* VXLAN Modals */}
      <VxlanModal
        open={isCreateVxlanModalOpen}
        onOpenChange={setIsCreateVxlanModalOpen}
        capabilities={vxlanCapabilities}
        onSuccess={loadVxlanData}
        mode="create"
        availableInterfaces={availableInterfaces}
      />
      {editingVxlan && (
        <VxlanModal
          open={!!editingVxlan}
          onOpenChange={(open) => !open && setEditingVxlan(null)}
          vxlan={editingVxlan}
          capabilities={vxlanCapabilities}
          onSuccess={loadVxlanData}
          mode="edit"
          availableInterfaces={availableInterfaces}
        />
      )}
      {deletingVxlan && (
        <DeleteVxlanModal
          open={!!deletingVxlan}
          onOpenChange={(open) => !open && setDeletingVxlan(null)}
          vxlan={deletingVxlan}
          onSuccess={loadVxlanData}
        />
      )}
    </>
  );
}
