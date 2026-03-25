"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  RefreshCw,
  Trash2,
  Network,
  Server,
  Settings2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { dhcpv6ServerService } from "@/lib/api/dhcpv6-server";
import type {
  DHCPv6ServerConfig,
  DHCPv6ServerCapabilities,
  DHCPv6SharedNetwork,
} from "@/lib/api/types/dhcpv6-server";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateDHCPv6NetworkModal } from "@/components/services/dhcpv6-server/CreateDHCPv6NetworkModal";
import { DeleteDHCPv6NetworkModal } from "@/components/services/dhcpv6-server/DeleteDHCPv6NetworkModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export default function DHCPv6ServerPage() {
  const [config, setConfig] = useState<DHCPv6ServerConfig | null>(null);
  const [capabilities, setCapabilities] =
    useState<DHCPv6ServerCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [createNetworkOpen, setCreateNetworkOpen] = useState(false);
  const [deleteNetworkOpen, setDeleteNetworkOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] =
    useState<DHCPv6SharedNetwork | null>(null);

  // Collapsible network state
  const [expandedNetworks, setExpandedNetworks] = useState<Set<string>>(
    new Set()
  );

  const { canWrite } = usePermissions();
  const isReadOnly = !canWrite(FeatureGroup.DHCPV6_SERVER);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capabilitiesData] = await Promise.all([
        dhcpv6ServerService.getConfig(),
        dhcpv6ServerService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capabilitiesData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load DHCPv6 server configuration"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dhcpv6ServerService.refreshConfig();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh configuration"
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleSuccess = () => {
    loadData();
  };

  const handleDeleteNetwork = (network: DHCPv6SharedNetwork) => {
    setSelectedNetwork(network);
    setDeleteNetworkOpen(true);
  };

  const toggleNetwork = (name: string) => {
    setExpandedNetworks((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert
          message={error}
          onRetry={() => {
            setLoading(true);
            loadData();
          }}
          retryLabel="Retry"
        />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            DHCPv6 Server Not Configured
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            No DHCPv6 server configuration found on this device.
          </p>
          {!isReadOnly && (
            <Button onClick={() => setCreateNetworkOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Shared Network
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <PageHeader
          title="DHCPv6 Server"
          description="Configure DHCPv6 server shared networks and subnets"
          actions={
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          }
        />

        {/* Preference */}
        {config.preference !== undefined && config.preference !== null && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Global Settings</h3>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Preference</span>
                <Badge variant="secondary">{config.preference}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shared Networks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Shared Networks</h3>
            {!isReadOnly && (
              <Button onClick={() => setCreateNetworkOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Shared Network
              </Button>
            )}
          </div>

          {config.shared_networks.length > 0 ? (
            <div className="space-y-4">
              {config.shared_networks.map((network) => (
                <Card key={network.name}>
                  <CardContent className="pt-6">
                    {/* Network Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleNetwork(network.name)}
                      >
                        {expandedNetworks.has(network.name) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <Network className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{network.name}</h3>
                        <Badge variant="outline">
                          {network.subnets.length} subnet
                          {network.subnets.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNetwork(network)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {/* Subnets (expanded) */}
                    {expandedNetworks.has(network.name) && (
                      <div className="space-y-4 ml-7">
                        {network.subnets.length > 0 ? (
                          network.subnets.map((subnet) => (
                            <div
                              key={subnet.prefix}
                              className="rounded-lg border border-border p-4 space-y-3"
                            >
                              <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono font-medium text-sm">
                                  {subnet.prefix}
                                </span>
                              </div>

                              {/* Address Ranges */}
                              {(subnet.address_range_prefixes.length > 0 ||
                                subnet.address_range_start) && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    Address Ranges:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {subnet.address_range_prefixes.map(
                                      (prefix) => (
                                        <Badge
                                          key={prefix}
                                          variant="secondary"
                                        >
                                          {prefix}
                                        </Badge>
                                      )
                                    )}
                                    {subnet.address_range_start &&
                                      subnet.address_range_stop && (
                                        <Badge variant="secondary">
                                          {subnet.address_range_start} -{" "}
                                          {subnet.address_range_stop}
                                        </Badge>
                                      )}
                                  </div>
                                </div>
                              )}

                              {/* Name Servers */}
                              {subnet.name_servers.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    Name Servers:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {subnet.name_servers.map((ns) => (
                                      <Badge key={ns} variant="secondary">
                                        {ns}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Domain Search */}
                              {subnet.domain_search.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    Domain Search:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {subnet.domain_search.map((domain) => (
                                      <Badge key={domain} variant="secondary">
                                        {domain}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Lease Times */}
                              {(subnet.lease_time.default ||
                                subnet.lease_time.minimum ||
                                subnet.lease_time.maximum) && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    Lease Time:
                                  </span>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {subnet.lease_time.default && (
                                      <span>
                                        Default:{" "}
                                        <Badge variant="outline">
                                          {subnet.lease_time.default}s
                                        </Badge>
                                      </span>
                                    )}
                                    {subnet.lease_time.minimum && (
                                      <span>
                                        Min:{" "}
                                        <Badge variant="outline">
                                          {subnet.lease_time.minimum}s
                                        </Badge>
                                      </span>
                                    )}
                                    {subnet.lease_time.maximum && (
                                      <span>
                                        Max:{" "}
                                        <Badge variant="outline">
                                          {subnet.lease_time.maximum}s
                                        </Badge>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* SIP Servers */}
                              {subnet.sip_servers.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    SIP Servers:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {subnet.sip_servers.map((sip) => (
                                      <Badge key={sip} variant="secondary">
                                        {sip}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* SNTP Servers */}
                              {subnet.sntp_servers.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    SNTP Servers:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {subnet.sntp_servers.map((sntp) => (
                                      <Badge key={sntp} variant="secondary">
                                        {sntp}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Static Mappings */}
                              {subnet.static_mappings.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    Static Mappings:
                                  </span>
                                  <Table className="mt-2">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Identifier</TableHead>
                                        <TableHead>IPv6 Address</TableHead>
                                        <TableHead>IPv6 Prefix</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {subnet.static_mappings.map((mapping) => (
                                        <TableRow key={mapping.name}>
                                          <TableCell className="font-medium">
                                            {mapping.name}
                                          </TableCell>
                                          <TableCell className="font-mono">
                                            {mapping.identifier || (
                                              <span className="text-muted-foreground italic">
                                                None
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell className="font-mono">
                                            {mapping.ipv6_address || (
                                              <span className="text-muted-foreground italic">
                                                None
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell className="font-mono">
                                            {mapping.ipv6_prefix || (
                                              <span className="text-muted-foreground italic">
                                                None
                                              </span>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No subnets configured in this shared network
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Network className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No shared networks configured
                </p>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => setCreateNetworkOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shared Network
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateDHCPv6NetworkModal
        open={createNetworkOpen}
        onOpenChange={setCreateNetworkOpen}
        onSuccess={handleSuccess}
        capabilities={capabilities}
        existingNetworks={config?.shared_networks.map((n) => n.name) ?? []}
      />

      {selectedNetwork && (
        <DeleteDHCPv6NetworkModal
          open={deleteNetworkOpen}
          onOpenChange={setDeleteNetworkOpen}
          onSuccess={handleSuccess}
          networkName={selectedNetwork.name}
        />
      )}
    </ScrollArea>
  );
}
