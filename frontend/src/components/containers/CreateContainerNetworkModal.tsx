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
import { Checkbox } from "@/components/ui/checkbox";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Plus, X } from "lucide-react";
import { containerService } from "@/lib/api/container";
import type { ContainerCapabilities, ContainerBatchOperation } from "@/lib/api/types/container";
import { ApiError } from "@/lib/types/api";

interface CreateContainerNetworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: ContainerCapabilities | null;
  existingNames?: string[];
}

export function CreateContainerNetworkModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingNames,
}: CreateContainerNetworkModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [prefixes, setPrefixes] = useState<string[]>([""]);
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [noNameServer, setNoNameServer] = useState(false);

  const resetForm = () => {
    setName("");
    setPrefixes([""]);
    setDescription("");
    setMtu("");
    setVrf("");
    setNoNameServer(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Network name is required");
      return;
    }
    if (existingNames?.includes(trimmedName)) {
      setError("A network with this name already exists");
      return;
    }
    const validPrefixes = prefixes.filter((p) => p.trim());
    if (validPrefixes.length === 0) {
      setError("At least one prefix is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const operations: ContainerBatchOperation[] = [];

      for (const prefix of validPrefixes) {
        operations.push({ op: "set_network_prefix", value: prefix.trim() });
      }
      if (description.trim()) {
        operations.push({ op: "set_network_description", value: description.trim() });
      }
      if (mtu) {
        operations.push({ op: "set_network_mtu", value: String(mtu) });
      }
      if (vrf.trim()) {
        operations.push({ op: "set_network_vrf", value: vrf.trim() });
      }
      if (noNameServer && capabilities?.has_network_no_name_server) {
        operations.push({ op: "set_network_no_name_server" });
      }

      await containerService.createNetwork(trimmedName, operations);
      await containerService.refreshConfig();
      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create network");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Container Network</DialogTitle>
          <DialogDescription>
            Add a new container network to the configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Fieldset>
            <FormField
              label="Network Name"
              htmlFor="network-name"
              description="Unique name for this container network"
              required
            >
              <Input
                id="network-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., my-network"
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
            {loading ? "Creating..." : "Create Network"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
