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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex items-center justify-center h-96">
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
    <div className="space-y-6 p-6">
      <PageHeader
        title="NTP"
        description="Network Time Protocol server configuration"
        actions={
          <>
            {canWrite(FeatureGroup.NTP) && (
              <Button variant="outline" onClick={() => setEditSettingsOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Settings
              </Button>
            )}
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold text-sm mb-3">Settings</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Listen Addresses:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {listenAddresses.length > 0
                  ? listenAddresses.map((addr) => <Badge key={addr} variant="secondary">{addr}</Badge>)
                  : <span className="text-muted-foreground italic">Not configured</span>}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Allowed Clients:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {allowClients.length > 0
                  ? allowClients.map((net) => <Badge key={net} variant="secondary">{net}</Badge>)
                  : <span className="text-muted-foreground italic">Not configured</span>}
              </div>
            </div>
            {config?.vrf && (
              <div>
                <span className="text-muted-foreground">VRF:</span>
                <span className="ml-2">{config.vrf}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">NTP Servers</h2>
        {canWrite(FeatureGroup.NTP) && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Server
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Server</TableHead>
              <TableHead>Pool</TableHead>
              <TableHead>Prefer</TableHead>
              <TableHead>Noselect</TableHead>
              {canWrite(FeatureGroup.NTP) && (
                <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                  <TableCell className="font-mono">{server.address}</TableCell>
                  <TableCell>{server.pool ? <Badge>Pool</Badge> : "—"}</TableCell>
                  <TableCell>{server.prefer ? <Badge variant="secondary">Prefer</Badge> : "—"}</TableCell>
                  <TableCell>{server.noselect ? <Badge variant="outline">Noselect</Badge> : "—"}</TableCell>
                  {canWrite(FeatureGroup.NTP) && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingServer(server.address)}
                      >
                        <Trash2 className="h-4 w-4" />
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
