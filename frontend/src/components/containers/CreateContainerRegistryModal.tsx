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
import { Fieldset, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Loader2 } from "lucide-react";
import { containerService } from "@/lib/api/container";
import type {
  ContainerCapabilities,
  ContainerBatchOperation,
} from "@/lib/api/types/container";
import { ApiError } from "@/lib/types/api";

interface CreateContainerRegistryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: ContainerCapabilities | null;
  existingUrls?: string[];
}

export function CreateContainerRegistryModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities: _capabilities,
  existingUrls,
}: CreateContainerRegistryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [insecure, setInsecure] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const resetForm = () => {
    setUrl("");
    setUsername("");
    setPassword("");
    setInsecure(false);
    setDisabled(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Registry URL is required");
      return false;
    }

    if (existingUrls?.includes(trimmed)) {
      setError("This registry is already configured");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const operations: ContainerBatchOperation[] = [];

      if (username.trim() && password) {
        operations.push({
          op: "set_registry_auth",
          value: `${username.trim()},${password}`,
        });
      }

      if (insecure) {
        operations.push({ op: "set_registry_insecure" });
      }

      if (disabled) {
        operations.push({ op: "set_registry_disable" });
      }

      await containerService.createRegistry(url.trim(), operations);
      await containerService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create registry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Container Registry</DialogTitle>
          <DialogDescription>
            Add a new container registry to pull images from.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Fieldset>
            <FormField
              label="Registry URL"
              htmlFor="registry-url"
              description="Hostname of the registry, e.g. docker.io or registry.example.com"
              required
            >
              <Input
                id="registry-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="docker.io"
                autoComplete="off"
                spellCheck={false}
              />
            </FormField>
          </Fieldset>

          <Fieldset label="Authentication">
            <FormField
              label="Username"
              htmlFor="registry-username"
              description="Leave blank to use an unauthenticated registry"
            >
              <Input
                id="registry-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Optional"
                autoComplete="username"
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="registry-password"
              description="Required when a username is provided"
            >
              <Input
                id="registry-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optional"
                autoComplete="new-password"
              />
            </FormField>
          </Fieldset>

          <Fieldset label="Options">
            <FormField
              label="Insecure"
              htmlFor="registry-insecure"
              description="Allow insecure connections (skip TLS verification)"
              horizontal
            >
              <Checkbox
                id="registry-insecure"
                checked={insecure}
                onCheckedChange={(checked) => setInsecure(checked as boolean)}
              />
            </FormField>

            <FormField
              label="Disable"
              htmlFor="registry-disabled"
              description="Disable this registry"
              horizontal
            >
              <Checkbox
                id="registry-disabled"
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
            {loading ? "Adding..." : "Add Registry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
