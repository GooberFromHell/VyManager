"use client";

import { useEffect, useState, useCallback } from "react";
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
  Pencil,
  Trash2,
  Globe,
  Server,
  Shield,
  Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { EmptyState } from "@/components/ui/empty-state";
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
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
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
      <div className="p-4">
        <EmptyState
          icon={Globe}
          title="DNS Forwarding Not Configured"
          description="No DNS forwarding configuration found on this device."
          action={!isReadOnly ? { label: "Configure DNS Forwarding", onClick: () => setEditOpen(true), icon: Settings2 } : undefined}
        />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="page-compact">
        <PageHeader
          title="DNS Forwarding"
          description="Configure DNS forwarding service"
          actions={
            <>
              {!isReadOnly && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </>
          }
        />

        {/* Global Settings + Upstream in compact grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border card-accent p-3">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Global Settings</h3>
            </div>
            <div className="space-y-0">
              <div className="kv-row">
                <span className="text-muted-foreground text-xs">Listen Addresses</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {config.listen_addresses.length > 0 ? (
                    config.listen_addresses.map((addr) => (
                      <Badge key={addr} variant="secondary" className="text-xs">{addr}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground italic text-xs">None</span>
                  )}
                </div>
              </div>
              <div className="kv-row">
                <span className="text-muted-foreground text-xs">Cache Size</span>
                <span className="text-xs font-mono">{config.cache_size}</span>
              </div>
              <div className="kv-row">
                <span className="text-muted-foreground text-xs">DNSSEC</span>
                <Badge variant="outline" className="text-xs">{config.dnssec || "off"}</Badge>
              </div>
              <div className="kv-row">
                <span className="text-muted-foreground text-xs">No Serve RFC1918</span>
                <Badge variant={config.no_serve_rfc1918 ? "default" : "secondary"} className="text-xs">
                  {config.no_serve_rfc1918 ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="kv-row">
                <span className="text-muted-foreground text-xs">System Nameservers</span>
                <Badge variant={config.use_system_nameservers ? "default" : "secondary"} className="text-xs">
                  {config.use_system_nameservers ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="kv-row">
                <span className="text-muted-foreground text-xs">Ignore Hosts File</span>
                <Badge variant={config.ignore_hosts_file ? "default" : "secondary"} className="text-xs">
                  {config.ignore_hosts_file ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border card-accent p-3">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Upstream Servers</h3>
              </div>
              <div className="space-y-1">
                {config.name_servers.length > 0 ? (
                  config.name_servers.map((server) => (
                    <div
                      key={server}
                      className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-muted/50"
                    >
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{server}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No upstream servers configured
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border card-accent p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Allow From Networks</h3>
              </div>
              <div className="flex flex-wrap gap-1">
                {config.allow_from.length > 0 ? (
                  config.allow_from.map((network) => (
                    <Badge key={network} variant="secondary" className="text-xs font-mono">{network}</Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No networks configured
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Domain Forwarding Rules */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold section-header">Domain Forwarding Rules</h3>
          {!isReadOnly && (
            <Button size="sm" onClick={() => setCreateDomainOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Domain
            </Button>
          )}
        </div>

        {config.domains.length > 0 ? (
          <div className="rounded-md border border-border overflow-hidden">
            <Table className="table-dense">
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Servers</TableHead>
                  <TableHead>ADDNTA</TableHead>
                  <TableHead>Recursion</TableHead>
                  {!isReadOnly && <TableHead className="w-[70px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.domains.map((domain) => (
                  <TableRow key={domain.name}>
                    <TableCell className="font-medium text-xs">{domain.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {domain.servers.map((server) => (
                          <Badge key={server.address} variant="secondary" className="text-xs font-mono">
                            {server.address}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={domain.addnta ? "default" : "secondary"} className="text-xs">
                        {domain.addnta ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={domain.recursion_desired ? "default" : "secondary"} className="text-xs">
                        {domain.recursion_desired ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDeleteDomain(domain)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-md border border-border p-3">
            <EmptyState
              icon={Globe}
              title="No domain forwarding rules configured"
              action={!isReadOnly ? { label: "Add Domain", onClick: () => setCreateDomainOpen(true), icon: Plus } : undefined}
              compact
            />
          </div>
        )}
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
