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
import { dnsForwardingService } from "@/lib/api/dns-forwarding";
import { ApiError } from "@/lib/types/api";

interface DeleteDNSForwardingDomainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  domainName: string;
}

export function DeleteDNSForwardingDomainModal({
  open,
  onOpenChange,
  onSuccess,
  domainName,
}: DeleteDNSForwardingDomainModalProps) {
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
      await dnsForwardingService.deleteDomain(domainName);
      await dnsForwardingService.refreshConfig();
      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to delete domain forwarding rule"
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
            Delete Domain Forwarding Rule
          </DialogTitle>
          <DialogDescription>
            This will permanently delete the domain forwarding configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                You are about to delete:
              </p>
              <div className="text-muted-foreground">
                <p>
                  <span className="font-medium">Domain:</span> {domainName}
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
