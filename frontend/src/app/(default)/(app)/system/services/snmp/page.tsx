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

  if (!config) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">SNMP Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No SNMP configuration found on this device.
          </p>
          {!isReadOnly && (
            <Button onClick={() => setEditOpen(true)}>
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <PageHeader
          title="SNMP"
          description="Simple Network Management Protocol configuration"
          actions={
            <>
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
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </>
          }
        />

        {/* General Settings & Listen Addresses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">General Settings</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contact</span>
                  <span>
                    {config.contact || (
                      <span className="text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Description</span>
                  <span>
                    {config.description || (
                      <span className="text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <span>
                    {config.location || (
                      <span className="text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trap Source</span>
                  <span>
                    {config.trap_source || (
                      <span className="text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Listen Addresses</h3>
              </div>
              <div className="space-y-2">
                {config.listen_addresses.length > 0 ? (
                  config.listen_addresses.map((listen) => (
                    <div
                      key={`${listen.address}:${listen.port || "default"}`}
                      className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-md bg-muted/50"
                    >
                      <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono">{listen.address}</span>
                      {listen.port && (
                        <Badge variant="outline">port {listen.port}</Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No listen addresses configured
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Communities */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Communities</h3>
            {!isReadOnly && (
              <Button onClick={() => setCreateCommunityOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Community
              </Button>
            )}
          </div>

          {config.communities.length > 0 ? (
            <Card>
              <Table>
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
                              <Badge key={client} variant="secondary">
                                {client}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic text-sm">
                              Any
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {community.networks.length > 0 ? (
                            community.networks.map((network) => (
                              <Badge key={network} variant="secondary">
                                {network}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic text-sm">
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
                              size="icon"
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
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No SNMP communities configured
                </p>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => setCreateCommunityOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Community
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Trap Targets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Trap Targets</h3>
            {!isReadOnly && (
              <Button onClick={() => setCreateTrapTargetOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Trap Target
              </Button>
            )}
          </div>

          {config.trap_targets.length > 0 ? (
            <Card>
              <Table>
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
                          <span className="text-muted-foreground italic">
                            Not set
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {target.port ? (
                          <Badge variant="outline">{target.port}</Badge>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Default
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Radio className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No trap targets configured
                </p>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => setCreateTrapTargetOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Trap Target
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* SNMPv3 Section */}
        {hasV3Config && (
          <div>
            <div
              className="flex items-center gap-2 mb-4 cursor-pointer"
              onClick={() => setV3Expanded(!v3Expanded)}
            >
              {v3Expanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">SNMPv3</h3>
            </div>

            {v3Expanded && (
              <div className="space-y-4">
                {/* Engine ID */}
                {config.v3.engineid && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Engine ID</span>
                        <span className="font-mono">
                          {config.v3.engineid}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Groups */}
                {config.v3.groups.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Groups
                    </h4>
                    <Card>
                      <Table>
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
                                  <Badge variant="secondary">
                                    {group.mode}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {group.seclevel ? (
                                  <Badge variant="outline">
                                    {group.seclevel}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {group.view || (
                                  <span className="text-muted-foreground italic">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                )}

                {/* Users */}
                {config.v3.users.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Users
                    </h4>
                    <Card>
                      <Table>
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
                                  <Badge variant="secondary">
                                    {user.auth_type}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.privacy_type ? (
                                  <Badge variant="secondary">
                                    {user.privacy_type}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.group || (
                                  <span className="text-muted-foreground italic">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.mode ? (
                                  <Badge variant="outline">{user.mode}</Badge>
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Not set
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                )}

                {/* Views */}
                {config.v3.views.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Views
                    </h4>
                    <Card>
                      <Table>
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
                                      className="font-mono"
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
                    </Card>
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
