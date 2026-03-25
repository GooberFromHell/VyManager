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
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Plus, X } from "lucide-react";
import { broadcastRelayService } from "@/lib/api/broadcast-relay";
import type { BroadcastRelayCapabilities } from "@/lib/api/types/broadcast-relay";
import { ApiError } from "@/lib/types/api";

interface CreateBroadcastRelayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: BroadcastRelayCapabilities | null;
  existingIds: string[];
}

export function CreateBroadcastRelayModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingIds,
}: CreateBroadcastRelayModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [relayId, setRelayId] = useState("");
  const [description, setDescription] = useState("");
  const [interfaces, setInterfaces] = useState<string[]>([""]);
  const [address, setAddress] = useState("");
  const [port, setPort] = useState("");

  const resetForm = () => {
    setRelayId("");
    setDescription("");
    setInterfaces([""]);
    setAddress("");
    setPort("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    const trimmedId = relayId.trim();

    if (!trimmedId) {
      setError("Relay ID is required");
      return false;
    }

    const idNum = parseInt(trimmedId, 10);
    if (isNaN(idNum) || idNum < 1 || idNum > 99 || String(idNum) !== trimmedId) {
      setError("Relay ID must be a number between 1 and 99");
      return false;
    }

    if (existingIds.includes(trimmedId)) {
      setError(`Relay ID ${trimmedId} already exists`);
      return false;
    }

    if (port.trim()) {
      const portNum = parseInt(port.trim(), 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        setError("Port must be a number between 1 and 65535");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const operations: { op: string; value?: string }[] = [];

      const trimmedDescription = description.trim();
      if (trimmedDescription && capabilities?.fields.description.supported) {
        operations.push({ op: "set_description", value: trimmedDescription });
      }

      const validInterfaces = interfaces.map((i) => i.trim()).filter(Boolean);
      if (capabilities?.fields.interface.supported) {
        for (const iface of validInterfaces) {
          operations.push({ op: "set_interface", value: iface });
        }
      }

      const trimmedAddress = address.trim();
      if (trimmedAddress && capabilities?.fields.address.supported) {
        operations.push({ op: "set_address", value: trimmedAddress });
      }

      const trimmedPort = port.trim();
      if (trimmedPort && capabilities?.fields.port.supported) {
        operations.push({ op: "set_port", value: trimmedPort });
      }

      await broadcastRelayService.createRelay(relayId.trim(), operations);
      await broadcastRelayService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to create broadcast relay instance"
      );
    } finally {
      setLoading(false);
    }
  };

  const addInterface = () => setInterfaces([...interfaces, ""]);
  const updateInterface = (index: number, value: string) => {
    const updated = [...interfaces];
    updated[index] = value;
    setInterfaces(updated);
  };
  const removeInterface = (index: number) => {
    setInterfaces(interfaces.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Broadcast Relay Instance</DialogTitle>
          <DialogDescription>
            Add a new broadcast relay instance to forward UDP broadcast packets
            between interfaces.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Fieldset label="Basic Info">
            <FormField
              label="Relay ID"
              htmlFor="relayId"
              description="Numeric identifier for the relay instance (1–99)"
              required
            >
              <Input
                id="relayId"
                value={relayId}
                onChange={(e) => setRelayId(e.target.value)}
                placeholder="e.g., 1"
                type="number"
                min={1}
                max={99}
              />
            </FormField>

            {capabilities?.fields.description.supported && (
              <FormField
                label="Description"
                htmlFor="description"
                description="Optional description for this relay instance"
              >
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Office broadcast relay"
                />
              </FormField>
            )}
          </Fieldset>

          {(capabilities?.fields.interface.supported ||
            capabilities?.fields.address.supported ||
            capabilities?.fields.port.supported) && (
            <>
              <FieldsetDivider />
              <Fieldset label="Network Configuration">
                {capabilities?.fields.interface.supported && (
                  <FormField
                    label="Interfaces"
                    description="Network interfaces to relay broadcast packets between"
                  >
                    <div className="space-y-2">
                      {interfaces.map((iface, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={iface}
                            onChange={(e) => updateInterface(index, e.target.value)}
                            placeholder="e.g., eth0"
                          />
                          {interfaces.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeInterface(index)}
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
                        onClick={addInterface}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Interface
                      </Button>
                    </div>
                  </FormField>
                )}

                {capabilities?.fields.address.supported && (
                  <FormField
                    label="Broadcast Address"
                    htmlFor="address"
                    description="Destination broadcast address for relayed packets (optional)"
                  >
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g., 255.255.255.255"
                    />
                  </FormField>
                )}

                {capabilities?.fields.port.supported && (
                  <FormField
                    label="Port"
                    htmlFor="port"
                    description="UDP port number to relay (1–65535, optional)"
                  >
                    <Input
                      id="port"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="e.g., 9"
                      type="number"
                      min={1}
                      max={65535}
                    />
                  </FormField>
                )}
              </Fieldset>
            </>
          )}

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
            {loading ? "Creating..." : "Create Relay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
