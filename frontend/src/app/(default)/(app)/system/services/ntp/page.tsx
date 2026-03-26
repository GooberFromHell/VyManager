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
import { Plus, RefreshCw, Pencil, Trash2, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ntpService } from "@/lib/api/ntp";
import type { NTPConfig, NTPCapabilities, NTPServer } from "@/lib/api/types/ntp";
import { CreateNTPServerModal } from "@/components/services/ntp/CreateNTPServerModal";
import { EditNTPSettingsModal } from "@/components/services/ntp/EditNTPSettingsModal";
import { DeleteNTPServerModal } from "@/components/services/ntp/DeleteNTPServerModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { Loader2 } from "lucide-react";

export default function NTPPage() {
  const { canWrite } = usePermissions();
  const [config, setConfig] = useState<NTPConfig | null>(null);
  const [capabilities, setCapabilities] = useState<NTPCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [deletingServer, setDeletingServer] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capData] = await Promise.all([
        ntpService.getConfig(),
        ntpService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NTP configuration");
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
          title="Error Loading NTP"
          message={error}
          onRetry={handleRefresh}
          className="max-w-md"
        />
      </div>
    );
  }

  const servers = config?.servers || [];
  const listenAddresses = config?.listen_addresses || [];
  const allowClients = config?.allow_clients || [];

  return (
    <div className="page-compact">
      <PageHeader
        title="NTP"
        description="Network Time Protocol server configuration"
        actions={
          <>
            {canWrite(FeatureGroup.NTP) && (
              <Button variant="outline" size="sm" onClick={() => setEditSettingsOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Settings
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </>
        }
      />

      {/* Settings — compact inline */}
      <div className="rounded-lg border border-border card-accent p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Listen Addresses</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {listenAddresses.length > 0
                ? listenAddresses.map((addr) => <Badge key={addr} variant="secondary" className="text-xs">{addr}</Badge>)
                : <span className="text-muted-foreground italic text-xs">Not configured</span>}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Allowed Clients</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {allowClients.length > 0
                ? allowClients.map((net) => <Badge key={net} variant="secondary" className="text-xs">{net}</Badge>)
                : <span className="text-muted-foreground italic text-xs">Not configured</span>}
            </div>
          </div>
          {config?.vrf && (
            <div>
              <span className="text-muted-foreground text-xs">VRF</span>
              <span className="ml-2 text-xs font-mono">{config.vrf}</span>
            </div>
          )}
        </div>
      </div>

      {/* NTP Servers table */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold section-header">NTP Servers</h2>
        {canWrite(FeatureGroup.NTP) && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Server
          </Button>
        )}
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <Table className="table-dense">
          <TableHeader>
            <TableRow>
              <TableHead>Server</TableHead>
              <TableHead>Pool</TableHead>
              <TableHead>Prefer</TableHead>
              <TableHead>Noselect</TableHead>
              {canWrite(FeatureGroup.NTP) && (
                <TableHead className="w-[70px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {servers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canWrite(FeatureGroup.NTP) ? 5 : 4}>
                  <EmptyState
                    icon={Clock}
                    title="No NTP servers configured"
                    description="Add an NTP server to synchronize time"
                    action={canWrite(FeatureGroup.NTP) ? { label: "Add Server", onClick: () => setCreateOpen(true), icon: Plus } : undefined}
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : (
              servers.map((server) => (
                <TableRow key={server.address}>
                  <TableCell className="font-mono text-xs">{server.address}</TableCell>
                  <TableCell>{server.pool ? <Badge className="text-xs">Pool</Badge> : "—"}</TableCell>
                  <TableCell>{server.prefer ? <Badge variant="secondary" className="text-xs">Prefer</Badge> : "—"}</TableCell>
                  <TableCell>{server.noselect ? <Badge variant="outline" className="text-xs">Noselect</Badge> : "—"}</TableCell>
                  {canWrite(FeatureGroup.NTP) && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setDeletingServer(server.address)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateNTPServerModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={loadData}
        capabilities={capabilities}
        existingServers={servers.map((s) => s.address)}
      />
      {config && (
        <EditNTPSettingsModal
          open={editSettingsOpen}
          onOpenChange={setEditSettingsOpen}
          onSuccess={loadData}
          config={config}
          capabilities={capabilities}
        />
      )}
      <DeleteNTPServerModal
        open={!!deletingServer}
        onOpenChange={(open) => !open && setDeletingServer(null)}
        onSuccess={loadData}
        serverAddress={deletingServer || ""}
      />
    </div>
  );
}
