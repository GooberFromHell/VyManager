"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Pencil,
  Network,
  Shield,
  Activity,
  Plus,
  Trash2,
  Loader2,
  Settings,
  Cpu,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { EmptyState } from "@/components/ui/empty-state";
import { conntrackSyncService } from "@/lib/api/conntrack-sync";
import type {
  ConntrackSyncConfig,
  ConntrackSyncCapabilities,
} from "@/lib/api/types/conntrack-sync";
import { EditConntrackSyncModal } from "@/components/services/conntrack-sync/EditConntrackSyncModal";
import { AddConntrackSyncInterfaceModal } from "@/components/services/conntrack-sync/AddConntrackSyncInterfaceModal";
import { DeleteConntrackSyncInterfaceModal } from "@/components/services/conntrack-sync/DeleteConntrackSyncInterfaceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export default function ConntrackSyncPage() {
  const { canWrite } = usePermissions();
  const [config, setConfig] = useState<ConntrackSyncConfig | null>(null);
  const [capabilities, setCapabilities] =
    useState<ConntrackSyncCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [addInterfaceOpen, setAddInterfaceOpen] = useState(false);
  const [deleteInterfaceOpen, setDeleteInterfaceOpen] = useState(false);
  const [selectedInterface, setSelectedInterface] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capData] = await Promise.all([
        conntrackSyncService.getConfig(),
        conntrackSyncService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Conntrack Sync configuration"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
  };

  const handleDeleteInterface = (name: string) => {
    setSelectedInterface(name);
    setDeleteInterfaceOpen(true);
  };

  const isConfigured =
    config &&
    (config.interfaces.length > 0 ||
      config.accept_protocols.length > 0 ||
      config.failover_mechanism !== null ||
      config.mcast_group !== null);

  const hasAdvancedValues =
    config &&
    (config.listen_addresses.length > 0 ||
      config.event_listen_queue_size !== null ||
      config.sync_queue_size !== null ||
      config.startup_resync !== null);

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex items-center justify-center h-48">
        <ErrorAlert
          title="Error Loading Conntrack Sync"
          message={error}
          onRetry={handleRefresh}
          className="max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="page-compact">
      {/* Header */}
      <PageHeader
        title="Conntrack Sync"
        description="Connection tracking synchronization between cluster nodes"
        actions={
          <>
            {canWrite(FeatureGroup.CONNTRACK_SYNC) && (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Settings
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </>
        }
      />

      {/* Empty state */}
      {!isConfigured && (
        <div className="rounded-lg border border-border card-accent p-3">
          <EmptyState
            icon={Network}
            title="Conntrack Sync is not configured"
            description="Configure Conntrack Sync to synchronize connection tracking state between high-availability cluster nodes."
            action={canWrite(FeatureGroup.CONNTRACK_SYNC) ? { label: "Configure Conntrack Sync", onClick: () => setEditOpen(true), icon: Pencil } : undefined}
          />
        </div>
      )}

      {isConfigured && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* General Settings Card */}
          <div className="rounded-lg border border-border card-accent p-3">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">General Settings</h3>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">
                  Accept Protocols
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(config?.accept_protocols || []).length > 0 ? (
                    config!.accept_protocols.map((proto) => (
                      <Badge
                        key={proto}
                        variant="secondary"
                        className="text-xs font-mono"
                      >
                        {proto}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      All protocols
                    </span>
                  )}
                </div>
              </div>

              <div className="kv-row">
                <span className="text-xs text-muted-foreground">Multicast Group</span>
                <span className="text-xs font-mono">
                  {config?.mcast_group || (
                    <span className="text-muted-foreground italic">—</span>
                  )}
                </span>
              </div>

              <div className="kv-row">
                <span className="text-xs text-muted-foreground">
                  Disable External Cache
                </span>
                <Badge
                  className="text-xs"
                  variant={
                    config?.disable_external_cache ? "destructive" : "default"
                  }
                >
                  {config?.disable_external_cache ? "Disabled" : "Enabled"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Failover Mechanism Card */}
          <div className="rounded-lg border border-border card-accent p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Failover Mechanism</h3>
            </div>
            {config?.failover_mechanism ? (
              <div className="space-y-1">
                <div className="kv-row">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <Badge variant="outline" className="text-xs uppercase">
                    {config.failover_mechanism.type}
                  </Badge>
                </div>
                {config.failover_mechanism.sync_group && (
                  <div className="kv-row">
                    <span className="text-xs text-muted-foreground">Sync Group</span>
                    <span className="text-xs font-mono">
                      {config.failover_mechanism.sync_group}
                    </span>
                  </div>
                )}
                {config.failover_mechanism.cluster_group && (
                  <div className="kv-row">
                    <span className="text-xs text-muted-foreground">
                      Cluster Group
                    </span>
                    <span className="text-xs font-mono">
                      {config.failover_mechanism.cluster_group}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No failover mechanism configured
              </p>
            )}
          </div>

          {/* Expect Sync Card */}
          <div className="rounded-lg border border-border card-accent p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Expect Sync</h3>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Connection Tracking Helpers
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {(config?.expect_sync || []).length > 0 ? (
                  config!.expect_sync.map((module) => (
                    <Badge
                      key={module}
                      variant="secondary"
                      className="text-xs font-mono"
                    >
                      {module}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    No modules configured
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Card — only shown when v1.5+ features have values */}
          {hasAdvancedValues && (
            <div className="rounded-lg border border-border card-accent p-3">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Advanced</h3>
              </div>
              <div className="space-y-2">
                {(config?.listen_addresses || []).length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Listen Addresses
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {config!.listen_addresses.map((addr) => (
                        <Badge
                          key={addr}
                          variant="secondary"
                          className="text-xs font-mono"
                        >
                          {addr}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {config?.event_listen_queue_size && (
                  <div className="kv-row">
                    <span className="text-xs text-muted-foreground">
                      Event Listen Queue Size
                    </span>
                    <span className="text-xs font-mono">
                      {config.event_listen_queue_size}
                    </span>
                  </div>
                )}

                {config?.sync_queue_size && (
                  <div className="kv-row">
                    <span className="text-xs text-muted-foreground">
                      Sync Queue Size
                    </span>
                    <span className="text-xs font-mono">{config.sync_queue_size}</span>
                  </div>
                )}

                {config?.startup_resync !== null && (
                  <div className="kv-row">
                    <span className="text-xs text-muted-foreground">
                      Startup Resync
                    </span>
                    <Badge
                      className="text-xs"
                      variant={
                        config?.startup_resync ? "default" : "secondary"
                      }
                    >
                      {config?.startup_resync ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interfaces Card — full width */}
          <div className="rounded-lg border border-border card-accent p-3 md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Interfaces</h3>
              </div>
              {canWrite(FeatureGroup.CONNTRACK_SYNC) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddInterfaceOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Interface
                </Button>
              )}
            </div>

            {(config?.interfaces || []).length > 0 ? (
              <div className="rounded-md border border-border overflow-hidden">
                <Table className="table-dense">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Interface</TableHead>
                      <TableHead>Port</TableHead>
                      {canWrite(FeatureGroup.CONNTRACK_SYNC) && (
                        <TableHead className="w-16" />
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config!.interfaces.map((iface) => (
                      <TableRow key={iface.name}>
                        <TableCell className="font-mono">
                          {iface.name}
                        </TableCell>
                        <TableCell className="font-mono">
                          {iface.port || (
                            <span className="text-muted-foreground italic text-xs">
                              Default
                            </span>
                          )}
                        </TableCell>
                        {canWrite(FeatureGroup.CONNTRACK_SYNC) && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                handleDeleteInterface(iface.name)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={Network}
                title="No interfaces configured"
                action={canWrite(FeatureGroup.CONNTRACK_SYNC) ? { label: "Add Interface", onClick: () => setAddInterfaceOpen(true), icon: Plus } : undefined}
                compact
              />
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {config && (
        <EditConntrackSyncModal
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={loadData}
          config={config}
          capabilities={capabilities}
        />
      )}

      <AddConntrackSyncInterfaceModal
        open={addInterfaceOpen}
        onOpenChange={setAddInterfaceOpen}
        onSuccess={loadData}
        existingInterfaces={(config?.interfaces || []).map((i) => i.name)}
      />

      {selectedInterface && (
        <DeleteConntrackSyncInterfaceModal
          open={deleteInterfaceOpen}
          onOpenChange={setDeleteInterfaceOpen}
          onSuccess={loadData}
          interfaceName={selectedInterface}
        />
      )}
    </div>
  );
}
