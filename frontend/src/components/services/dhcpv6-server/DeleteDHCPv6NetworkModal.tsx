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
import { AlertCircle, AlertTriangle } from "lucide-react";
import { dhcpv6ServerService } from "@/lib/api/dhcpv6-server";
import { ApiError } from "@/lib/types/api";

interface DeleteDHCPv6NetworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  networkName: string;
}

export function DeleteDHCPv6NetworkModal({
  open,
  onOpenChange,
  onSuccess,
  networkName,
}: DeleteDHCPv6NetworkModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await dhcpv6ServerService.deleteSharedNetwork(networkName);
      await dhcpv6ServerService.refreshConfig();
      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to delete shared network"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Shared Network
          </DialogTitle>
          <DialogDescription>
            This will permanently delete the shared network and all its subnets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                You are about to delete:
              </p>
              <div className="space-y-1 text-muted-foreground">
                <p>
                  <span className="font-medium">Network:</span> {networkName}
                </p>
              </div>
            </div>
          </div>

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
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
