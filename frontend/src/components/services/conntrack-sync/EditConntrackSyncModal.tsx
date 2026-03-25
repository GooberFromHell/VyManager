"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { conntrackSyncService } from "@/lib/api/conntrack-sync";
import type {
  ConntrackSyncConfig,
  ConntrackSyncCapabilities,
  ConntrackSyncBatchOperation,
} from "@/lib/api/types/conntrack-sync";
import { Loader2, X, Plus } from "lucide-react";

interface EditConntrackSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: ConntrackSyncConfig | null;
  capabilities: ConntrackSyncCapabilities | null;
}

const COMMON_PROTOCOLS = ["tcp", "udp", "icmp"];
const EXPECT_SYNC_MODULES = ["ftp", "h323", "nfs", "sip", "sqlnet"];

export function EditConntrackSyncModal({
  open,
  onOpenChange,
  onSuccess,
  config,
  capabilities,
}: EditConntrackSyncModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General tab
  const [acceptProtocols, setAcceptProtocols] = useState<string[]>([]);
  const [mcastGroup, setMcastGroup] = useState("");
  const [disableExternalCache, setDisableExternalCache] = useState(false);

  // Failover tab
  const [failoverType, setFailoverType] = useState<"vrrp" | "cluster">("vrrp");
  const [syncGroup, setSyncGroup] = useState("");
  const [clusterGroup, setClusterGroup] = useState("");

  // Expect Sync tab
  const [expectSyncModules, setExpectSyncModules] = useState<string[]>([]);

  // Advanced tab
  const [listenAddresses, setListenAddresses] = useState<string[]>([]);
  const [eventListenQueueSize, setEventListenQueueSize] = useState("");
  const [syncQueueSize, setSyncQueueSize] = useState("");
  const [startupResync, setStartupResync] = useState(false);

  useEffect(() => {
    if (config && open) {
      setAcceptProtocols(
        config.accept_protocols.length > 0 ? [...config.accept_protocols] : []
      );
      setMcastGroup(config.mcast_group || "");
      setDisableExternalCache(config.disable_external_cache);

      if (config.failover_mechanism) {
        setFailoverType(config.failover_mechanism.type);
        setSyncGroup(config.failover_mechanism.sync_group || "");
        setClusterGroup(config.failover_mechanism.cluster_group || "");
      } else {
        setFailoverType("vrrp");
        setSyncGroup("");
        setClusterGroup("");
      }

      setExpectSyncModules(
        config.expect_sync.length > 0 ? [...config.expect_sync] : []
      );

      setListenAddresses(
        config.listen_addresses.length > 0 ? [...config.listen_addresses] : []
      );
      setEventListenQueueSize(config.event_listen_queue_size || "");
      setSyncQueueSize(config.sync_queue_size || "");
      setStartupResync(config.startup_resync ?? false);

      setError(null);
    }
  }, [config, open]);

  const addToList = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, ""]);
  };

  const removeFromList = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInList = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const toggleExpectModule = (module: string) => {
    setExpectSyncModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };

  const buildOperations = (): ConntrackSyncBatchOperation[] => {
    if (!config) return [];
    const ops: ConntrackSyncBatchOperation[] = [];

    // Accept protocols
    const oldProtocols = new Set(config.accept_protocols);
    const newProtocols = new Set(acceptProtocols.filter((p) => p.trim()));
    for (const proto of newProtocols) {
      if (!oldProtocols.has(proto)) {
        ops.push({ op: "set_accept_protocol", value: proto });
      }
    }
    for (const proto of oldProtocols) {
      if (!newProtocols.has(proto)) {
        ops.push({ op: "delete_accept_protocol", value: proto });
      }
    }

    // Multicast group
    const newMcastGroup = mcastGroup.trim();
    const oldMcastGroup = config.mcast_group || "";
    if (newMcastGroup !== oldMcastGroup) {
      if (newMcastGroup) {
        ops.push({ op: "set_mcast_group", value: newMcastGroup });
      } else {
        ops.push({ op: "delete_mcast_group" });
      }
    }

    // Disable external cache
    if (disableExternalCache !== config.disable_external_cache) {
      ops.push({
        op: disableExternalCache
          ? "set_disable_external_cache"
          : "delete_disable_external_cache",
      });
    }

    // Failover mechanism — type
    const oldFailoverType = config.failover_mechanism?.type || null;
    if (failoverType !== oldFailoverType) {
      ops.push({ op: "set_failover_mechanism", value: failoverType });
    }

    // Failover — VRRP sync group
    const newSyncGroup = syncGroup.trim();
    const oldSyncGroup = config.failover_mechanism?.sync_group || "";
    if (newSyncGroup !== oldSyncGroup) {
      if (newSyncGroup) {
        ops.push({ op: "set_failover_sync_group", value: newSyncGroup });
      } else {
        ops.push({ op: "delete_failover_sync_group" });
      }
    }

    // Failover — cluster group (only if supported)
    if (capabilities?.has_cluster) {
      const newClusterGroup = clusterGroup.trim();
      const oldClusterGroup = config.failover_mechanism?.cluster_group || "";
      if (newClusterGroup !== oldClusterGroup) {
        if (newClusterGroup) {
          ops.push({ op: "set_failover_cluster_group", value: newClusterGroup });
        } else {
          ops.push({ op: "delete_failover_cluster_group" });
        }
      }
    }

    // Expect sync modules
    const oldExpect = new Set(config.expect_sync);
    const newExpect = new Set(expectSyncModules);
    for (const mod of newExpect) {
      if (!oldExpect.has(mod)) {
        ops.push({ op: "set_expect_sync", value: mod });
      }
    }
    for (const mod of oldExpect) {
      if (!newExpect.has(mod)) {
        ops.push({ op: "delete_expect_sync", value: mod });
      }
    }

    // Listen addresses (v1.5+)
    if (capabilities?.has_listen_address) {
      const oldAddrs = new Set(config.listen_addresses);
      const newAddrs = new Set(listenAddresses.filter((a) => a.trim()));
      for (const addr of newAddrs) {
        if (!oldAddrs.has(addr)) {
          ops.push({ op: "set_listen_address", value: addr });
        }
      }
      for (const addr of oldAddrs) {
        if (!newAddrs.has(addr)) {
          ops.push({ op: "delete_listen_address", value: addr });
        }
      }
    }

    // Event listen queue size (v1.5+)
    if (capabilities?.has_event_listen_queue_size) {
      const newSize = eventListenQueueSize.trim();
      const oldSize = config.event_listen_queue_size || "";
      if (newSize !== oldSize) {
        if (newSize) {
          ops.push({ op: "set_event_listen_queue_size", value: newSize });
        } else {
          ops.push({ op: "delete_event_listen_queue_size" });
        }
      }
    }

    // Sync queue size (v1.5+)
    if (capabilities?.has_sync_queue_size) {
      const newSize = syncQueueSize.trim();
      const oldSize = config.sync_queue_size || "";
      if (newSize !== oldSize) {
        if (newSize) {
          ops.push({ op: "set_sync_queue_size", value: newSize });
        } else {
          ops.push({ op: "delete_sync_queue_size" });
        }
      }
    }

    // Startup resync (v1.5+)
    if (capabilities?.has_startup_resync) {
      const oldStartupResync = config.startup_resync ?? false;
      if (startupResync !== oldStartupResync) {
        ops.push({
          op: startupResync ? "set_startup_resync" : "delete_startup_resync",
        });
      }
    }

    return ops;
  };

  const hasAdvancedFeatures =
    capabilities?.has_listen_address ||
    capabilities?.has_event_listen_queue_size ||
    capabilities?.has_sync_queue_size ||
    capabilities?.has_startup_resync;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const operations = buildOperations();

      if (operations.length === 0) {
        setError("No changes detected");
        setSubmitting(false);
        return;
      }

      await conntrackSyncService.updateSettings(operations);
      await conntrackSyncService.refreshConfig();

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update Conntrack Sync settings"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderMultiValueField = (
    label: string,
    values: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string
  ) => (
    <div className="space-y-2">
      {values.length === 0 && (
        <p className="text-sm text-zinc-500">None configured.</p>
      )}
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => updateInList(setter, index, e.target.value)}
            placeholder={placeholder}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeFromList(setter, index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => addToList(setter)}
      >
        <Plus className="h-4 w-4 mr-1" /> Add
      </Button>
    </div>
  );

  const tabCount = hasAdvancedFeatures ? 4 : 3;
  const gridCols =
    tabCount === 4
      ? "grid-cols-4"
      : "grid-cols-3";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Conntrack Sync Settings</DialogTitle>
          <DialogDescription>
            Modify the Conntrack Sync service configuration on this VyOS
            instance.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden space-y-4"
        >
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <ScrollArea className="flex-1 pr-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className={`grid w-full ${gridCols}`}>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="failover">Failover</TabsTrigger>
                <TabsTrigger value="expect">Expect Sync</TabsTrigger>
                {hasAdvancedFeatures && (
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                )}
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-5 mt-4">
                <Fieldset label="Protocols">
                  <FormField
                    label="Accept Protocols"
                    description="Common values: tcp, udp, icmp. Leave empty to sync all protocols."
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {COMMON_PROTOCOLS.map((proto) => (
                          <Button
                            key={proto}
                            type="button"
                            variant={
                              acceptProtocols.includes(proto)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => {
                              setAcceptProtocols((prev) =>
                                prev.includes(proto)
                                  ? prev.filter((p) => p !== proto)
                                  : [...prev, proto]
                              );
                            }}
                          >
                            {proto}
                          </Button>
                        ))}
                      </div>
                      <FormField label="Additional Protocols">
                        {renderMultiValueField(
                          "Additional Protocols",
                          acceptProtocols.filter(
                            (p) => !COMMON_PROTOCOLS.includes(p)
                          ),
                          (updater) => {
                            setAcceptProtocols((prev) => {
                              const common = prev.filter((p) =>
                                COMMON_PROTOCOLS.includes(p)
                              );
                              const custom =
                                typeof updater === "function"
                                  ? updater(
                                      prev.filter(
                                        (p) => !COMMON_PROTOCOLS.includes(p)
                                      )
                                    )
                                  : updater;
                              return [...common, ...custom];
                            });
                          },
                          "e.g. sctp"
                        )}
                      </FormField>
                    </div>
                  </FormField>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="Multicast">
                  <FormField
                    label="Multicast Group"
                    htmlFor="mcast-group"
                    description="Multicast IP address used for conntrack synchronization"
                  >
                    <Input
                      id="mcast-group"
                      placeholder="e.g. 225.0.0.50"
                      value={mcastGroup}
                      onChange={(e) => setMcastGroup(e.target.value)}
                    />
                  </FormField>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="Cache">
                  <FormField
                    label="Disable external cache"
                    htmlFor="disable-external-cache"
                    horizontal
                  >
                    <Checkbox
                      id="disable-external-cache"
                      checked={disableExternalCache}
                      onCheckedChange={(checked) =>
                        setDisableExternalCache(checked as boolean)
                      }
                    />
                  </FormField>
                </Fieldset>
              </TabsContent>

              {/* Failover Tab */}
              <TabsContent value="failover" className="space-y-5 mt-4">
                <Fieldset label="Mechanism">
                  <FormField label="Failover Mechanism Type">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={
                          failoverType === "vrrp" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setFailoverType("vrrp")}
                      >
                        VRRP
                      </Button>
                      {capabilities?.has_cluster && (
                        <Button
                          type="button"
                          variant={
                            failoverType === "cluster" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setFailoverType("cluster")}
                        >
                          Cluster
                        </Button>
                      )}
                    </div>
                  </FormField>

                  <FormField
                    label="VRRP Sync Group"
                    htmlFor="sync-group"
                    description="VRRP sync group name used for failover coordination"
                  >
                    <Input
                      id="sync-group"
                      placeholder="e.g. SYNC-GROUP"
                      value={syncGroup}
                      onChange={(e) => setSyncGroup(e.target.value)}
                    />
                  </FormField>

                  {capabilities?.has_cluster && (
                    <FormField
                      label="Cluster Group"
                      htmlFor="cluster-group"
                      description="Cluster group name for cluster-based failover"
                    >
                      <Input
                        id="cluster-group"
                        placeholder="e.g. CLUSTER-GROUP"
                        value={clusterGroup}
                        onChange={(e) => setClusterGroup(e.target.value)}
                      />
                    </FormField>
                  )}
                </Fieldset>
              </TabsContent>

              {/* Expect Sync Tab */}
              <TabsContent value="expect" className="space-y-5 mt-4">
                <Fieldset
                  label="Modules"
                  description="Select which connection tracking helper modules to synchronize between nodes."
                >
                  {EXPECT_SYNC_MODULES.map((module) => (
                    <FormField
                      key={module}
                      label={module}
                      htmlFor={`expect-${module}`}
                      horizontal
                    >
                      <Checkbox
                        id={`expect-${module}`}
                        checked={expectSyncModules.includes(module)}
                        onCheckedChange={() => toggleExpectModule(module)}
                        className="font-mono"
                      />
                    </FormField>
                  ))}
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="Additional Modules">
                  <FormField label="Custom Modules">
                    {renderMultiValueField(
                      "Additional Modules",
                      expectSyncModules.filter(
                        (m) => !EXPECT_SYNC_MODULES.includes(m)
                      ),
                      (updater) => {
                        setExpectSyncModules((prev) => {
                          const known = prev.filter((m) =>
                            EXPECT_SYNC_MODULES.includes(m)
                          );
                          const custom =
                            typeof updater === "function"
                              ? updater(
                                  prev.filter(
                                    (m) => !EXPECT_SYNC_MODULES.includes(m)
                                  )
                                )
                              : updater;
                          return [...known, ...custom];
                        });
                      },
                      "e.g. pptp"
                    )}
                  </FormField>
                </Fieldset>
              </TabsContent>

              {/* Advanced Tab */}
              {hasAdvancedFeatures && (
                <TabsContent value="advanced" className="space-y-5 mt-4">
                  {(capabilities?.has_event_listen_queue_size ||
                    capabilities?.has_sync_queue_size) && (
                    <Fieldset label="Queue Sizes">
                      {capabilities?.has_event_listen_queue_size && (
                        <FormField
                          label="Event Listen Queue Size"
                          htmlFor="event-queue-size"
                          description="Size of the event listening queue"
                        >
                          <Input
                            id="event-queue-size"
                            type="number"
                            min={1}
                            placeholder="e.g. 8192"
                            value={eventListenQueueSize}
                            onChange={(e) =>
                              setEventListenQueueSize(e.target.value)
                            }
                          />
                        </FormField>
                      )}

                      {capabilities?.has_sync_queue_size && (
                        <FormField
                          label="Sync Queue Size"
                          htmlFor="sync-queue-size"
                          description="Size of the synchronization queue"
                        >
                          <Input
                            id="sync-queue-size"
                            type="number"
                            min={1}
                            placeholder="e.g. 8192"
                            value={syncQueueSize}
                            onChange={(e) => setSyncQueueSize(e.target.value)}
                          />
                        </FormField>
                      )}
                    </Fieldset>
                  )}

                  {capabilities?.has_listen_address && (
                    <>
                      {(capabilities?.has_event_listen_queue_size ||
                        capabilities?.has_sync_queue_size) && (
                        <FieldsetDivider />
                      )}
                      <Fieldset label="Listen Addresses">
                        <FormField label="Addresses">
                          {renderMultiValueField(
                            "Listen Addresses",
                            listenAddresses,
                            setListenAddresses,
                            "e.g. 10.0.0.1"
                          )}
                        </FormField>
                      </Fieldset>
                    </>
                  )}

                  {capabilities?.has_startup_resync && (
                    <>
                      {(capabilities?.has_event_listen_queue_size ||
                        capabilities?.has_sync_queue_size ||
                        capabilities?.has_listen_address) && (
                        <FieldsetDivider />
                      )}
                      <Fieldset label="Startup">
                        <FormField
                          label="Enable startup resync"
                          htmlFor="startup-resync"
                          horizontal
                        >
                          <Checkbox
                            id="startup-resync"
                            checked={startupResync}
                            onCheckedChange={(checked) =>
                              setStartupResync(checked as boolean)
                            }
                          />
                        </FormField>
                      </Fieldset>
                    </>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </ScrollArea>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
