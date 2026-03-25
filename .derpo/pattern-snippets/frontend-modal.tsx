// Canonical Frontend Modal/Component Pattern
// Source: frontend/src/components/services/ntp/CreateNTPServerModal.tsx
// Used by DERPO agents as the reference implementation for new feature modals.

"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Fieldset } from "@/components/ui/fieldset";
import { ntpService } from "@/lib/api/ntp";
import type { NTPCapabilities } from "@/lib/api/types/ntp";

// --- Props Interface Pattern ---
interface CreateNTPServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: NTPCapabilities | null;
  existingServers: string[];  // Feature-specific additional props
}

export function CreateNTPServerModal({
  open, onOpenChange, onSuccess, capabilities, existingServers,
}: CreateNTPServerModalProps) {

  // --- State Pattern ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [pool, setPool] = useState(false);
  const [prefer, setPrefer] = useState(false);
  const [noselect, setNoselect] = useState(false);

  // --- Reset/Close Pattern ---
  const resetForm = () => {
    setAddress("");
    setPool(false);
    setPrefer(false);
    setNoselect(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // --- Validation Pattern ---
  const validateForm = (): boolean => {
    if (!address.trim()) {
      setError("Server address is required");
      return false;
    }
    if (existingServers.includes(address.trim())) {
      setError("Server already exists");
      return false;
    }
    return true;
  };

  // --- Submit Pattern ---
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError(null);

    try {
      // Build operations array (capability-aware)
      const operations = [{ op: "set_server" }];
      if (pool && capabilities?.fields?.pool?.supported) {
        operations.push({ op: "set_server_pool" });
      }
      if (prefer) operations.push({ op: "set_server_prefer" });
      if (noselect) operations.push({ op: "set_server_noselect" });

      await ntpService.createItem(address.trim(), operations);
      await ntpService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as Error).message || "Failed to create NTP server");
    } finally {
      setLoading(false);
    }
  };

  // --- Render Pattern ---
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add NTP Server</DialogTitle>
          <DialogDescription>Add a new NTP server to the configuration.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Main input fieldset */}
          <Fieldset legend="Server">
            <Input
              placeholder="e.g., pool.ntp.org"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Fieldset>

          {/* Conditional options (capability-aware) */}
          <Fieldset legend="Options">
            {capabilities?.fields?.pool?.supported && (
              <div className="flex items-center gap-2">
                <Checkbox checked={pool} onCheckedChange={(c) => setPool(!!c)} />
                <span>Pool</span>
              </div>
            )}
            {/* More options... */}
          </Fieldset>

          {/* Error display */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
