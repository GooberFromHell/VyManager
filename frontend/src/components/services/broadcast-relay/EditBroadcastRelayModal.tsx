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
import { broadcastRelayService } from "@/lib/api/broadcast-relay";
import type {
  BroadcastRelayInstance,
  BroadcastRelayCapabilities,
} from "@/lib/api/types/broadcast-relay";
import { ApiError } from "@/lib/types/api";

interface EditBroadcastRelayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  relay: BroadcastRelayInstance | null;
  capabilities: BroadcastRelayCapabilities | null;
}

export function EditBroadcastRelayModal({
  open,
  onOpenChange,
  onSuccess,
  relay,
  capabilities,
}: EditBroadcastRelayModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [port, setPort] = useState("");
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (open && relay) {
      setDescription(relay.description ?? "");
      setInterfaces(relay.interfaces.length > 0 ? [...relay.interfaces] : [""]);
      setAddress(relay.address ?? "");
      setPort(relay.port ?? "");
      setDisabled(relay.disabled);
      setError(null);
    }
  }, [open, relay]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
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
    if (!relay) return;
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const operations: { op: string; value?: string }[] = [];

      // Description delta
      const newDescription = description.trim();
      const oldDescription = relay.description ?? "";
      if (newDescription !== oldDescription) {
        if (newDescription) {
          operations.push({ op: "set_description", value: newDescription });
        } else {
          operations.push({ op: "delete_description" });
        }
      }

      // Interfaces delta
      const newInterfaces = interfaces.map((i) => i.trim()).filter(Boolean);
      const oldInterfaces = relay.interfaces;

      for (const iface of oldInterfaces) {
        if (!newInterfaces.includes(iface)) {
          operations.push({ op: "delete_interface", value: iface });
        }
      }
      for (const iface of newInterfaces) {
        if (!oldInterfaces.includes(iface)) {
          operations.push({ op: "set_interface", value: iface });
        }
      }

      // Address delta
      const newAddress = address.trim();
      const oldAddress = relay.address ?? "";
      if (newAddress !== oldAddress) {
        if (newAddress) {
          operations.push({ op: "set_address", value: newAddress });
        } else {
          operations.push({ op: "delete_address" });
        }
      }

      // Port delta
      const newPort = port.trim();
      const oldPort = relay.port ?? "";
      if (newPort !== oldPort) {
        if (newPort) {
          operations.push({ op: "set_port", value: newPort });
        } else {
          operations.push({ op: "delete_port" });
        }
      }

      // Disabled delta
      if (disabled !== relay.disabled) {
        if (disabled) {
          operations.push({ op: "set_disable" });
        } else {
          operations.push({ op: "delete_disable" });
        }
      }

      if (operations.length > 0) {
        await broadcastRelayService.updateRelay(relay.id, operations);
        await broadcastRelayService.refreshConfig();
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to update broadcast relay instance"
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

  if (!relay) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Broadcast Relay Instance</DialogTitle>
          <DialogDescription>
            Update configuration for relay instance {relay.id}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Fieldset label="Basic Info">
            <FormField label="Relay ID">
              <p className="text-sm font-mono text-muted-foreground">
                {relay.id}
              </p>
            </FormField>

            {capabilities?.fields.description.supported && (
              <FormField
                label="Description"
                htmlFor="edit-description"
                description="Optional description for this relay instance"
              >
                <Input
                  id="edit-description"
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
                      {interfaces.length === 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addInterface}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Interface
                        </Button>
                      ) : (
                        <>
                          {interfaces.map((iface, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={iface}
                                onChange={(e) =>
                                  updateInterface(index, e.target.value)
                                }
                                placeholder="e.g., eth0"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeInterface(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
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
                        </>
                      )}
                    </div>
                  </FormField>
                )}

                {capabilities?.fields.address.supported && (
                  <FormField
                    label="Broadcast Address"
                    htmlFor="edit-address"
                    description="Destination broadcast address for relayed packets (optional)"
                  >
                    <Input
                      id="edit-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g., 255.255.255.255"
                    />
                  </FormField>
                )}

                {capabilities?.fields.port.supported && (
                  <FormField
                    label="Port"
                    htmlFor="edit-port"
                    description="UDP port number to relay (1–65535, optional)"
                  >
                    <Input
                      id="edit-port"
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

          {capabilities?.fields.disable.supported && (
            <>
              <FieldsetDivider />
              <Fieldset label="Options">
                <FormField
                  label="Disabled"
                  htmlFor="edit-disabled"
                  description="Disable this relay instance without removing it"
                  horizontal
                >
                  <Checkbox
                    id="edit-disabled"
                    checked={disabled}
                    onCheckedChange={(checked) => setDisabled(checked as boolean)}
                  />
                </FormField>
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
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
