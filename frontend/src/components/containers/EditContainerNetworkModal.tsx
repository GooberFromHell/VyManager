"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Plus, X } from "lucide-react";
import { containerService } from "@/lib/api/container";
import type {
  ContainerNetwork,
  ContainerCapabilities,
  ContainerBatchOperation,
} from "@/lib/api/types/container";
import { ApiError } from "@/lib/types/api";

interface EditContainerNetworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: ContainerCapabilities | null;
  network: ContainerNetwork | null;
}

export function EditContainerNetworkModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  network,
}: EditContainerNetworkModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prefixes, setPrefixes] = useState<string[]>([""]);
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [noNameServer, setNoNameServer] = useState(false);

  useEffect(() => {
    if (open && network) {
      setPrefixes(network.prefixes.length > 0 ? [...network.prefixes] : [""]);
      setDescription(network.description || "");
      setMtu(network.mtu ? String(network.mtu) : "");
      setVrf(network.vrf || "");
      setNoNameServer(network.no_name_server);
      setError(null);
    }
  }, [open, network]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const addPrefix = () => setPrefixes([...prefixes, ""]);
  const removePrefix = (index: number) =>
    setPrefixes(prefixes.filter((_, i) => i !== index));
  const updatePrefix = (index: number, value: string) => {
    const updated = [...prefixes];
    updated[index] = value;
    setPrefixes(updated);
  };

  const handleSubmit = async () => {
    if (!network) return;

    const validPrefixes = prefixes.map((p) => p.trim()).filter(Boolean);
    if (validPrefixes.length === 0) {
      setError("At least one prefix is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const operations: ContainerBatchOperation[] = [];

      // Diff prefixes
      const oldPrefixes = new Set(network.prefixes);
      const newPrefixes = new Set(validPrefixes);
      for (const p of newPrefixes) {
        if (!oldPrefixes.has(p)) {
          operations.push({ op: "set_network_prefix", value: p });
        }
      }
      for (const p of oldPrefixes) {
        if (!newPrefixes.has(p)) {
          operations.push({ op: "delete_network_prefix", value: p });
        }
      }

      // Diff description
      const newDescription = description.trim();
      const oldDescription = network.description || "";
      if (newDescription !== oldDescription) {
        if (newDescription) {
          operations.push({ op: "set_network_description", value: newDescription });
        } else {
          operations.push({ op: "delete_network_description" });
        }
      }

      // Diff MTU
      const newMtu = mtu.trim();
      const oldMtu = network.mtu ? String(network.mtu) : "";
      if (newMtu !== oldMtu) {
        if (newMtu) {
          operations.push({ op: "set_network_mtu", value: newMtu });
        } else {
          operations.push({ op: "delete_network_mtu" });
        }
      }

      // Diff VRF
      const newVrf = vrf.trim();
      const oldVrf = network.vrf || "";
      if (newVrf !== oldVrf) {
        if (newVrf) {
          operations.push({ op: "set_network_vrf", value: newVrf });
        } else {
          operations.push({ op: "delete_network_vrf" });
        }
      }

      // Diff no_name_server (only when capability is present)
      if (capabilities?.has_network_no_name_server) {
        if (noNameServer !== network.no_name_server) {
          if (noNameServer) {
            operations.push({ op: "set_network_no_name_server" });
          } else {
            operations.push({ op: "delete_network_no_name_server" });
          }
        }
      }

      if (operations.length > 0) {
        await containerService.updateNetwork(network.name, operations);
        await containerService.refreshConfig();
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update network");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Network</DialogTitle>
          <DialogDescription>
            Update the configuration for container network{" "}
            <span className="font-mono text-foreground">{network?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Fieldset>
            <FormField
              label="Network Name"
              htmlFor="network-name-readonly"
              description="Network names cannot be changed after creation"
            >
              <Input
                id="network-name-readonly"
                value={network?.name ?? ""}
                readOnly
                className="opacity-60 cursor-not-allowed"
              />
            </FormField>
          </Fieldset>

          <FieldsetDivider />

          <Fieldset label="Prefixes">
            <FormField
              label="Network Prefixes"
              description="IP prefixes assigned to this network (CIDR notation)"
              required
            >
              <div className="space-y-2">
                {prefixes.map((prefix, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={prefix}
                      onChange={(e) => updatePrefix(index, e.target.value)}
                      placeholder="172.20.0.0/24"
                    />
                    {prefixes.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removePrefix(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPrefix}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prefix
                </Button>
              </div>
            </FormField>
          </Fieldset>

          <FieldsetDivider />

          <Fieldset label="Optional Settings">
            <FormField
              label="Description"
              htmlFor="network-description"
              description="Human-readable description for this network"
            >
              <Input
                id="network-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Backend services network"
              />
            </FormField>

            <FormField
              label="MTU"
              htmlFor="network-mtu"
              description="Maximum transmission unit size in bytes"
            >
              <Input
                id="network-mtu"
                type="number"
                value={mtu}
                onChange={(e) => setMtu(e.target.value)}
                placeholder="1500"
              />
            </FormField>

            <FormField
              label="VRF"
              htmlFor="network-vrf"
              description="VRF instance for this container network"
            >
              <Input
                id="network-vrf"
                value={vrf}
                onChange={(e) => setVrf(e.target.value)}
                placeholder="e.g., mgmt"
              />
            </FormField>

            {capabilities?.has_network_no_name_server && (
              <FormField
                label="No Name Server"
                htmlFor="network-no-name-server"
                description="Disable automatic DNS name server assignment for this network"
                horizontal
              >
                <Checkbox
                  id="network-no-name-server"
                  checked={noNameServer}
                  onCheckedChange={(checked) =>
                    setNoNameServer(checked as boolean)
                  }
                />
              </FormField>
            )}
          </Fieldset>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
