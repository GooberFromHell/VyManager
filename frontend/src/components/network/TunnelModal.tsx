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
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { tunnelService } from "@/lib/api/tunnel";
import type {
  TunnelInterface,
  TunnelCapabilities,
  TunnelEncapsulation,
  BatchOperation,
} from "@/lib/api/types/tunnel";
import { Loader2, X } from "lucide-react";

interface TunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tunnel?: TunnelInterface | null;
  capabilities: TunnelCapabilities | null;
  onSuccess: () => void;
  mode: "create" | "edit";
  availableInterfaces?: string[];
}

export function TunnelModal({
  open,
  onOpenChange,
  tunnel,
  capabilities,
  onSuccess,
  mode,
  availableInterfaces = [],
}: TunnelModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General tab
  const [interfaceName, setInterfaceName] = useState("");
  const [encapsulation, setEncapsulation] = useState<TunnelEncapsulation | "">("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [remote, setRemote] = useState("");
  const [sourceInterface, setSourceInterface] = useState("");

  // Addresses tab
  const [addresses, setAddresses] = useState<string[]>([]);

  // Parameters tab
  const [ttl, setTtl] = useState("");
  const [tos, setTos] = useState("");
  const [greKey, setGreKey] = useState("");
  const [erspanDirection, setErspanDirection] = useState<"ingress" | "egress" | "">("");
  const [erspanIdx, setErspanIdx] = useState("");
  const [erspanVersion, setErspanVersion] = useState("");
  const [enableMulticast, setEnableMulticast] = useState(false);

  // Common tab
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Initialize form from tunnel prop in edit mode, reset in create mode
  useEffect(() => {
    if (tunnel && mode === "edit") {
      setInterfaceName(tunnel.name);
      setEncapsulation((tunnel.encapsulation as TunnelEncapsulation) || "");
      setSourceAddress(tunnel.source_address || "");
      setRemote(tunnel.remote || "");
      setSourceInterface(tunnel.source_interface || "");
      setAddresses(tunnel.addresses.length > 0 ? [...tunnel.addresses] : []);
      setDescription(tunnel.description || "");
      setMtu(tunnel.mtu || "");
      setVrf(tunnel.vrf || "");
      setDisabled(tunnel.disable || false);
      setEnableMulticast(tunnel.enable_multicast || false);

      // Parameters
      if (tunnel.parameters) {
        if (tunnel.parameters.ip) {
          setTtl(tunnel.parameters.ip.ttl || "");
          setTos(tunnel.parameters.ip.tos || "");
          setGreKey(tunnel.parameters.ip.key || "");
        }
        if (tunnel.parameters.erspan) {
          setErspanDirection(
            (tunnel.parameters.erspan.direction as "ingress" | "egress") || ""
          );
          setErspanIdx(tunnel.parameters.erspan.idx || "");
          setErspanVersion(tunnel.parameters.erspan.version || "");
        }
      }
    } else {
      resetForm();
    }
    setError(null);
  }, [tunnel, mode, open]);

  const resetForm = () => {
    setInterfaceName("");
    setEncapsulation("");
    setSourceAddress("");
    setRemote("");
    setSourceInterface("");
    setAddresses([]);
    setDescription("");
    setMtu("");
    setVrf("");
    setDisabled(false);
    setTtl("");
    setTos("");
    setGreKey("");
    setErspanDirection("");
    setErspanIdx("");
    setErspanVersion("");
    setEnableMulticast(false);
    setError(null);
  };

  // Address list handlers
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

  const buildOperations = (): BatchOperation[] => {
    const operations: BatchOperation[] = [];

    if (mode === "edit" && !tunnel) return operations;

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

    // Encapsulation (create mode only — cannot change encapsulation after creation)
    if (mode === "create" && encapsulation) {
      operations.push({ op: "set_encapsulation", value: encapsulation });
    }

    // Tunnel-specific fields
    addIfChanged(
      tunnel?.source_address,
      sourceAddress,
      "set_source_address",
      "delete_source_address"
    );
    addIfChanged(tunnel?.remote, remote, "set_remote", "delete_remote");
    addIfChanged(
      tunnel?.source_interface,
      sourceInterface,
      "set_source_interface",
      "delete_source_interface"
    );

    // Addresses
    const currentAddrs = new Set(tunnel?.addresses || []);
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

    // Parameters: IP
    addIfChanged(
      tunnel?.parameters?.ip?.ttl,
      ttl,
      "set_parameters_ip_ttl",
      "delete_parameters_ip_ttl"
    );
    addIfChanged(
      tunnel?.parameters?.ip?.tos,
      tos,
      "set_parameters_ip_tos",
      "delete_parameters_ip_tos"
    );
    addIfChanged(
      tunnel?.parameters?.ip?.key,
      greKey,
      "set_parameters_ip_key",
      "delete_parameters_ip_key"
    );

    // Parameters: ERSPAN
    addIfChanged(
      tunnel?.parameters?.erspan?.direction,
      erspanDirection,
      "set_erspan_direction"
    );
    addIfChanged(
      tunnel?.parameters?.erspan?.idx,
      erspanIdx,
      "set_erspan_idx"
    );
    addIfChanged(
      tunnel?.parameters?.erspan?.version,
      erspanVersion,
      "set_erspan_version"
    );

    // Enable multicast
    if (mode === "edit" && enableMulticast !== (tunnel?.enable_multicast || false)) {
      operations.push({
        op: enableMulticast ? "set_enable_multicast" : "delete_enable_multicast",
      });
    } else if (mode === "create" && enableMulticast) {
      operations.push({ op: "set_enable_multicast" });
    }

    // Common settings
    addIfChanged(
      tunnel?.description,
      description,
      "set_description",
      "delete_description"
    );
    addIfChanged(tunnel?.mtu, mtu, "set_mtu", "delete_mtu");
    addIfChanged(tunnel?.vrf, vrf, "set_vrf", "delete_vrf");

    // Disable/Enable
    if (mode === "edit" && disabled !== (tunnel?.disable || false)) {
      operations.push({ op: disabled ? "disable" : "enable" });
    } else if (mode === "create" && disabled) {
      operations.push({ op: "disable" });
    }

    return operations;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "create") {
        if (!interfaceName.trim()) {
          throw new Error("Interface name is required");
        }
        if (!encapsulation) {
          throw new Error("Encapsulation type is required");
        }
      }

      const operations = buildOperations();

      if (mode === "edit" && operations.length === 0) {
        setError("No changes detected");
        setSubmitting(false);
        return;
      }

      if (mode === "create") {
        await tunnelService.createInterface(interfaceName.trim(), operations);
      } else {
        await tunnelService.updateInterface(tunnel!.name, operations);
      }

      // Refresh config cache
      await tunnelService.refreshConfig();

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${mode} tunnel interface`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Create Tunnel Interface"
              : `Edit Tunnel Interface: ${tunnel?.name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Configure a new tunnel interface (GRE, GRETAP, IPIP, SIT, or ERSPAN)"
              : "Modify the configuration of this tunnel interface"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="common">Common</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
              <Fieldset label="Identity">
                {mode === "create" ? (
                  <FormField label="Interface Name" htmlFor="tunnel-name" description="Use the format tun0, tun1, etc." required>
                    <Input
                      id="tunnel-name"
                      placeholder="tun0"
                      value={interfaceName}
                      onChange={(e) => setInterfaceName(e.target.value)}
                      required
                    />
                  </FormField>
                ) : (
                  <FormField label="Interface Name" htmlFor="tunnel-name">
                    <Input
                      id="tunnel-name"
                      value={interfaceName}
                      disabled
                      className="font-mono bg-muted/50"
                    />
                  </FormField>
                )}

                {mode === "create" ? (
                  <FormField label="Encapsulation" htmlFor="encapsulation" required>
                    <Select
                      value={encapsulation || "placeholder"}
                      onValueChange={(v) =>
                        setEncapsulation(
                          v === "placeholder" ? "" : (v as TunnelEncapsulation)
                        )
                      }
                    >
                      <SelectTrigger id="encapsulation">
                        <SelectValue placeholder="Select encapsulation type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>
                          Select encapsulation type
                        </SelectItem>
                        {(
                          capabilities?.encapsulation_types || [
                            "gre",
                            "gretap",
                            "ipip",
                            "sit",
                            "erspan",
                          ]
                        ).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                ) : (
                  <FormField label="Encapsulation" htmlFor="encapsulation">
                    <Input
                      id="encapsulation"
                      value={encapsulation ? encapsulation.toUpperCase() : "N/A"}
                      disabled
                      className="font-mono bg-muted/50"
                    />
                  </FormField>
                )}
              </Fieldset>

              <FieldsetDivider />

              <Fieldset label="Endpoints">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Source Address" htmlFor="source-address">
                    <Input
                      id="source-address"
                      placeholder="192.168.1.1"
                      value={sourceAddress}
                      onChange={(e) => setSourceAddress(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Remote" htmlFor="remote">
                    <Input
                      id="remote"
                      placeholder="10.0.0.2"
                      value={remote}
                      onChange={(e) => setRemote(e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField label="Source Interface" htmlFor="source-interface" description="Physical interface to use as the tunnel source">
                  <Select value={sourceInterface} onValueChange={setSourceInterface}>
                    <SelectTrigger id="source-interface">
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
                </FormField>
              </Fieldset>
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses" className="space-y-4">
              <Fieldset label="IP Addresses">
                <FormField label="Addresses">
                  <div className="space-y-2">
                    {addresses.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No addresses configured. Click &quot;Add Address&quot; to add one.
                      </p>
                    )}
                    {addresses.map((address, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="10.0.0.1/30 or 2001:db8::1/64"
                          value={address}
                          onChange={(e) => handleAddressChange(index, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAddress(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddAddress}
                    >
                      Add Address
                    </Button>
                  </div>
                </FormField>
              </Fieldset>
            </TabsContent>

            {/* Parameters Tab */}
            <TabsContent value="parameters" className="space-y-4">
              <Fieldset label="IP Parameters">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="TTL" htmlFor="ttl">
                    <Input
                      id="ttl"
                      type="number"
                      placeholder="64"
                      value={ttl}
                      onChange={(e) => setTtl(e.target.value)}
                    />
                  </FormField>
                  <FormField label="TOS" htmlFor="tos" description={'Type of Service value or "inherit"'}>
                    <Input
                      id="tos"
                      placeholder="inherit"
                      value={tos}
                      onChange={(e) => setTos(e.target.value)}
                    />
                  </FormField>
                </div>
              </Fieldset>

              {/* GRE Key — only visible for gre/gretap */}
              {(encapsulation === "gre" || encapsulation === "gretap") && (
                <>
                  <FieldsetDivider />
                  <Fieldset label="GRE Settings">
                    <FormField label="GRE Key" htmlFor="gre-key" description="GRE key for tunnel identification">
                      <Input
                        id="gre-key"
                        placeholder="0"
                        value={greKey}
                        onChange={(e) => setGreKey(e.target.value)}
                      />
                    </FormField>
                  </Fieldset>
                </>
              )}

              {/* ERSPAN fields — only visible for erspan */}
              {encapsulation === "erspan" && (
                <>
                  <FieldsetDivider />
                  <Fieldset label="ERSPAN Settings">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Direction" htmlFor="erspan-direction">
                        <Select
                          value={erspanDirection || "placeholder"}
                          onValueChange={(v) =>
                            setErspanDirection(
                              v === "placeholder"
                                ? ""
                                : (v as "ingress" | "egress")
                            )
                          }
                        >
                          <SelectTrigger id="erspan-direction">
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="placeholder" disabled>
                              Select direction
                            </SelectItem>
                            <SelectItem value="ingress">Ingress</SelectItem>
                            <SelectItem value="egress">Egress</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Version" htmlFor="erspan-version">
                        <Select
                          value={erspanVersion || "placeholder"}
                          onValueChange={(v) =>
                            setErspanVersion(v === "placeholder" ? "" : v)
                          }
                        >
                          <SelectTrigger id="erspan-version">
                            <SelectValue placeholder="Select version" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="placeholder" disabled>
                              Select version
                            </SelectItem>
                            <SelectItem value="1">Version 1</SelectItem>
                            <SelectItem value="2">Version 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>
                    <FormField label="Index" htmlFor="erspan-idx">
                      <Input
                        id="erspan-idx"
                        type="number"
                        placeholder="1"
                        value={erspanIdx}
                        onChange={(e) => setErspanIdx(e.target.value)}
                      />
                    </FormField>
                  </Fieldset>
                </>
              )}

              <FieldsetDivider />

              <Fieldset label="Multicast">
                <FormField label="Enable multicast on this tunnel" htmlFor="enable-multicast" horizontal>
                  <Checkbox
                    id="enable-multicast"
                    checked={enableMulticast}
                    onCheckedChange={(checked) =>
                      setEnableMulticast(checked as boolean)
                    }
                  />
                </FormField>
              </Fieldset>
            </TabsContent>

            {/* Common Tab */}
            <TabsContent value="common" className="space-y-4">
              <Fieldset label="General">
                <FormField label="Description" htmlFor="description">
                  <Textarea
                    id="description"
                    placeholder="GRE tunnel to datacenter"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </FormField>
              </Fieldset>

              <FieldsetDivider />

              <Fieldset label="Interface Settings">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="MTU" htmlFor="mtu">
                    <Input
                      id="mtu"
                      type="number"
                      placeholder="1476"
                      value={mtu}
                      onChange={(e) => setMtu(e.target.value)}
                    />
                  </FormField>
                  <FormField label="VRF" htmlFor="vrf">
                    <Input
                      id="vrf"
                      placeholder="MGMT"
                      value={vrf}
                      onChange={(e) => setVrf(e.target.value)}
                    />
                  </FormField>
                </div>
              </Fieldset>

              <FieldsetDivider />

              <Fieldset>
                <FormField label="Administratively Disable Interface" htmlFor="disable" horizontal>
                  <Checkbox
                    id="disable"
                    checked={disabled}
                    onCheckedChange={(checked) => setDisabled(checked as boolean)}
                  />
                </FormField>
              </Fieldset>
            </TabsContent>
          </Tabs>

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
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Interface" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
