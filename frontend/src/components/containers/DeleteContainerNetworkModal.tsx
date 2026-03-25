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
import { containerService } from "@/lib/api/container";
import { ApiError } from "@/lib/types/api";

interface DeleteContainerNetworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  networkName: string;
}

export function DeleteContainerNetworkModal({
  open,
  onOpenChange,
  onSuccess,
  networkName,
}: DeleteContainerNetworkModalProps) {
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
      await containerService.deleteNetwork(networkName);
      await containerService.refreshConfig();
      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to delete network");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            Delete Container Network
          </DialogTitle>
          <DialogDescription>
            This will remove the container network. Containers using this
            network may lose connectivity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-muted-foreground">Network to be deleted</p>
            <p className="font-mono text-sm font-medium text-foreground mt-0.5">
              {networkName}
            </p>
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
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Network"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
