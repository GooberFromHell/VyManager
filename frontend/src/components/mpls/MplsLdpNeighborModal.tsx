"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fieldset, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Loader2 } from "lucide-react";
import { MplsLdpNeighbor } from "@/lib/api/mpls";

interface MplsLdpNeighborModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (neighbor: MplsLdpNeighbor) => Promise<void>;
  existingNeighbor: MplsLdpNeighbor | null;
}

export function MplsLdpNeighborModal({
  open,
  onOpenChange,
  onSubmit,
  existingNeighbor,
}: MplsLdpNeighborModalProps) {
  const isEditMode = existingNeighbor !== null;

  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [sessionHoldtime, setSessionHoldtime] = useState("");
  const [ttlSecurity, setTtlSecurity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAddress(existingNeighbor?.address ?? "");
      setPassword(existingNeighbor?.password ?? "");
      setSessionHoldtime(
        existingNeighbor?.session_holdtime != null
          ? String(existingNeighbor.session_holdtime)
          : ""
      );
      setTtlSecurity(existingNeighbor?.ttl_security ?? "");
      setError(null);
    }
  }, [open, existingNeighbor]);

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      setError("Peer address is required");
      return;
    }

    const holdtime = sessionHoldtime ? parseInt(sessionHoldtime, 10) : null;
    if (sessionHoldtime && (isNaN(holdtime!) || holdtime! < 0)) {
      setError("Session holdtime must be a non-negative number");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        address: address.trim(),
        password: password.trim() || null,
        session_holdtime: holdtime,
        ttl_security: ttlSecurity.trim() || null,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit LDP Neighbor" : "Add LDP Neighbor"}
          </DialogTitle>
        </DialogHeader>

        <Fieldset className="py-2">
          <FormField label="Peer IPv4 Address" htmlFor="ldp-neighbor-addr" required={!isEditMode}>
            {isEditMode ? (
              <p className="text-sm font-mono font-medium px-3 py-2 bg-muted rounded-md">
                {existingNeighbor?.address}
              </p>
            ) : (
              <Input
                id="ldp-neighbor-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 10.0.0.1"
              />
            )}
          </FormField>

          <FormField
            label="Password"
            htmlFor="ldp-neighbor-pw"
            description="MD5 authentication password for this LDP neighbor session"
          >
            <Input
              id="ldp-neighbor-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="MD5 authentication password (optional)"
            />
          </FormField>

          <FormField
            label="Session Holdtime (seconds)"
            htmlFor="ldp-neighbor-holdtime"
            description="Override the LDP session holdtime for this peer"
          >
            <Input
              id="ldp-neighbor-holdtime"
              type="number"
              min={0}
              value={sessionHoldtime}
              onChange={(e) => setSessionHoldtime(e.target.value)}
              placeholder="Default (optional)"
            />
          </FormField>

          <FormField
            label="TTL Security"
            htmlFor="ldp-neighbor-ttl"
            description={`GTSM TTL security hops (1–254) or "disable" to turn off`}
          >
            <Input
              id="ldp-neighbor-ttl"
              value={ttlSecurity}
              onChange={(e) => setTtlSecurity(e.target.value)}
              placeholder="1–254 or 'disable' (optional)"
            />
          </FormField>
        </Fieldset>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Adding..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Neighbor"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
