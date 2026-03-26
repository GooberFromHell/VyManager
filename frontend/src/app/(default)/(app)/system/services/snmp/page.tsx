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
  Settings2,
  Radio,
  Users,
  Shield,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { snmpService } from "@/lib/api/snmp";
import type {
  SNMPConfig,
  SNMPCapabilities,
  SNMPCommunity,
} from "@/lib/api/types/snmp";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EditSNMPSettingsModal } from "@/components/services/snmp/EditSNMPSettingsModal";
import { CreateSNMPCommunityModal } from "@/components/services/snmp/CreateSNMPCommunityModal";
import { DeleteSNMPCommunityModal } from "@/components/services/snmp/DeleteSNMPCommunityModal";
import { CreateSNMPTrapTargetModal } from "@/components/services/snmp/CreateSNMPTrapTargetModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export default function SNMPPage() {
  const [config, setConfig] = useState<SNMPConfig | null>(null);
  const [capabilities, setCapabilities] = useState<SNMPCapabilities | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [createCommunityOpen, setCreateCommunityOpen] = useState(false);
  const [deleteCommunityOpen, setDeleteCommunityOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] =
    useState<SNMPCommunity | null>(null);
  const [createTrapTargetOpen, setCreateTrapTargetOpen] = useState(false);

  // Collapsible SNMPv3 section
  const [v3Expanded, setV3Expanded] = useState(false);

  const { canWrite } = usePermissions();
  const isReadOnly = !canWrite(FeatureGroup.SNMP);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capabilitiesData] = await Promise.all([
        snmpService.getConfig(),
        snmpService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capabilitiesData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load SNMP configuration"
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
      await snmpService.refreshConfig();
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

  const handleDeleteCommunity = (community: SNMPCommunity) => {
    setSelectedCommunity(community);
    setDeleteCommunityOpen(true);
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
      <div className="page-compact">
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
      <div className="page-compact">
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">SNMP Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No SNMP configuration found on this device.
          </p>
          {!isReadOnly && (
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Configure SNMP
            </Button>
          )}
        </div>
      </div>
    );
  }

  const hasV3Config =
    config.v3 &&
    (config.v3.engineid ||
      config.v3.groups.length > 0 ||
      config.v3.users.length > 0 ||
      config.v3.views.length > 0);

  return (
    <ScrollArea className="h-full">
      <div className="page-compact">
        {/* Header */}
        <PageHeader
          title="SNMP"
          description="Simple Network Management Protocol configuration"
          actions={
            <>
              {!isReadOnly && (
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
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
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </>
          }
        />

        {/* General Settings & Listen Addresses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border card-accent p-3">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">General Settings</h3>
            </div>
            <div className="space-y-1">
              <div className="kv-row">
                <span className="text-xs text-muted-foreground">Contact</span>
                <span className="text-xs">
                  {config.contact || (
                    <span className="text-muted-foreground italic">
                      Not set
                    </span>
                  )}
                </span>
              </div>
              <div className="kv-row">
                <span className="text-xs text-muted-foreground">Description</span>
                <span className="text-xs">
                  {config.description || (
                    <span className="text-muted-foreground italic">
                      Not set
                    </span>
                  )}
                </span>
              </div>
              <div className="kv-row">
                <span className="text-xs text-muted-foreground">Location</span>
                <span className="text-xs">
                  {config.location || (
                    <span className="text-muted-foreground italic">
                      Not set
                    </span>
                  )}
                </span>
              </div>
              <div className="kv-row">
                <span className="text-xs text-muted-foreground">Trap Source</span>
                <span className="text-xs">
                  {config.trap_source || (
                    <span className="text-muted-foreground italic">
                      Not set
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border card-accent p-3">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Listen Addresses</h3>
            </div>
            <div className="space-y-1">
              {config.listen_addresses.length > 0 ? (
                config.listen_addresses.map((listen) => (
                  <div
                    key={`${listen.address}:${listen.port || "default"}`}
                    className="flex items-center gap-2 text-xs py-1 px-2 rounded-md bg-muted/50"
                  >
                    <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono">{listen.address}</span>
                    {listen.port && (
                      <Badge variant="outline" className="text-xs">port {listen.port}</Badge>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No listen addresses configured
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Communities */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold section-header">Communities</h3>
            {!isReadOnly && (
              <Button size="sm" onClick={() => setCreateCommunityOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Community
              </Button>
            )}
          </div>

          {config.communities.length > 0 ? (
            <div className="rounded-md border border-border overflow-hidden">
              <Table className="table-dense">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Authorization</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Networks</TableHead>
                    {!isReadOnly && (
                      <TableHead className="w-[100px]">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.communities.map((community) => (
                    <TableRow key={community.name}>
                      <TableCell className="font-medium">
                        {community.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs"
                          variant={
                            community.authorization === "rw"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {community.authorization || "ro"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {community.clients.length > 0 ? (
                            community.clients.map((client) => (
                              <Badge key={client} variant="secondary" className="text-xs">
                                {client}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic text-xs">
                              Any
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {community.networks.length > 0 ? (
                            community.networks.map((network) => (
                              <Badge key={network} variant="secondary" className="text-xs">
                                {network}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic text-xs">
                              Any
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleDeleteCommunity(community)}
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
            </div>
          ) : (
            <div className="rounded-lg border border-border card-accent p-3 py-8 text-center">
              <Users className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">
                No SNMP communities configured
              </p>
              {!isReadOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setCreateCommunityOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Community
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Trap Targets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold section-header">Trap Targets</h3>
            {!isReadOnly && (
              <Button size="sm" onClick={() => setCreateTrapTargetOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Trap Target
              </Button>
            )}
          </div>

          {config.trap_targets.length > 0 ? (
            <div className="rounded-md border border-border overflow-hidden">
              <Table className="table-dense">
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Community</TableHead>
                    <TableHead>Port</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.trap_targets.map((target) => (
                    <TableRow key={target.address}>
                      <TableCell className="font-mono">
                        {target.address}
                      </TableCell>
                      <TableCell>
                        {target.community || (
                          <span className="text-muted-foreground italic text-xs">
                            Not set
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {target.port ? (
                          <Badge variant="outline" className="text-xs">{target.port}</Badge>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            Default
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border border-border card-accent p-3 py-8 text-center">
              <Radio className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">
                No trap targets configured
              </p>
              {!isReadOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setCreateTrapTargetOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trap Target
                </Button>
              )}
            </div>
          )}
        </div>

        {/* SNMPv3 Section */}
        {hasV3Config && (
          <div>
            <div
              className="flex items-center gap-2 mb-2 cursor-pointer"
              onClick={() => setV3Expanded(!v3Expanded)}
            >
              {v3Expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold section-header">SNMPv3</h3>
            </div>

            {v3Expanded && (
              <div className="space-y-3">
                {/* Engine ID */}
                {config.v3.engineid && (
                  <div className="rounded-lg border border-border card-accent p-3">
                    <div className="kv-row">
                      <span className="text-xs text-muted-foreground">Engine ID</span>
                      <span className="text-xs font-mono">
                        {config.v3.engineid}
                      </span>
                    </div>
                  </div>
                )}

                {/* Groups */}
                {config.v3.groups.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Groups
                    </h4>
                    <div className="rounded-md border border-border overflow-hidden">
                      <Table className="table-dense">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Security Level</TableHead>
                            <TableHead>View</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {config.v3.groups.map((group) => (
                            <TableRow key={group.name}>
                              <TableCell className="font-medium">
                                {group.name}
                              </TableCell>
                              <TableCell>
                                {group.mode ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {group.mode}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {group.seclevel ? (
                                  <Badge variant="outline" className="text-xs">
                                    {group.seclevel}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {group.view || (
                                  <span className="text-muted-foreground italic text-xs">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Users */}
                {config.v3.users.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Users
                    </h4>
                    <div className="rounded-md border border-border overflow-hidden">
                      <Table className="table-dense">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Auth Type</TableHead>
                            <TableHead>Privacy Type</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead>Mode</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {config.v3.users.map((user) => (
                            <TableRow key={user.name}>
                              <TableCell className="font-medium">
                                {user.name}
                              </TableCell>
                              <TableCell>
                                {user.auth_type ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {user.auth_type}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.privacy_type ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {user.privacy_type}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.group || (
                                  <span className="text-muted-foreground italic text-xs">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.mode ? (
                                  <Badge variant="outline" className="text-xs">{user.mode}</Badge>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Views */}
                {config.v3.views.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Views
                    </h4>
                    <div className="rounded-md border border-border overflow-hidden">
                      <Table className="table-dense">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>OIDs</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {config.v3.views.map((view) => (
                            <TableRow key={view.name}>
                              <TableCell className="font-medium">
                                {view.name}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {view.oids.map((oid) => (
                                    <Badge
                                      key={oid}
                                      variant="secondary"
                                      className="text-xs font-mono"
                                    >
                                      {oid}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {config && (
        <EditSNMPSettingsModal
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={handleSuccess}
          config={config}
          capabilities={capabilities}
        />
      )}

      <CreateSNMPCommunityModal
        open={createCommunityOpen}
        onOpenChange={setCreateCommunityOpen}
        onSuccess={handleSuccess}
        capabilities={capabilities}
        existingCommunities={config?.communities.map((c) => c.name) ?? []}
      />

      {selectedCommunity && (
        <DeleteSNMPCommunityModal
          open={deleteCommunityOpen}
          onOpenChange={setDeleteCommunityOpen}
          onSuccess={handleSuccess}
          communityName={selectedCommunity.name}
        />
      )}

      <CreateSNMPTrapTargetModal
        open={createTrapTargetOpen}
        onOpenChange={setCreateTrapTargetOpen}
        onSuccess={handleSuccess}
        capabilities={capabilities}
        existingTargets={config?.trap_targets.map((t) => t.address) ?? []}
      />
    </ScrollArea>
  );
}
