"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex items-center justify-center h-96">
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Conntrack Sync"
        description="Connection tracking synchronization between cluster nodes"
        actions={
          <>
            {canWrite(FeatureGroup.CONNTRACK_SYNC) && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Settings
              </Button>
            )}
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
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
        <Card>
          <CardContent>
            <EmptyState
              icon={Network}
              title="Conntrack Sync is not configured"
              description="Configure Conntrack Sync to synchronize connection tracking state between high-availability cluster nodes."
              action={canWrite(FeatureGroup.CONNTRACK_SYNC) ? { label: "Configure Conntrack Sync", onClick: () => setEditOpen(true), icon: Pencil } : undefined}
            />
          </CardContent>
        </Card>
      )}

      {isConfigured && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Settings Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">General Settings</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    Accept Protocols
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(config?.accept_protocols || []).length > 0 ? (
                      config!.accept_protocols.map((proto) => (
                        <Badge
                          key={proto}
                          variant="secondary"
                          className="font-mono"
                        >
                          {proto}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">
                        All protocols
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Multicast Group</span>
                  <span className="font-mono">
                    {config?.mcast_group || (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Disable External Cache
                  </span>
                  <Badge
                    variant={
                      config?.disable_external_cache ? "destructive" : "default"
                    }
                  >
                    {config?.disable_external_cache ? "Disabled" : "Enabled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Failover Mechanism Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Failover Mechanism</h3>
              </div>
              {config?.failover_mechanism ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline" className="uppercase">
                      {config.failover_mechanism.type}
                    </Badge>
                  </div>
                  {config.failover_mechanism.sync_group && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sync Group</span>
                      <span className="font-mono">
                        {config.failover_mechanism.sync_group}
                      </span>
                    </div>
                  )}
                  {config.failover_mechanism.cluster_group && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Cluster Group
                      </span>
                      <span className="font-mono">
                        {config.failover_mechanism.cluster_group}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No failover mechanism configured
                </p>
              )}
            </CardContent>
          </Card>

          {/* Expect Sync Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Expect Sync</h3>
              </div>
              <div className="space-y-2 text-sm">
                <span className="text-muted-foreground">
                  Connection Tracking Helpers
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(config?.expect_sync || []).length > 0 ? (
                    config!.expect_sync.map((module) => (
                      <Badge
                        key={module}
                        variant="secondary"
                        className="font-mono"
                      >
                        {module}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground italic">
                      No modules configured
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Card — only shown when v1.5+ features have values */}
          {hasAdvancedValues && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Advanced</h3>
                </div>
                <div className="space-y-3 text-sm">
                  {(config?.listen_addresses || []).length > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        Listen Addresses
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {config!.listen_addresses.map((addr) => (
                          <Badge
                            key={addr}
                            variant="secondary"
                            className="font-mono"
                          >
                            {addr}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {config?.event_listen_queue_size && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Event Listen Queue Size
                      </span>
                      <span className="font-mono">
                        {config.event_listen_queue_size}
                      </span>
                    </div>
                  )}

                  {config?.sync_queue_size && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Sync Queue Size
                      </span>
                      <span className="font-mono">{config.sync_queue_size}</span>
                    </div>
                  )}

                  {config?.startup_resync !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Startup Resync
                      </span>
                      <Badge
                        variant={
                          config?.startup_resync ? "default" : "secondary"
                        }
                      >
                        {config?.startup_resync ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interfaces Card — full width */}
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Interfaces</h3>
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
                <Table>
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
                            <span className="text-muted-foreground italic">
                              Default
                            </span>
                          )}
                        </TableCell>
                        {canWrite(FeatureGroup.CONNTRACK_SYNC) && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
              ) : (
                <EmptyState
                  icon={Network}
                  title="No interfaces configured"
                  action={canWrite(FeatureGroup.CONNTRACK_SYNC) ? { label: "Add Interface", onClick: () => setAddInterfaceOpen(true), icon: Plus } : undefined}
                  compact
                />
              )}
            </CardContent>
          </Card>
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
