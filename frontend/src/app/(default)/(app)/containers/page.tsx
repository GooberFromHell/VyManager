"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Box,
  Network,
  Database,
} from "lucide-react";
import { containerService } from "@/lib/api/container";
import type {
  ContainerConfig,
  ContainerCapabilities,
  ContainerEntry,
  ContainerNetwork,
  ContainerRegistry,
} from "@/lib/api/types/container";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateContainerModal } from "@/components/containers/CreateContainerModal";
import { EditContainerModal } from "@/components/containers/EditContainerModal";
import { DeleteContainerModal } from "@/components/containers/DeleteContainerModal";
import { CreateContainerNetworkModal } from "@/components/containers/CreateContainerNetworkModal";
import { EditContainerNetworkModal } from "@/components/containers/EditContainerNetworkModal";
import { DeleteContainerNetworkModal } from "@/components/containers/DeleteContainerNetworkModal";
import { CreateContainerRegistryModal } from "@/components/containers/CreateContainerRegistryModal";
import { EditContainerRegistryModal } from "@/components/containers/EditContainerRegistryModal";
import { DeleteContainerRegistryModal } from "@/components/containers/DeleteContainerRegistryModal";

export default function ContainersPage() {
  const [config, setConfig] = useState<ContainerConfig | null>(null);
  const [capabilities, setCapabilities] =
    useState<ContainerCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("containers");

  // Container modals
  const [createContainerOpen, setCreateContainerOpen] = useState(false);
  const [editingContainer, setEditingContainer] =
    useState<ContainerEntry | null>(null);
  const [deletingContainer, setDeletingContainer] = useState<string | null>(
    null
  );

  // Network modals
  const [createNetworkOpen, setCreateNetworkOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] =
    useState<ContainerNetwork | null>(null);
  const [deletingNetwork, setDeletingNetwork] = useState<string | null>(null);

  // Registry modals
  const [createRegistryOpen, setCreateRegistryOpen] = useState(false);
  const [editingRegistry, setEditingRegistry] =
    useState<ContainerRegistry | null>(null);
  const [deletingRegistry, setDeletingRegistry] = useState<string | null>(null);

  const { canWrite } = usePermissions();

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capData] = await Promise.all([
        containerService.getConfig(),
        containerService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load container configuration"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await loadData();
  }, [loadData]);

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
          title="Error Loading Containers"
          message={error}
          onRetry={handleRefresh}
          className="max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="page-compact">
      <PageHeader
        title="Containers"
        description="Manage OCI containers, networks, and registries on your VyOS device"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {error && config && (
        <ErrorAlert title="Refresh Error" message={error} className="mb-4" />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="containers" className="gap-2">
            <Box className="h-4 w-4" />
            Containers
            {config?.containers.length ? (
              <Badge variant="secondary" className="ml-1 text-xs">
                {config.containers.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="networks" className="gap-2">
            <Network className="h-4 w-4" />
            Networks
            {config?.networks.length ? (
              <Badge variant="secondary" className="ml-1 text-xs">
                {config.networks.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="registries" className="gap-2">
            <Database className="h-4 w-4" />
            Registries
            {config?.registries.length ? (
              <Badge variant="secondary" className="ml-1 text-xs">
                {config.registries.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* Containers Tab */}
        <TabsContent value="containers" className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">Container Instances</h3>
            {canWrite(FeatureGroup.CONTAINER) && (
              <Button size="sm" onClick={() => setCreateContainerOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Container
              </Button>
            )}
          </div>

          {config?.containers.length === 0 ? (
            <EmptyState
              icon={Box}
              title="No Containers"
              description="No containers are configured on this device."
            />
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table className="table-dense">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Ports</TableHead>
                    <TableHead>Restart</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config?.containers.map((container) => (
                    <TableRow key={container.name}>
                      <TableCell className="font-mono font-medium">
                        {container.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground max-w-[200px] truncate">
                        {container.image || "—"}
                      </TableCell>
                      <TableCell>
                        {container.networks.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {container.networks.map((net) => (
                              <Badge
                                key={net}
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {net}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {container.ports.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {container.ports.map((port) => (
                              <Badge
                                key={port.name}
                                variant="secondary"
                                className="font-mono text-xs"
                              >
                                {port.source}&rarr;{port.destination}/
                                {port.protocol}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {container.restart ? (
                          <Badge variant="outline" className="text-xs">{container.restart}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {container.disabled ? (
                          <Badge variant="destructive" className="text-xs">Disabled</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">Enabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {canWrite(FeatureGroup.CONTAINER) && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingContainer(container)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() =>
                                setDeletingContainer(container.name)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Networks Tab */}
        <TabsContent value="networks" className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">Container Networks</h3>
            {canWrite(FeatureGroup.CONTAINER) && (
              <Button size="sm" onClick={() => setCreateNetworkOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Network
              </Button>
            )}
          </div>

          {config?.networks.length === 0 ? (
            <EmptyState
              icon={Network}
              title="No Networks"
              description="No container networks are configured."
            />
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table className="table-dense">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Prefix(es)</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>MTU</TableHead>
                    <TableHead>VRF</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config?.networks.map((network) => (
                    <TableRow key={network.name}>
                      <TableCell className="font-mono font-medium">
                        {network.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {network.prefixes.map((prefix) => (
                            <Badge
                              key={prefix}
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {prefix}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {network.description || "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {network.mtu || "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {network.vrf || "—"}
                      </TableCell>
                      <TableCell>
                        {canWrite(FeatureGroup.CONTAINER) && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingNetwork(network)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() =>
                                setDeletingNetwork(network.name)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Registries Tab */}
        <TabsContent value="registries" className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">Container Registries</h3>
            {canWrite(FeatureGroup.CONTAINER) && (
              <Button size="sm" onClick={() => setCreateRegistryOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Registry
              </Button>
            )}
          </div>

          {config?.registries.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No Registries"
              description="No container registries are configured."
            />
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table className="table-dense">
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config?.registries.map((registry) => (
                    <TableRow key={registry.url}>
                      <TableCell className="font-mono font-medium">
                        {registry.url}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {registry.username || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {registry.disabled && (
                            <Badge variant="destructive" className="text-xs">Disabled</Badge>
                          )}
                          {registry.insecure && (
                            <Badge
                              variant="outline"
                              className="text-xs text-yellow-500 border-yellow-500/50"
                            >
                              Insecure
                            </Badge>
                          )}
                          {!registry.disabled && !registry.insecure && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canWrite(FeatureGroup.CONTAINER) && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingRegistry(registry)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() =>
                                setDeletingRegistry(registry.url)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* All modals */}
      <CreateContainerModal
        open={createContainerOpen}
        onOpenChange={setCreateContainerOpen}
        onSuccess={loadData}
        capabilities={capabilities}
        existingNames={config?.containers.map((c) => c.name) || []}
        availableNetworks={config?.networks.map((n) => n.name) || []}
      />
      <EditContainerModal
        open={!!editingContainer}
        onOpenChange={(open) => {
          if (!open) setEditingContainer(null);
        }}
        onSuccess={loadData}
        capabilities={capabilities}
        container={editingContainer}
        availableNetworks={config?.networks.map((n) => n.name) || []}
      />
      <DeleteContainerModal
        open={!!deletingContainer}
        onOpenChange={(open) => {
          if (!open) setDeletingContainer(null);
        }}
        onSuccess={loadData}
        containerName={deletingContainer || ""}
      />

      <CreateContainerNetworkModal
        open={createNetworkOpen}
        onOpenChange={setCreateNetworkOpen}
        onSuccess={loadData}
        capabilities={capabilities}
        existingNames={config?.networks.map((n) => n.name) || []}
      />
      <EditContainerNetworkModal
        open={!!editingNetwork}
        onOpenChange={(open) => {
          if (!open) setEditingNetwork(null);
        }}
        onSuccess={loadData}
        capabilities={capabilities}
        network={editingNetwork}
      />
      <DeleteContainerNetworkModal
        open={!!deletingNetwork}
        onOpenChange={(open) => {
          if (!open) setDeletingNetwork(null);
        }}
        onSuccess={loadData}
        networkName={deletingNetwork || ""}
      />

      <CreateContainerRegistryModal
        open={createRegistryOpen}
        onOpenChange={setCreateRegistryOpen}
        onSuccess={loadData}
        capabilities={capabilities}
        existingUrls={config?.registries.map((r) => r.url) || []}
      />
      <EditContainerRegistryModal
        open={!!editingRegistry}
        onOpenChange={(open) => {
          if (!open) setEditingRegistry(null);
        }}
        onSuccess={loadData}
        capabilities={capabilities}
        registry={editingRegistry}
      />
      <DeleteContainerRegistryModal
        open={!!deletingRegistry}
        onOpenChange={(open) => {
          if (!open) setDeletingRegistry(null);
        }}
        onSuccess={loadData}
        registryUrl={deletingRegistry || ""}
      />
    </div>
  );
}
