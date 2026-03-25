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
import { Fieldset, FormField } from "@/components/ui/fieldset";
import { AlertCircle } from "lucide-react";
import { conntrackSyncService } from "@/lib/api/conntrack-sync";
import { ApiError } from "@/lib/types/api";

interface AddConntrackSyncInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingInterfaces: string[];
}

export function AddConntrackSyncInterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
}: AddConntrackSyncInterfaceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ifaceName, setIfaceName] = useState("");
  const [port, setPort] = useState("");

  const resetForm = () => {
    setIfaceName("");
    setPort("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    const trimmedName = ifaceName.trim();

    if (!trimmedName) {
      setError("Interface name is required");
      return false;
    }

    if (existingInterfaces.includes(trimmedName)) {
      setError(`Interface "${trimmedName}" is already configured`);
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
      const trimmedName = ifaceName.trim();
      const trimmedPort = port.trim();

      const operations = trimmedPort
        ? [{ op: "set_interface_port", value: trimmedPort }]
        : [{ op: "set_interface" }];

      await conntrackSyncService.addInterface(trimmedName, operations);
      await conntrackSyncService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to add Conntrack Sync interface"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Interface</DialogTitle>
          <DialogDescription>
            Add a network interface for Conntrack Sync communication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Fieldset>
            <FormField
              label="Interface Name"
              htmlFor="iface-name"
              description="Network interface used for conntrack state synchronization"
              required
            >
              <Input
                id="iface-name"
                value={ifaceName}
                onChange={(e) => setIfaceName(e.target.value)}
                placeholder="e.g. eth1"
              />
            </FormField>

            <FormField
              label="Port"
              htmlFor="iface-port"
              description="UDP port for conntrack sync traffic (1–65535)"
            >
              <Input
                id="iface-port"
                type="number"
                min={1}
                max={65535}
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="e.g. 3780"
              />
            </FormField>
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
            {loading ? "Adding..." : "Add Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
