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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { ntpService } from "@/lib/api/ntp";
import type { NTPCapabilities } from "@/lib/api/types/ntp";
import { ApiError } from "@/lib/types/api";

interface CreateNTPServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: NTPCapabilities | null;
  existingServers: string[];
}

export function CreateNTPServerModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingServers,
}: CreateNTPServerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [pool, setPool] = useState(false);
  const [prefer, setPrefer] = useState(false);
  const [noselect, setNoselect] = useState(false);

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

  const validateForm = (): boolean => {
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Server address is required");
      return false;
    }

    if (existingServers.includes(trimmed)) {
      setError("This server address already exists");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const operations = [{ op: "set_server" }];

      if (pool && capabilities?.fields.pool.supported) {
        operations.push({ op: "set_pool" });
      }
      if (prefer && capabilities?.fields.prefer.supported) {
        operations.push({ op: "set_prefer" });
      }
      if (noselect && capabilities?.fields.noselect.supported) {
        operations.push({ op: "set_noselect" });
      }

      await ntpService.createItem(address.trim(), operations);
      await ntpService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to add NTP server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add NTP Server</DialogTitle>
          <DialogDescription>
            Add a new NTP server to the configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="address" className="required">
              Server Address
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 0.pool.ntp.org or 10.0.0.1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Hostname or IP address of the NTP server
            </p>
          </div>

          {capabilities?.fields.pool.supported && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="pool"
                checked={pool}
                onCheckedChange={(checked) => setPool(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="pool" className="cursor-pointer">
                  Pool
                </Label>
                <p className="text-xs text-muted-foreground">
                  Treat this address as a pool of multiple NTP servers
                </p>
              </div>
            </div>
          )}

          {capabilities?.fields.prefer.supported && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="prefer"
                checked={prefer}
                onCheckedChange={(checked) => setPrefer(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="prefer" className="cursor-pointer">
                  Prefer
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mark this server as preferred for time synchronization
                </p>
              </div>
            </div>
          )}

          {capabilities?.fields.noselect.supported && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="noselect"
                checked={noselect}
                onCheckedChange={(checked) => setNoselect(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="noselect" className="cursor-pointer">
                  Noselect
                </Label>
                <p className="text-xs text-muted-foreground">
                  Query this server but do not use it for time synchronization
                </p>
              </div>
            </div>
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
            {loading ? "Adding..." : "Add Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
