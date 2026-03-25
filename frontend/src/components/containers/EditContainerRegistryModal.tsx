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
import { Fieldset, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Loader2 } from "lucide-react";
import { containerService } from "@/lib/api/container";
import type {
  ContainerCapabilities,
  ContainerRegistry,
  ContainerBatchOperation,
} from "@/lib/api/types/container";
import { ApiError } from "@/lib/types/api";

interface EditContainerRegistryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: ContainerCapabilities | null;
  registry: ContainerRegistry | null;
}

export function EditContainerRegistryModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities: _capabilities,
  registry,
}: EditContainerRegistryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [insecure, setInsecure] = useState(false);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (open && registry) {
      setUsername(registry.username || "");
      setPassword(""); // Never pre-fill password for security
      setInsecure(registry.insecure);
      setDisabled(registry.disabled);
      setError(null);
    }
  }, [open, registry]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!registry) return;

    setLoading(true);
    setError(null);

    try {
      const operations: ContainerBatchOperation[] = [];

      // Only send auth when both username and password are provided —
      // VyOS requires both fields together.
      if (username.trim() && password) {
        operations.push({
          op: "set_registry_auth",
          value: `${username.trim()},${password}`,
        });
      }

      // Always send the current insecure state so the user can toggle it.
      if (insecure !== registry.insecure) {
        if (insecure) {
          operations.push({ op: "set_registry_insecure" });
        } else {
          operations.push({ op: "delete_registry_insecure" });
        }
      }

      // Always send the current disabled state so the user can toggle it.
      if (disabled !== registry.disabled) {
        if (disabled) {
          operations.push({ op: "set_registry_disable" });
        } else {
          operations.push({ op: "delete_registry_disable" });
        }
      }

      await containerService.updateRegistry(registry.url, operations);
      await containerService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update registry");
    } finally {
      setLoading(false);
    }
  };

  if (!registry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Registry</DialogTitle>
          <DialogDescription>
            Update the configuration for this container registry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Fieldset>
            <FormField
              label="Registry URL"
              htmlFor="edit-registry-url"
              description="The registry URL cannot be changed after creation"
            >
              <Input
                id="edit-registry-url"
                value={registry.url}
                readOnly
                className="font-mono text-muted-foreground cursor-default"
              />
            </FormField>
          </Fieldset>

          <Fieldset label="Authentication">
            <FormField
              label="Username"
              htmlFor="edit-registry-username"
              description="Leave blank to keep the existing username unchanged"
            >
              <Input
                id="edit-registry-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Optional"
                autoComplete="username"
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="edit-registry-password"
              description="Only updated when both username and password are provided"
            >
              <Input
                id="edit-registry-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="(unchanged)"
                autoComplete="new-password"
              />
            </FormField>
          </Fieldset>

          <Fieldset label="Options">
            <FormField
              label="Insecure"
              htmlFor="edit-registry-insecure"
              description="Allow insecure connections (skip TLS verification)"
              horizontal
            >
              <Checkbox
                id="edit-registry-insecure"
                checked={insecure}
                onCheckedChange={(checked) => setInsecure(checked as boolean)}
              />
            </FormField>

            <FormField
              label="Disable"
              htmlFor="edit-registry-disabled"
              description="Disable this registry"
              horizontal
            >
              <Checkbox
                id="edit-registry-disabled"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked as boolean)}
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
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
