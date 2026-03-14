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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { vxlanService } from "@/lib/api/vxlan";
import type {
  VxlanInterface,
  VxlanCapabilities,
  BatchOperation,
} from "@/lib/api/types/vxlan";
import { Loader2, X, Plus, AlertTriangle } from "lucide-react";

interface VxlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vxlan?: VxlanInterface | null;
  capabilities: VxlanCapabilities | null;
  onSuccess: () => void;
  mode: "create" | "edit";
  availableInterfaces?: string[];
}

export function VxlanModal({
  open,
  onOpenChange,
  vxlan,
  capabilities,
  onSuccess,
  mode,
  availableInterfaces = [],
}: VxlanModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General
  const [interfaceName, setInterfaceName] = useState("");
  const [vni, setVni] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceInterface, setSourceInterface] = useState("");
  const [port, setPort] = useState("");

  // Peers
  const [remotes, setRemotes] = useState<string[]>([]);
  const [group, setGroup] = useState("");

  // Addresses
  const [addresses, setAddresses] = useState<string[]>([]);

  // Options
  const [gpe, setGpe] = useState(false);
  const [external, setExternal] = useState(false);
  const [nolearning, setNolearning] = useState(false);
  const [neighborSuppress, setNeighborSuppress] = useState(false);

  // Common
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Initialize form with vxlan data
  useEffect(() => {
    if (vxlan && mode === "edit") {
      setInterfaceName(vxlan.name);
      setVni(vxlan.vni || "");
      setSourceAddress(vxlan.source_address || "");
      setSourceInterface(vxlan.source_interface || "");
      setPort(vxlan.port || "");
      setRemotes(vxlan.remote && vxlan.remote.length > 0 ? [...vxlan.remote] : []);
      setGroup(vxlan.group || "");
      setAddresses(vxlan.addresses.length > 0 ? [...vxlan.addresses] : []);
      setGpe(vxlan.gpe || false);
      setExternal(vxlan.external || false);
      setNolearning(vxlan.parameters?.nolearning || false);
      setNeighborSuppress(vxlan.parameters?.neighbor_suppress || false);
      setDescription(vxlan.description || "");
      setMtu(vxlan.mtu || "");
      setVrf(vxlan.vrf || "");
      setDisabled(vxlan.disable || false);
    } else {
      resetForm();
    }
    setError(null);
  }, [vxlan, mode, open]);

  const resetForm = () => {
    setInterfaceName("");
    setVni("");
    setSourceAddress("");
    setSourceInterface("");
    setPort("");
    setRemotes([]);
    setGroup("");
    setAddresses([]);
    setGpe(false);
    setExternal(false);
    setNolearning(false);
    setNeighborSuppress(false);
    setDescription("");
    setMtu("");
    setVrf("");
    setDisabled(false);
    setError(null);
  };

  // --- Address helpers ---
  const handleAddAddress = () => {
    setAddresses([...addresses, ""]);
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const handleAddressChange = (index: number, value: string) => {
    const newAddresses = [...addresses];
    newAddresses[index] = value;
    setAddresses(newAddresses);
  };

  // --- Remote helpers ---
  const handleAddRemote = () => {
    setRemotes([...remotes, ""]);
  };

  const handleRemoveRemote = (index: number) => {
    setRemotes(remotes.filter((_, i) => i !== index));
  };

  const handleRemoteChange = (index: number, value: string) => {
    const newRemotes = [...remotes];
    newRemotes[index] = value;
    setRemotes(newRemotes);
  };

  // Determine mutual exclusion state
  const hasRemotes = remotes.some((r) => r.trim() !== "");
  const hasGroup = group.trim() !== "";

  const buildOperations = (): BatchOperation[] => {
    const operations: BatchOperation[] = [];

    if (mode === "edit" && !vxlan) return operations;

    // Helper to add operation if value changed
    const addIfChanged = (
      currentValue: string | boolean | undefined | null,
      newValue: string | boolean,
      setOp: string,
      deleteOp?: string
    ) => {
      const current = currentValue || "";
      const newVal = typeof newValue === "string" ? newValue.trim() : newValue;

      if (mode === "create") {
        if (typeof newValue === "string" && newValue.trim()) {
          operations.push({ op: setOp, value: newValue.trim() });
        } else if (typeof newValue === "boolean" && newValue) {
          operations.push({ op: setOp });
        }
      } else if (mode === "edit") {
        if (newVal !== current) {
          if (
            (typeof newVal === "string" && newVal) ||
            (typeof newVal === "boolean" && newVal)
          ) {
            operations.push({
              op: setOp,
              value: typeof newVal === "string" ? newVal : undefined,
            });
          } else if (deleteOp && current) {
            operations.push({ op: deleteOp });
          }
        }
      }
    };

    // --- VNI (create only, required) ---
    if (mode === "create" && vni.trim()) {
      operations.push({ op: "set_vni", value: vni.trim() });
    }

    // --- Source address ---
    addIfChanged(
      vxlan?.source_address,
      sourceAddress,
      "set_source_address",
      "delete_source_address"
    );

    // --- Source interface ---
    addIfChanged(
      vxlan?.source_interface,
      sourceInterface,
      "set_source_interface",
      "delete_source_interface"
    );

    // --- Port ---
    addIfChanged(vxlan?.port, port, "set_port", "delete_port");

    // --- Remotes (multi-value) ---
    const filteredRemotes = remotes.filter((r) => r.trim() !== "");
    const currentRemotes = new Set(vxlan?.remote || []);
    const newRemotesSet = new Set(filteredRemotes);

    if (mode === "create") {
      // In create mode, add each remote
      for (const remote of filteredRemotes) {
        operations.push({ op: "set_remote", value: remote.trim() });
      }
    } else if (mode === "edit") {
      // In edit mode, diff remotes: add new, delete removed
      for (const remote of newRemotesSet) {
        if (!currentRemotes.has(remote)) {
          operations.push({ op: "set_remote", value: remote.trim() });
        }
      }
      for (const remote of currentRemotes) {
        if (!newRemotesSet.has(remote)) {
          operations.push({ op: "delete_remote", value: remote });
        }
      }
    }

    // --- Group (mutually exclusive with remotes) ---
    if (mode === "create") {
      if (group.trim() && !hasRemotes) {
        operations.push({ op: "set_group", value: group.trim() });
      }
    } else if (mode === "edit") {
      const currentGroup = vxlan?.group || "";
      const newGroup = group.trim();

      // Switching from group to remotes: delete group first
      if (currentGroup && hasRemotes && !newGroup) {
        operations.push({ op: "delete_group" });
      }
      // Switching from remotes to group: group will be set, remotes already deleted above
      else if (newGroup !== currentGroup) {
        if (newGroup) {
          operations.push({ op: "set_group", value: newGroup });
        } else if (currentGroup) {
          operations.push({ op: "delete_group" });
        }
      }
    }

    // --- Addresses ---
    const currentAddrs = new Set(vxlan?.addresses || []);
    const newAddrs = new Set(addresses.filter((a) => a.trim() !== ""));
    for (const addr of newAddrs) {
      if (!currentAddrs.has(addr)) {
        operations.push({ op: "set_address", value: addr });
      }
    }
    if (mode === "edit") {
      for (const addr of currentAddrs) {
        if (!newAddrs.has(addr)) {
          operations.push({ op: "delete_address", value: addr });
        }
      }
    }

    // --- Common settings ---
    addIfChanged(
      vxlan?.description,
      description,
      "set_description",
      "delete_description"
    );
    addIfChanged(vxlan?.mtu, mtu, "set_mtu", "delete_mtu");
    addIfChanged(vxlan?.vrf, vrf, "set_vrf", "delete_vrf");

    // --- Disable/Enable ---
    if (mode === "edit" && disabled !== (vxlan?.disable || false)) {
      operations.push({ op: disabled ? "disable" : "enable" });
    } else if (mode === "create" && disabled) {
      operations.push({ op: "disable" });
    }

    // --- Options (boolean toggles) ---
    const handleBooleanOption = (
      current: boolean | null | undefined,
      newVal: boolean,
      setOp: string,
      deleteOp: string
    ) => {
      const currentBool = current || false;
      if (mode === "create") {
        if (newVal) {
          operations.push({ op: setOp });
        }
      } else if (mode === "edit") {
        if (newVal !== currentBool) {
          operations.push({ op: newVal ? setOp : deleteOp });
        }
      }
    };

    handleBooleanOption(vxlan?.gpe, gpe, "set_gpe", "delete_gpe");
    handleBooleanOption(
      vxlan?.external,
      external,
      "set_external",
      "delete_external"
    );
    handleBooleanOption(
      vxlan?.parameters?.nolearning,
      nolearning,
      "set_nolearning",
      "delete_nolearning"
    );
    handleBooleanOption(
      vxlan?.parameters?.neighbor_suppress,
      neighborSuppress,
      "set_neighbor_suppress",
      "delete_neighbor_suppress"
    );

    return operations;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate
      if (mode === "create") {
        if (!interfaceName.trim()) {
          throw new Error("Interface name is required");
        }
        if (!interfaceName.trim().startsWith("vxlan")) {
          throw new Error("VXLAN interface name must start with 'vxlan'");
        }
        if (!vni.trim()) {
          throw new Error("VNI is required for creating a VXLAN interface");
        }
        const vniNum = parseInt(vni.trim(), 10);
        if (isNaN(vniNum) || vniNum < 1 || vniNum > 16777215) {
          throw new Error("VNI must be between 1 and 16777215");
        }
      }

      const operations = buildOperations();

      if (mode === "edit" && operations.length === 0) {
        setError("No changes detected");
        setSubmitting(false);
        return;
      }

      await vxlanService.batchConfigure({
        interface: interfaceName.trim(),
        operations,
      });

      // Refresh config cache
      await vxlanService.refreshConfig();

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${mode} VXLAN interface`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {mode === "create"
              ? "Create VXLAN Interface"
              : `Edit VXLAN Interface: ${vxlan?.name}`}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {mode === "create"
              ? "Configure a new VXLAN interface"
              : "Modify the configuration of this VXLAN interface"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-zinc-900 border border-zinc-800">
              <TabsTrigger
                value="general"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="peers"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
              >
                Peers
              </TabsTrigger>
              <TabsTrigger
                value="addresses"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
              >
                Addresses
              </TabsTrigger>
              <TabsTrigger
                value="options"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
              >
                Options
              </TabsTrigger>
              <TabsTrigger
                value="common"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
              >
                Common
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              {mode === "create" && (
                <div className="space-y-2">
                  <Label htmlFor="vxlan-name" className="text-zinc-300">
                    Interface Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="vxlan-name"
                    placeholder="vxlan0"
                    value={interfaceName}
                    onChange={(e) => setInterfaceName(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                    required
                  />
                  <p className="text-xs text-zinc-500">
                    Must start with &quot;vxlan&quot; (e.g., vxlan0, vxlan100)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="vxlan-vni" className="text-zinc-300">
                  VNI (VXLAN Network Identifier){" "}
                  <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="vxlan-vni"
                  type="number"
                  placeholder="100"
                  min={1}
                  max={16777215}
                  value={vni}
                  onChange={(e) => setVni(e.target.value)}
                  disabled={mode === "edit"}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 disabled:opacity-50"
                />
                <p className="text-xs text-zinc-500">
                  Range: 1-16777215.{" "}
                  {mode === "edit" && "VNI cannot be changed after creation."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vxlan-primary-remote" className="text-zinc-300">
                  Remote
                </Label>
                <Input
                  id="vxlan-primary-remote"
                  placeholder="10.0.0.2"
                  value={remotes[0] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (remotes.length === 0) {
                      setRemotes(val ? [val] : []);
                    } else {
                      const updated = [...remotes];
                      updated[0] = val;
                      setRemotes(updated);
                    }
                  }}
                  disabled={hasGroup}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 disabled:opacity-40"
                />
                <p className="text-xs text-zinc-500">
                  Remote VTEP peer address. Add more in the Peers tab.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vxlan-source-address" className="text-zinc-300">
                    Source Address
                  </Label>
                  <Input
                    id="vxlan-source-address"
                    placeholder="10.0.0.1"
                    value={sourceAddress}
                    onChange={(e) => setSourceAddress(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  />
                  <p className="text-xs text-zinc-500">VTEP source IP address</p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="vxlan-source-interface"
                    className="text-zinc-300"
                  >
                    Source Interface
                  </Label>
                  <Select value={sourceInterface} onValueChange={setSourceInterface}>
                    <SelectTrigger id="vxlan-source-interface" className="bg-zinc-900 border-zinc-700 text-zinc-100">
                      <SelectValue placeholder="Select interface" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInterfaces.map((iface) => (
                        <SelectItem key={iface} value={iface}>
                          {iface}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500">
                    Interface to derive source address from
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vxlan-port" className="text-zinc-300">
                  Destination Port
                </Label>
                <Input
                  id="vxlan-port"
                  type="number"
                  placeholder="4789"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
                <p className="text-xs text-zinc-500">
                  Default: 4789 (IANA standard VXLAN port)
                </p>
              </div>
            </TabsContent>

            {/* Peers Tab */}
            <TabsContent value="peers" className="space-y-4 mt-4">
              {/* Remote Peers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">Remote VTEP Peers</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRemote}
                    disabled={hasGroup}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Remote
                  </Button>
                </div>

                {hasGroup && (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-400">
                      Remote peers are disabled when a multicast group is
                      configured. Clear the multicast group to use unicast
                      remotes.
                    </p>
                  </div>
                )}

                {remotes.length === 0 && !hasGroup && (
                  <p className="text-sm text-zinc-500 py-2">
                    No remote peers configured. Click &quot;Add Remote&quot; to
                    add a unicast VTEP peer.
                  </p>
                )}

                <div className="space-y-2">
                  {remotes.map((remote, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="10.0.0.2"
                        value={remote}
                        onChange={(e) =>
                          handleRemoteChange(index, e.target.value)
                        }
                        disabled={hasGroup}
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 disabled:opacity-40"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRemote(index)}
                        disabled={hasGroup}
                        className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-zinc-950 px-2 text-zinc-500">OR</span>
                </div>
              </div>

              {/* Multicast Group */}
              <div className="space-y-3">
                <Label htmlFor="vxlan-group" className="text-zinc-300">
                  Multicast Group
                </Label>

                {hasRemotes && (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-400">
                      Multicast group is disabled when remote peers are
                      configured. Remove all remotes to use multicast group
                      discovery.
                    </p>
                  </div>
                )}

                <Input
                  id="vxlan-group"
                  placeholder="239.1.1.1"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  disabled={hasRemotes}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 disabled:opacity-40"
                />
                <p className="text-xs text-zinc-500">
                  Multicast group address for BUM traffic flooding. Mutually
                  exclusive with unicast remote peers.
                </p>
              </div>
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">IP Addresses</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddAddress}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Address
                  </Button>
                </div>

                {addresses.length === 0 && (
                  <p className="text-sm text-zinc-500 py-2">
                    No addresses configured. Click &quot;Add Address&quot; to
                    assign an IP address.
                  </p>
                )}

                <div className="space-y-2">
                  {addresses.map((address, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="10.0.0.1/24 or 2001:db8::1/64"
                        value={address}
                        onChange={(e) =>
                          handleAddressChange(index, e.target.value)
                        }
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveAddress(index)}
                        className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Options Tab */}
            <TabsContent value="options" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-200">
                  VXLAN Options
                </h3>

                <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="vxlan-gpe"
                      checked={gpe}
                      onCheckedChange={(checked) => setGpe(checked as boolean)}
                    />
                    <div>
                      <Label
                        htmlFor="vxlan-gpe"
                        className="cursor-pointer text-zinc-200"
                      >
                        Generic Protocol Extension (GPE)
                      </Label>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Enable VXLAN-GPE for multi-protocol encapsulation
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="vxlan-external"
                      checked={external}
                      onCheckedChange={(checked) =>
                        setExternal(checked as boolean)
                      }
                    />
                    <div>
                      <Label
                        htmlFor="vxlan-external"
                        className="cursor-pointer text-zinc-200"
                      >
                        External Control Plane
                      </Label>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Use an external control plane (e.g., EVPN) for MAC
                        learning
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="vxlan-nolearning"
                      checked={nolearning}
                      onCheckedChange={(checked) =>
                        setNolearning(checked as boolean)
                      }
                    />
                    <div>
                      <Label
                        htmlFor="vxlan-nolearning"
                        className="cursor-pointer text-zinc-200"
                      >
                        Disable MAC Learning
                      </Label>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Disable source-address learning on this VXLAN interface
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="vxlan-neighbor-suppress"
                      checked={neighborSuppress}
                      onCheckedChange={(checked) =>
                        setNeighborSuppress(checked as boolean)
                      }
                    />
                    <div>
                      <Label
                        htmlFor="vxlan-neighbor-suppress"
                        className="cursor-pointer text-zinc-200"
                      >
                        Neighbor Suppress
                      </Label>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Enable ARP/ND neighbor suppression to reduce BUM traffic
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Common Tab */}
            <TabsContent value="common" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-description" className="text-zinc-300">
                  Description
                </Label>
                <Textarea
                  id="vxlan-description"
                  placeholder="VXLAN overlay for tenant network"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vxlan-mtu" className="text-zinc-300">
                    MTU
                  </Label>
                  <Input
                    id="vxlan-mtu"
                    type="number"
                    placeholder="1500"
                    value={mtu}
                    onChange={(e) => setMtu(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vxlan-vrf" className="text-zinc-300">
                    VRF
                  </Label>
                  <Input
                    id="vxlan-vrf"
                    placeholder="MGMT"
                    value={vrf}
                    onChange={(e) => setVrf(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                <Checkbox
                  id="vxlan-disable"
                  checked={disabled}
                  onCheckedChange={(checked) => setDisabled(checked as boolean)}
                />
                <Label
                  htmlFor="vxlan-disable"
                  className="cursor-pointer text-zinc-200"
                >
                  Administratively disable interface
                </Label>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t border-zinc-800 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "create" ? "Create Interface" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
