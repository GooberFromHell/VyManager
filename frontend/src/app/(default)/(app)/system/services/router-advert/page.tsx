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
  Pencil,
  Trash2,
  Radio,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { EmptyState } from "@/components/ui/empty-state";
import { routerAdvertService } from "@/lib/api/router-advert";
import type {
  RouterAdvertConfig,
  RouterAdvertCapabilities,
  RouterAdvertInterface,
} from "@/lib/api/types/router-advert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AddRouterAdvertInterfaceModal } from "@/components/services/router-advert/AddRouterAdvertInterfaceModal";
import { EditRouterAdvertInterfaceModal } from "@/components/services/router-advert/EditRouterAdvertInterfaceModal";
import { DeleteRouterAdvertInterfaceModal } from "@/components/services/router-advert/DeleteRouterAdvertInterfaceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export default function RouterAdvertPage() {
  const [config, setConfig] = useState<RouterAdvertConfig | null>(null);
  const [capabilities, setCapabilities] =
    useState<RouterAdvertCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedInterface, setSelectedInterface] =
    useState<RouterAdvertInterface | null>(null);

  const { canWrite } = usePermissions();
  const isReadOnly = !canWrite(FeatureGroup.ROUTER_ADVERT);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capabilitiesData] = await Promise.all([
        routerAdvertService.getConfig(),
        routerAdvertService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capabilitiesData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load router advertisement configuration"
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
      await routerAdvertService.refreshConfig();
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

  const handleEditInterface = (iface: RouterAdvertInterface) => {
    setSelectedInterface(iface);
    setEditOpen(true);
  };

  const handleDeleteInterface = (iface: RouterAdvertInterface) => {
    setSelectedInterface(iface);
    setDeleteOpen(true);
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

  const interfaces = config?.interfaces ?? [];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <PageHeader
          title="Router Advertisement"
          description="Configure IPv6 router advertisement (radvd) on network interfaces"
          actions={
            <>
              {!isReadOnly && (
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Interface
                </Button>
              )}
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
            </>
          }
        />

        {/* Interfaces table */}
        {interfaces.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interface</TableHead>
                  <TableHead>Prefixes</TableHead>
                  <TableHead>Name Servers</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Preference</TableHead>
                  {!isReadOnly && (
                    <TableHead className="w-[100px]">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {interfaces.map((iface) => (
                  <TableRow key={iface.name}>
                    <TableCell className="font-medium">{iface.name}</TableCell>

                    <TableCell>
                      <Badge variant="secondary">
                        {iface.prefixes.length}{" "}
                        {iface.prefixes.length === 1 ? "prefix" : "prefixes"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {iface.name_servers.length > 0 ? (
                        <Badge variant="secondary">
                          {iface.name_servers.length}{" "}
                          {iface.name_servers.length === 1 ? "server" : "servers"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">
                          None
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {iface.managed_flag && (
                          <Badge variant="default">Managed</Badge>
                        )}
                        {iface.other_config_flag && (
                          <Badge variant="outline">Other Config</Badge>
                        )}
                        {!iface.managed_flag && !iface.other_config_flag && (
                          <span className="text-muted-foreground text-sm italic">
                            None
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary">
                        {iface.default_preference ?? "medium"}
                      </Badge>
                    </TableCell>

                    {!isReadOnly && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditInterface(iface)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteInterface(iface)}
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
            <CardContent>
              <EmptyState
                icon={Radio}
                title="Router Advertisement Not Configured"
                description="Router Advertisement is not configured on any interface"
                action={!isReadOnly ? { label: "Add Interface", onClick: () => setAddOpen(true), icon: Plus } : undefined}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <AddRouterAdvertInterfaceModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={handleSuccess}
        existingInterfaces={interfaces.map((i) => i.name)}
        capabilities={capabilities}
      />

      <EditRouterAdvertInterfaceModal
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={handleSuccess}
        interface={selectedInterface}
        capabilities={capabilities}
      />

      {selectedInterface && (
        <DeleteRouterAdvertInterfaceModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onSuccess={handleSuccess}
          interfaceName={selectedInterface.name}
        />
      )}
    </ScrollArea>
  );
}
