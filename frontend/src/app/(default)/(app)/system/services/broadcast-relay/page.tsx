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
import {
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  ArrowLeftRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { broadcastRelayService } from "@/lib/api/broadcast-relay";
import type {
  BroadcastRelayConfig,
  BroadcastRelayCapabilities,
  BroadcastRelayInstance,
} from "@/lib/api/types/broadcast-relay";
import { CreateBroadcastRelayModal } from "@/components/services/broadcast-relay/CreateBroadcastRelayModal";
import { EditBroadcastRelayModal } from "@/components/services/broadcast-relay/EditBroadcastRelayModal";
import { DeleteBroadcastRelayModal } from "@/components/services/broadcast-relay/DeleteBroadcastRelayModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export default function BroadcastRelayPage() {
  const { canWrite } = usePermissions();
  const [config, setConfig] = useState<BroadcastRelayConfig | null>(null);
  const [capabilities, setCapabilities] =
    useState<BroadcastRelayCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRelay, setSelectedRelay] =
    useState<BroadcastRelayInstance | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capData] = await Promise.all([
        broadcastRelayService.getConfig(),
        broadcastRelayService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load broadcast relay configuration"
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

  const handleSuccess = () => {
    loadData();
  };

  const handleEditClick = (relay: BroadcastRelayInstance) => {
    setSelectedRelay(relay);
    setEditOpen(true);
  };

  const handleDeleteClick = (relay: BroadcastRelayInstance) => {
    setSelectedRelay(relay);
    setDeleteOpen(true);
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
          title="Error Loading Broadcast Relay"
          message={error}
          onRetry={handleRefresh}
          className="max-w-md"
        />
      </div>
    );
  }

  const relays = config?.relays ?? [];
  const existingIds = relays.map((r) => r.id);
  const hasWriteAccess = canWrite(FeatureGroup.BROADCAST_RELAY);
  const colSpan = hasWriteAccess ? 7 : 6;

  return (
    <div className="page-compact">
      <PageHeader
        title="Broadcast Relay"
        description="Forward UDP broadcast packets between network interfaces"
        actions={
          <>
            {hasWriteAccess && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create New
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

      <div className="rounded-md border border-border overflow-hidden">
        <Table className="table-dense">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Interfaces</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Port</TableHead>
              <TableHead>Status</TableHead>
              {hasWriteAccess && (
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {relays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan}>
                  <EmptyState
                    icon={ArrowLeftRight}
                    title="No broadcast relay instances configured"
                    description="Create a relay to forward UDP broadcasts between interfaces"
                    action={hasWriteAccess ? { label: "Create Relay", onClick: () => setCreateOpen(true), icon: Plus } : undefined}
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : (
              relays.map((relay) => (
                <TableRow key={relay.id}>
                  <TableCell className="font-mono font-medium">
                    {relay.id}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {relay.description ?? (
                      <span className="italic">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {relay.interfaces.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {relay.interfaces.map((iface) => (
                          <Badge key={iface} variant="secondary" className="text-xs">
                            {iface}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {relay.address ?? (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {relay.port ?? (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {relay.disabled ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Disabled
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs bg-green-600/20 text-green-400 border-green-600/30">
                        Enabled
                      </Badge>
                    )}
                  </TableCell>
                  {hasWriteAccess && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEditClick(relay)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDeleteClick(relay)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateBroadcastRelayModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleSuccess}
        capabilities={capabilities}
        existingIds={existingIds}
      />

      <EditBroadcastRelayModal
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedRelay(null);
        }}
        onSuccess={handleSuccess}
        relay={selectedRelay}
        capabilities={capabilities}
      />

      <DeleteBroadcastRelayModal
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelectedRelay(null);
        }}
        onSuccess={handleSuccess}
        relay={selectedRelay}
      />
    </div>
  );
}
