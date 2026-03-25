"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { containerService } from "@/lib/api/container";
import type {
  ContainerCapabilities,
  ContainerBatchOperation,
} from "@/lib/api/types/container";

interface CreateContainerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: ContainerCapabilities | null;
  existingNames?: string[];
  availableNetworks?: string[];
}

// ============================================================================
// Types for dynamic list items
// ============================================================================

interface PortEntry {
  name: string;
  source: string;
  destination: string;
  protocol: string;
}

interface VolumeEntry {
  name: string;
  source: string;
  destination: string;
  mode: string;
}

interface EnvEntry {
  key: string;
  value: string;
}

interface LabelEntry {
  key: string;
  value: string;
}

interface DeviceEntry {
  name: string;
  source: string;
  destination: string;
}

interface SysctlEntry {
  parameter: string;
  value: string;
}

interface TmpfsEntry {
  name: string;
  destination: string;
  size: string;
}

interface NetworkEntry {
  name: string;
  address: string;
}

const RESTART_POLICIES = ["no", "on-failure", "always"] as const;
const LOG_DRIVERS = ["k8s-file", "journald", "none"] as const;
const VOLUME_MODES = ["rw", "ro"] as const;
const ALL_CAPABILITIES = [
  "net-admin",
  "net-bind-service",
  "net-raw",
  "setpcap",
  "sys-admin",
  "sys-time",
] as const;

export function CreateContainerModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingNames,
  availableNetworks,
}: CreateContainerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [restart, setRestart] = useState("no");
  const [hostName, setHostName] = useState("");
  const [entrypoint, setEntrypoint] = useState("");
  const [command, setCommand] = useState("");
  const [commandArgs, setCommandArgs] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Networking
  const [selectedNetworks, setSelectedNetworks] = useState<NetworkEntry[]>([]);
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [nameServers, setNameServers] = useState<string[]>([]);
  const [allowHostNetworks, setAllowHostNetworks] = useState(false);
  const [allowHostPid, setAllowHostPid] = useState(false);

  // Storage
  const [volumes, setVolumes] = useState<VolumeEntry[]>([]);
  const [tmpfsMounts, setTmpfsMounts] = useState<TmpfsEntry[]>([]);

  // Environment
  const [envVars, setEnvVars] = useState<EnvEntry[]>([]);
  const [labels, setLabels] = useState<LabelEntry[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);

  // Advanced
  const [memory, setMemory] = useState("");
  const [cpuQuota, setCpuQuota] = useState("");
  const [uid, setUid] = useState("");
  const [gid, setGid] = useState("");
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [logDriver, setLogDriver] = useState("");
  const [sysctls, setSysctls] = useState<SysctlEntry[]>([]);

  // ============================================================================
  // Reset
  // ============================================================================

  const resetForm = () => {
    setName("");
    setImage("");
    setDescription("");
    setRestart("no");
    setHostName("");
    setEntrypoint("");
    setCommand("");
    setCommandArgs("");
    setDisabled(false);
    setSelectedNetworks([]);
    setPorts([]);
    setNameServers([]);
    setAllowHostNetworks(false);
    setAllowHostPid(false);
    setVolumes([]);
    setTmpfsMounts([]);
    setEnvVars([]);
    setLabels([]);
    setSelectedCapabilities([]);
    setMemory("");
    setCpuQuota("");
    setUid("");
    setGid("");
    setDevices([]);
    setLogDriver("");
    setSysctls([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // ============================================================================
  // Dynamic list helpers — ports
  // ============================================================================

  const addPort = () =>
    setPorts((prev) => [
      ...prev,
      { name: "", source: "", destination: "", protocol: "tcp" },
    ]);
  const removePort = (index: number) =>
    setPorts((prev) => prev.filter((_, i) => i !== index));
  const updatePort = (index: number, field: keyof PortEntry, value: string) =>
    setPorts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  // ============================================================================
  // Dynamic list helpers — volumes
  // ============================================================================

  const addVolume = () =>
    setVolumes((prev) => [
      ...prev,
      { name: "", source: "", destination: "", mode: "rw" },
    ]);
  const removeVolume = (index: number) =>
    setVolumes((prev) => prev.filter((_, i) => i !== index));
  const updateVolume = (
    index: number,
    field: keyof VolumeEntry,
    value: string
  ) =>
    setVolumes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  // ============================================================================
  // Dynamic list helpers — tmpfs
  // ============================================================================

  const addTmpfs = () =>
    setTmpfsMounts((prev) => [
      ...prev,
      { name: "", destination: "", size: "" },
    ]);
  const removeTmpfs = (index: number) =>
    setTmpfsMounts((prev) => prev.filter((_, i) => i !== index));
  const updateTmpfs = (
    index: number,
    field: keyof TmpfsEntry,
    value: string
  ) =>
    setTmpfsMounts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  // ============================================================================
  // Dynamic list helpers — env vars
  // ============================================================================

  const addEnv = () =>
    setEnvVars((prev) => [...prev, { key: "", value: "" }]);
  const removeEnv = (index: number) =>
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  const updateEnv = (index: number, field: keyof EnvEntry, value: string) =>
    setEnvVars((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  // ============================================================================
  // Dynamic list helpers — labels
  // ============================================================================

  const addLabel = () =>
    setLabels((prev) => [...prev, { key: "", value: "" }]);
  const removeLabel = (index: number) =>
    setLabels((prev) => prev.filter((_, i) => i !== index));
  const updateLabel = (
    index: number,
    field: keyof LabelEntry,
    value: string
  ) =>
    setLabels((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  // ============================================================================
  // Dynamic list helpers — devices
  // ============================================================================

  const addDevice = () =>
    setDevices((prev) => [...prev, { name: "", source: "", destination: "" }]);
  const removeDevice = (index: number) =>
    setDevices((prev) => prev.filter((_, i) => i !== index));
  const updateDevice = (
    index: number,
    field: keyof DeviceEntry,
    value: string
  ) =>
    setDevices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  // ============================================================================
  // Dynamic list helpers — sysctls
  // ============================================================================

  const addSysctl = () =>
    setSysctls((prev) => [...prev, { parameter: "", value: "" }]);
  const removeSysctl = (index: number) =>
    setSysctls((prev) => prev.filter((_, i) => i !== index));
  const updateSysctl = (
    index: number,
    field: keyof SysctlEntry,
    value: string
  ) =>
    setSysctls((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  // ============================================================================
  // Dynamic list helpers — name servers
  // ============================================================================

  const addNameServer = () => setNameServers((prev) => [...prev, ""]);
  const removeNameServer = (index: number) =>
    setNameServers((prev) => prev.filter((_, i) => i !== index));
  const updateNameServer = (index: number, value: string) =>
    setNameServers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  // ============================================================================
  // Network selection helpers
  // ============================================================================

  const addNetwork = () => {
    if (!availableNetworks || availableNetworks.length === 0) return;
    const unused = availableNetworks.filter(
      (n) => !selectedNetworks.some((sn) => sn.name === n)
    );
    if (unused.length > 0) {
      setSelectedNetworks((prev) => [
        ...prev,
        { name: unused[0], address: "" },
      ]);
    }
  };
  const removeNetwork = (index: number) =>
    setSelectedNetworks((prev) => prev.filter((_, i) => i !== index));
  const updateNetworkName = (index: number, value: string) =>
    setSelectedNetworks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name: value };
      return next;
    });
  const updateNetworkAddress = (index: number, value: string) =>
    setSelectedNetworks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], address: value };
      return next;
    });

  const toggleCapability = (cap: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  // ============================================================================
  // Submit
  // ============================================================================

  const handleSubmit = async () => {
    if (!name.trim() || !image.trim()) {
      setError("Name and Image are required");
      return;
    }
    if (existingNames?.includes(name.trim())) {
      setError("A container with this name already exists");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const operations: ContainerBatchOperation[] = [];

      operations.push({ op: "set_container_image", value: image.trim() });

      if (description.trim())
        operations.push({
          op: "set_container_description",
          value: description.trim(),
        });
      if (restart && restart !== "no")
        operations.push({ op: "set_container_restart", value: restart });
      if (hostName.trim())
        operations.push({
          op: "set_container_host_name",
          value: hostName.trim(),
        });
      if (entrypoint.trim())
        operations.push({
          op: "set_container_entrypoint",
          value: entrypoint.trim(),
        });
      if (command.trim())
        operations.push({
          op: "set_container_command",
          value: command.trim(),
        });
      if (commandArgs.trim())
        operations.push({
          op: "set_container_arguments",
          value: commandArgs.trim(),
        });
      if (disabled) operations.push({ op: "set_container_disable" });

      // Networks
      for (const net of selectedNetworks) {
        if (net.name) {
          operations.push({ op: "set_container_network", value: net.name });
          if (net.address)
            operations.push({
              op: "set_container_network_address",
              value: `${net.name},${net.address}`,
            });
        }
      }

      // Ports
      for (const port of ports) {
        if (port.name && port.source && port.destination) {
          operations.push({
            op: "set_container_port",
            value: `${port.name},${port.source},${port.destination},${port.protocol}`,
          });
        }
      }

      // Name servers
      for (const ns of nameServers) {
        if (ns.trim())
          operations.push({
            op: "set_container_name_server",
            value: ns.trim(),
          });
      }

      if (allowHostNetworks)
        operations.push({ op: "set_container_allow_host_networks" });
      if (allowHostPid)
        operations.push({ op: "set_container_allow_host_pid" });

      // Volumes
      for (const vol of volumes) {
        if (vol.name && vol.source && vol.destination) {
          operations.push({
            op: "set_container_volume",
            value: `${vol.name},${vol.source},${vol.destination},${vol.mode}`,
          });
        }
      }

      // Tmpfs (v1.5 only)
      if (capabilities?.has_tmpfs) {
        for (const tmpfs of tmpfsMounts) {
          if (tmpfs.name && tmpfs.destination) {
            const sizeVal = tmpfs.size ? `,${tmpfs.size}` : "";
            operations.push({
              op: "set_container_tmpfs",
              value: `${tmpfs.name},${tmpfs.destination}${sizeVal}`,
            });
          }
        }
      }

      // Environment
      for (const env of envVars) {
        if (env.key)
          operations.push({
            op: "set_container_environment",
            value: `${env.key},${env.value}`,
          });
      }

      // Labels
      for (const label of labels) {
        if (label.key)
          operations.push({
            op: "set_container_label",
            value: `${label.key},${label.value}`,
          });
      }

      // Capabilities
      for (const cap of selectedCapabilities) {
        operations.push({ op: "set_container_capability", value: cap });
      }

      // Advanced
      if (memory)
        operations.push({
          op: "set_container_memory",
          value: String(memory),
        });
      if (cpuQuota.trim())
        operations.push({
          op: "set_container_cpu_quota",
          value: cpuQuota.trim(),
        });
      if (uid)
        operations.push({ op: "set_container_uid", value: String(uid) });
      if (gid)
        operations.push({ op: "set_container_gid", value: String(gid) });

      // Devices
      for (const dev of devices) {
        if (dev.name && dev.source && dev.destination) {
          operations.push({
            op: "set_container_device",
            value: `${dev.name},${dev.source},${dev.destination}`,
          });
        }
      }

      // Log driver (v1.5 only)
      if (logDriver && capabilities?.has_log_driver)
        operations.push({
          op: "set_container_log_driver",
          value: logDriver,
        });

      // Sysctl (v1.5 only)
      if (capabilities?.has_sysctl) {
        for (const sysctl of sysctls) {
          if (sysctl.parameter) {
            operations.push({
              op: "set_container_sysctl",
              value: `${sysctl.parameter},${sysctl.value}`,
            });
          }
        }
      }

      await containerService.createContainer(name.trim(), operations);
      await containerService.refreshConfig();
      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create container"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Render helpers
  // ============================================================================

  const unusedNetworks =
    availableNetworks?.filter(
      (n) => !selectedNetworks.some((sn) => sn.name === n)
    ) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] !flex !flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Container</DialogTitle>
          <DialogDescription>
            Create a new container on this VyOS instance.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-4 pb-2">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="networking">Networking</TabsTrigger>
                <TabsTrigger value="storage">Storage</TabsTrigger>
                <TabsTrigger value="environment">Environment</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* ================================================================
                  General Tab
              ================================================================ */}
              <TabsContent value="general" className="space-y-5 pt-2">
                <Fieldset label="Identity">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label="Name"
                      htmlFor="container-name"
                      required
                      description="Unique identifier for this container"
                    >
                      <Input
                        id="container-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. nginx-proxy"
                        className="font-mono"
                      />
                    </FormField>

                    <FormField
                      label="Image"
                      htmlFor="container-image"
                      required
                      description="Container image reference"
                    >
                      <Input
                        id="container-image"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="docker.io/library/nginx:latest"
                        className="font-mono"
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Description"
                    htmlFor="container-description"
                  >
                    <Input
                      id="container-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
                    />
                  </FormField>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="Startup">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label="Restart Policy"
                      htmlFor="container-restart"
                    >
                      <Select value={restart} onValueChange={setRestart}>
                        <SelectTrigger id="container-restart">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESTART_POLICIES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField
                      label="Host Name"
                      htmlFor="container-hostname"
                    >
                      <Input
                        id="container-hostname"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        placeholder="e.g. my-container"
                        className="font-mono"
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Entrypoint"
                    htmlFor="container-entrypoint"
                    description="Override the container image entrypoint"
                  >
                    <Input
                      id="container-entrypoint"
                      value={entrypoint}
                      onChange={(e) => setEntrypoint(e.target.value)}
                      placeholder="e.g. /bin/sh"
                      className="font-mono"
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label="Command"
                      htmlFor="container-command"
                    >
                      <Input
                        id="container-command"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="e.g. nginx"
                        className="font-mono"
                      />
                    </FormField>

                    <FormField
                      label="Arguments"
                      htmlFor="container-arguments"
                    >
                      <Input
                        id="container-arguments"
                        value={commandArgs}
                        onChange={(e) => setCommandArgs(e.target.value)}
                        placeholder="e.g. -g daemon off;"
                        className="font-mono"
                      />
                    </FormField>
                  </div>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="State">
                  <FormField
                    label="Disable container"
                    htmlFor="container-disabled"
                    description="Container will remain in config but will not run"
                    horizontal
                  >
                    <Checkbox
                      id="container-disabled"
                      checked={disabled}
                      onCheckedChange={(checked) =>
                        setDisabled(checked as boolean)
                      }
                    />
                  </FormField>
                </Fieldset>
              </TabsContent>

              {/* ================================================================
                  Networking Tab
              ================================================================ */}
              <TabsContent value="networking" className="space-y-5 pt-2">
                <Fieldset label="Networks">
                  {selectedNetworks.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No networks attached.
                    </p>
                  )}
                  <div className="space-y-3">
                    {selectedNetworks.map((net, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"
                      >
                        <FormField label={i === 0 ? "Network" : ""}>
                          <Select
                            value={net.name}
                            onValueChange={(v) => updateNetworkName(i, v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={net.name}>
                                {net.name}
                              </SelectItem>
                              {unusedNetworks.map((n) => (
                                <SelectItem key={n} value={n}>
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label={i === 0 ? "Address" : ""}>
                          <Input
                            value={net.address}
                            onChange={(e) =>
                              updateNetworkAddress(i, e.target.value)
                            }
                            placeholder="e.g. 172.16.0.2"
                            className="font-mono"
                          />
                        </FormField>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeNetwork(i)}
                          className="mb-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNetwork}
                      disabled={unusedNetworks.length === 0 && selectedNetworks.length > 0}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Network
                    </Button>
                  </div>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="Port Mappings">
                  {ports.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No port mappings configured.
                    </p>
                  )}
                  <div className="space-y-3">
                    {ports.map((port, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_1fr_6rem_auto] gap-2 items-end"
                      >
                        <FormField label={i === 0 ? "Name" : ""}>
                          <Input
                            value={port.name}
                            onChange={(e) =>
                              updatePort(i, "name", e.target.value)
                            }
                            placeholder="e.g. http"
                            className="font-mono"
                          />
                        </FormField>
                        <FormField label={i === 0 ? "Source" : ""}>
                          <Input
                            value={port.source}
                            onChange={(e) =>
                              updatePort(i, "source", e.target.value)
                            }
                            placeholder="80"
                            className="font-mono"
                          />
                        </FormField>
                        <FormField label={i === 0 ? "Destination" : ""}>
                          <Input
                            value={port.destination}
                            onChange={(e) =>
                              updatePort(i, "destination", e.target.value)
                            }
                            placeholder="8080"
                            className="font-mono"
                          />
                        </FormField>
                        <FormField label={i === 0 ? "Protocol" : ""}>
                          <Select
                            value={port.protocol}
                            onValueChange={(v) =>
                              updatePort(i, "protocol", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tcp">tcp</SelectItem>
                              <SelectItem value="udp">udp</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removePort(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPort}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Port
                    </Button>
                  </div>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="Name Servers">
                  {nameServers.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No custom name servers configured.
                    </p>
                  )}
                  <div className="space-y-2">
                    {nameServers.map((ns, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={ns}
                          onChange={(e) => updateNameServer(i, e.target.value)}
                          placeholder="e.g. 8.8.8.8"
                          className="font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeNameServer(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNameServer}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Name Server
                    </Button>
                  </div>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="Host Access">
                  <FormField
                    label="Allow host networks"
                    htmlFor="allow-host-networks"
                    description="Container shares host network namespace"
                    horizontal
                  >
                    <Checkbox
                      id="allow-host-networks"
                      checked={allowHostNetworks}
                      onCheckedChange={(checked) =>
                        setAllowHostNetworks(checked as boolean)
                      }
                    />
                  </FormField>

                  <FormField
                    label="Allow host PID"
                    htmlFor="allow-host-pid"
                    description="Container shares host PID namespace"
                    horizontal
                  >
                    <Checkbox
                      id="allow-host-pid"
                      checked={allowHostPid}
                      onCheckedChange={(checked) =>
                        setAllowHostPid(checked as boolean)
                      }
                    />
                  </FormField>
                </Fieldset>
              </TabsContent>

              {/* ================================================================
                  Storage Tab
              ================================================================ */}
              <TabsContent value="storage" className="space-y-5 pt-2">
                <Fieldset label="Volumes">
                  {volumes.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No volumes configured.
                    </p>
                  )}
                  <div className="space-y-3">
                    {volumes.map((vol, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_1fr_6rem_auto] gap-2 items-end"
                      >
                        <FormField label={i === 0 ? "Name" : ""}>
                          <Input
                            value={vol.name}
                            onChange={(e) =>
                              updateVolume(i, "name", e.target.value)
                            }
                            placeholder="e.g. config"
                            className="font-mono"
                          />
                        </FormField>
                        <FormField label={i === 0 ? "Source Path" : ""}>
                          <Input
                            value={vol.source}
                            onChange={(e) =>
                              updateVolume(i, "source", e.target.value)
                            }
                            placeholder="/config/nginx"
                            className="font-mono"
                          />
                        </FormField>
                        <FormField label={i === 0 ? "Destination Path" : ""}>
                          <Input
                            value={vol.destination}
                            onChange={(e) =>
                              updateVolume(i, "destination", e.target.value)
                            }
                            placeholder="/etc/nginx"
                            className="font-mono"
                          />
                        </FormField>
                        <FormField label={i === 0 ? "Mode" : ""}>
                          <Select
                            value={vol.mode}
                            onValueChange={(v) =>
                              updateVolume(i, "mode", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VOLUME_MODES.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeVolume(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVolume}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Volume
                    </Button>
                  </div>
                </Fieldset>

                {capabilities?.has_tmpfs && (
                  <>
                    <FieldsetDivider />

                    <Fieldset
                      label="Tmpfs Mounts"
                      description="In-memory temporary filesystems (VyOS 1.5+)"
                    >
                      {tmpfsMounts.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No tmpfs mounts configured.
                        </p>
                      )}
                      <div className="space-y-3">
                        {tmpfsMounts.map((tmpfs, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
                          >
                            <FormField label={i === 0 ? "Name" : ""}>
                              <Input
                                value={tmpfs.name}
                                onChange={(e) =>
                                  updateTmpfs(i, "name", e.target.value)
                                }
                                placeholder="e.g. tmp"
                                className="font-mono"
                              />
                            </FormField>
                            <FormField
                              label={i === 0 ? "Destination" : ""}
                            >
                              <Input
                                value={tmpfs.destination}
                                onChange={(e) =>
                                  updateTmpfs(
                                    i,
                                    "destination",
                                    e.target.value
                                  )
                                }
                                placeholder="/tmp"
                                className="font-mono"
                              />
                            </FormField>
                            <FormField
                              label={i === 0 ? "Size (bytes)" : ""}
                            >
                              <Input
                                value={tmpfs.size}
                                onChange={(e) =>
                                  updateTmpfs(i, "size", e.target.value)
                                }
                                placeholder="e.g. 67108864"
                                className="font-mono"
                              />
                            </FormField>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeTmpfs(i)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addTmpfs}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Tmpfs
                        </Button>
                      </div>
                    </Fieldset>
                  </>
                )}
              </TabsContent>

              {/* ================================================================
                  Environment Tab
              ================================================================ */}
              <TabsContent value="environment" className="space-y-5 pt-2">
                <Fieldset label="Environment Variables">
                  {envVars.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No environment variables configured.
                    </p>
                  )}
                  <div className="space-y-2">
                    {envVars.map((env, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"
                      >
                        <FormField label={i === 0 ? "Key" : ""}>
                          <Input
                            value={env.key}
                            onChange={(e) =>
                              updateEnv(i, "key", e.target.value)
                            }
                            placeholder="NGINX_PORT"
                            className="font-mono"
                          />
                        </FormField>
                        <FormField label={i === 0 ? "Value" : ""}>
                          <Input
                            value={env.value}
                            onChange={(e) =>
                              updateEnv(i, "value", e.target.value)
                            }
                            placeholder="80"
                            className="font-mono"
                          />
                        </FormField>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeEnv(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEnv}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Variable
                    </Button>
                  </div>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="Labels">
                  {labels.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No labels configured.
                    </p>
                  )}
                  <div className="space-y-2">
                    {labels.map((label, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"
                      >
                        <FormField label={i === 0 ? "Key" : ""}>
                          <Input
                            value={label.key}
                            onChange={(e) =>
                              updateLabel(i, "key", e.target.value)
                            }
                            placeholder="com.example.env"
                            className="font-mono"
                          />
                        </FormField>
                        <FormField label={i === 0 ? "Value" : ""}>
                          <Input
                            value={label.value}
                            onChange={(e) =>
                              updateLabel(i, "value", e.target.value)
                            }
                            placeholder="production"
                            className="font-mono"
                          />
                        </FormField>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLabel(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLabel}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Label
                    </Button>
                  </div>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset
                  label="Capabilities"
                  description="Linux capabilities granted to this container"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {ALL_CAPABILITIES.map((cap) => (
                      <FormField
                        key={cap}
                        label={cap}
                        htmlFor={`cap-${cap}`}
                        horizontal
                      >
                        <Checkbox
                          id={`cap-${cap}`}
                          checked={selectedCapabilities.includes(cap)}
                          onCheckedChange={() => toggleCapability(cap)}
                        />
                      </FormField>
                    ))}
                  </div>
                </Fieldset>
              </TabsContent>

              {/* ================================================================
                  Advanced Tab
              ================================================================ */}
              <TabsContent value="advanced" className="space-y-5 pt-2">
                <Fieldset label="Resources">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label="Memory (MB)"
                      htmlFor="container-memory"
                      description="Maximum memory in megabytes (0 = unlimited)"
                    >
                      <Input
                        id="container-memory"
                        type="number"
                        min={0}
                        value={memory}
                        onChange={(e) => setMemory(e.target.value)}
                        placeholder="e.g. 512"
                        className="font-mono"
                      />
                    </FormField>

                    <FormField
                      label="CPU Quota"
                      htmlFor="container-cpu-quota"
                      description="CPU usage quota (e.g. 0.5 = 50%)"
                    >
                      <Input
                        id="container-cpu-quota"
                        value={cpuQuota}
                        onChange={(e) => setCpuQuota(e.target.value)}
                        placeholder="e.g. 0.5"
                        className="font-mono"
                      />
                    </FormField>
                  </div>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="User / Group">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="UID" htmlFor="container-uid">
                      <Input
                        id="container-uid"
                        type="number"
                        min={0}
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                        placeholder="e.g. 1000"
                        className="font-mono"
                      />
                    </FormField>

                    <FormField label="GID" htmlFor="container-gid">
                      <Input
                        id="container-gid"
                        type="number"
                        min={0}
                        value={gid}
                        onChange={(e) => setGid(e.target.value)}
                        placeholder="e.g. 1000"
                        className="font-mono"
                      />
                    </FormField>
                  </div>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="Devices">
                  {devices.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No devices configured.
                    </p>
                  )}
                  <div className="space-y-3">
                    {devices.map((dev, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
                      >
                        <FormField label={i === 0 ? "Name" : ""}>
                          <Input
                            value={dev.name}
                            onChange={(e) =>
                              updateDevice(i, "name", e.target.value)
                            }
                            placeholder="e.g. gpu"
                            className="font-mono"
                          />
                        </FormField>
                        <FormField label={i === 0 ? "Source" : ""}>
                          <Input
                            value={dev.source}
                            onChange={(e) =>
                              updateDevice(i, "source", e.target.value)
                            }
                            placeholder="/dev/dri/card0"
                            className="font-mono"
                          />
                        </FormField>
                        <FormField label={i === 0 ? "Destination" : ""}>
                          <Input
                            value={dev.destination}
                            onChange={(e) =>
                              updateDevice(i, "destination", e.target.value)
                            }
                            placeholder="/dev/dri/card0"
                            className="font-mono"
                          />
                        </FormField>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDevice(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDevice}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Device
                    </Button>
                  </div>
                </Fieldset>

                {capabilities?.has_log_driver && (
                  <>
                    <FieldsetDivider />

                    <Fieldset
                      label="Logging"
                      description="VyOS 1.5+ only"
                    >
                      <FormField
                        label="Log Driver"
                        htmlFor="container-log-driver"
                      >
                        <Select
                          value={logDriver || "none-selected"}
                          onValueChange={(v) =>
                            setLogDriver(v === "none-selected" ? "" : v)
                          }
                        >
                          <SelectTrigger id="container-log-driver">
                            <SelectValue placeholder="Select log driver" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none-selected" disabled>
                              Select log driver
                            </SelectItem>
                            {LOG_DRIVERS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    </Fieldset>
                  </>
                )}

                {capabilities?.has_sysctl && (
                  <>
                    <FieldsetDivider />

                    <Fieldset
                      label="Sysctl Parameters"
                      description="Kernel parameter overrides for this container (VyOS 1.5+)"
                    >
                      {sysctls.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No sysctl parameters configured.
                        </p>
                      )}
                      <div className="space-y-2">
                        {sysctls.map((s, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"
                          >
                            <FormField label={i === 0 ? "Parameter" : ""}>
                              <Input
                                value={s.parameter}
                                onChange={(e) =>
                                  updateSysctl(i, "parameter", e.target.value)
                                }
                                placeholder="net.ipv4.ip_forward"
                                className="font-mono"
                              />
                            </FormField>
                            <FormField label={i === 0 ? "Value" : ""}>
                              <Input
                                value={s.value}
                                onChange={(e) =>
                                  updateSysctl(i, "value", e.target.value)
                                }
                                placeholder="1"
                                className="font-mono"
                              />
                            </FormField>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeSysctl(i)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSysctl}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Parameter
                        </Button>
                      </div>
                    </Fieldset>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
