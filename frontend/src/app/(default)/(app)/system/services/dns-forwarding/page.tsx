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
  AlertCircle,
  Pencil,
  Trash2,
  Globe,
  Server,
  Shield,
  Settings2,
} from "lucide-react";
import { dnsForwardingService } from "@/lib/api/dns-forwarding";
import type {
  DNSForwardingConfig,
  DNSForwardingCapabilities,
  DNSDomain,
} from "@/lib/api/types/dns-forwarding";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EditDNSForwardingModal } from "@/components/services/dns-forwarding/EditDNSForwardingModal";
import { CreateDNSForwardingDomainModal } from "@/components/services/dns-forwarding/CreateDNSForwardingDomainModal";
import { DeleteDNSForwardingDomainModal } from "@/components/services/dns-forwarding/DeleteDNSForwardingDomainModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export default function DNSForwardingPage() {
  const [config, setConfig] = useState<DNSForwardingConfig | null>(null);
  const [capabilities, setCapabilities] =
    useState<DNSForwardingCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [createDomainOpen, setCreateDomainOpen] = useState(false);
  const [deleteDomainOpen, setDeleteDomainOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<DNSDomain | null>(null);

  const { canWrite } = usePermissions();
  const isReadOnly = !canWrite(FeatureGroup.DNS_FORWARDING);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capabilitiesData] = await Promise.all([
        dnsForwardingService.getConfig(),
        dnsForwardingService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capabilitiesData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load DNS forwarding configuration"
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
      await dnsForwardingService.refreshConfig();
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

  const handleDeleteDomain = (domain: DNSDomain) => {
    setSelectedDomain(domain);
    setDeleteDomainOpen(true);
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setLoading(true);
              loadData();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">DNS Forwarding Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No DNS forwarding configuration found on this device.
          </p>
          {!isReadOnly && (
            <Button onClick={() => setEditOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Configure DNS Forwarding
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">DNS Forwarding</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure DNS forwarding service
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Global Settings & Upstream Servers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Global Settings</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Listen Addresses</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {config.listen_addresses.length > 0 ? (
                      config.listen_addresses.map((addr) => (
                        <Badge key={addr} variant="secondary">
                          {addr}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">None</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cache Size</span>
                  <span>{config.cache_size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">DNSSEC</span>
                  <Badge variant="outline">{config.dnssec || "off"}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">No Serve RFC1918</span>
                  <Badge variant={config.no_serve_rfc1918 ? "default" : "secondary"}>
                    {config.no_serve_rfc1918 ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">System Nameservers</span>
                  <Badge
                    variant={config.use_system_nameservers ? "default" : "secondary"}
                  >
                    {config.use_system_nameservers ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ignore Hosts File</span>
                  <Badge variant={config.ignore_hosts_file ? "default" : "secondary"}>
                    {config.ignore_hosts_file ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Server className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Upstream Servers</h3>
              </div>
              <div className="space-y-2">
                {config.name_servers.length > 0 ? (
                  config.name_servers.map((server) => (
                    <div
                      key={server}
                      className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-md bg-muted/50"
                    >
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{server}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No upstream servers configured
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Allow From Networks */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Allow From Networks</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.allow_from.length > 0 ? (
                config.allow_from.map((network) => (
                  <Badge key={network} variant="secondary">
                    {network}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No networks configured
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Domain Forwarding Rules */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Domain Forwarding Rules</h3>
            {!isReadOnly && (
              <Button onClick={() => setCreateDomainOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            )}
          </div>

          {config.domains.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Servers</TableHead>
                    <TableHead>ADDNTA</TableHead>
                    <TableHead>Recursion</TableHead>
                    {!isReadOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.domains.map((domain) => (
                    <TableRow key={domain.name}>
                      <TableCell className="font-medium">{domain.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {domain.servers.map((server) => (
                            <Badge key={server.address} variant="secondary">
                              {server.address}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={domain.addnta ? "default" : "secondary"}>
                          {domain.addnta ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            domain.recursion_desired ? "default" : "secondary"
                          }
                        >
                          {domain.recursion_desired ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDomain(domain)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No domain forwarding rules configured
                </p>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => setCreateDomainOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Domain
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      {config && (
        <EditDNSForwardingModal
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={handleSuccess}
          config={config}
          capabilities={capabilities}
        />
      )}

      <CreateDNSForwardingDomainModal
        open={createDomainOpen}
        onOpenChange={setCreateDomainOpen}
        onSuccess={handleSuccess}
        capabilities={capabilities}
        existingDomains={config?.domains.map((d) => d.name) ?? []}
      />

      {selectedDomain && (
        <DeleteDNSForwardingDomainModal
          open={deleteDomainOpen}
          onOpenChange={setDeleteDomainOpen}
          onSuccess={handleSuccess}
          domainName={selectedDomain.name}
        />
      )}
    </ScrollArea>
  );
}
