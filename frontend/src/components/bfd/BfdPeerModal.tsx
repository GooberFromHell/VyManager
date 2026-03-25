"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type { BfdPeer, BfdCapabilities } from "@/lib/api/bfd";

interface BfdPeerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (peer: BfdPeer) => Promise<void>;
  existingPeer?: BfdPeer | null;
  profiles: string[];
  capabilities?: BfdCapabilities | null;
}

export function BfdPeerModal({
  open,
  onOpenChange,
  onSubmit,
  existingPeer,
  profiles,
  capabilities,
}: BfdPeerModalProps) {
  const isEditMode = !!existingPeer;

  // Form state
  const [address, setAddress] = useState("");
  const [shutdown, setShutdown] = useState(false);
  const [passive, setPassive] = useState(false);
  const [echoMode, setEchoMode] = useState(false);
  const [multihop, setMultihop] = useState(false);
  const [transmit, setTransmit] = useState("");
  const [receive, setReceive] = useState("");
  const [echoInterval, setEchoInterval] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [profile, setProfile] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceInterface, setSourceInterface] = useState("");
  const [minimumTtl, setMinimumTtl] = useState("");
  const [vrf, setVrf] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing or when modal opens
  useEffect(() => {
    if (open) {
      if (existingPeer) {
        setAddress(existingPeer.address);
        setShutdown(existingPeer.shutdown);
        setPassive(existingPeer.passive);
        setEchoMode(existingPeer.echo_mode);
        setMultihop(existingPeer.multihop);
        setTransmit(
          existingPeer.interval.transmit != null
            ? String(existingPeer.interval.transmit)
            : ""
        );
        setReceive(
          existingPeer.interval.receive != null
            ? String(existingPeer.interval.receive)
            : ""
        );
        setEchoInterval(
          existingPeer.interval.echo_interval != null
            ? String(existingPeer.interval.echo_interval)
            : ""
        );
        setMultiplier(
          existingPeer.interval.multiplier != null
            ? String(existingPeer.interval.multiplier)
            : ""
        );
        setProfile(existingPeer.profile || "");
        setSourceAddress(existingPeer.source.address || "");
        setSourceInterface(existingPeer.source.interface || "");
        setMinimumTtl(
          existingPeer.minimum_ttl != null
            ? String(existingPeer.minimum_ttl)
            : ""
        );
        setVrf(existingPeer.vrf || "");
      } else {
        resetForm();
      }
    }
  }, [open, existingPeer]);

  const resetForm = () => {
    setAddress("");
    setShutdown(false);
    setPassive(false);
    setEchoMode(false);
    setMultihop(false);
    setTransmit("");
    setReceive("");
    setEchoInterval("");
    setMultiplier("");
    setProfile("");
    setSourceAddress("");
    setSourceInterface("");
    setMinimumTtl("");
    setVrf("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!address.trim()) {
      return "Peer address is required";
    }

    if (!address.includes(".") && !address.includes(":")) {
      return "Peer address must be a valid IPv4 or IPv6 address";
    }

    if (transmit.trim()) {
      const val = parseInt(transmit.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return "Transmit interval must be between 10 and 60000 ms";
      }
    }

    if (receive.trim()) {
      const val = parseInt(receive.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return "Receive interval must be between 10 and 60000 ms";
      }
    }

    if (echoInterval.trim()) {
      const val = parseInt(echoInterval.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return "Echo interval must be between 10 and 60000 ms";
      }
    }

    if (multiplier.trim()) {
      const val = parseInt(multiplier.trim(), 10);
      if (isNaN(val) || val < 2 || val > 255) {
        return "Multiplier must be between 2 and 255";
      }
    }

    if (minimumTtl.trim()) {
      const val = parseInt(minimumTtl.trim(), 10);
      if (isNaN(val) || val < 1 || val > 254) {
        return "Minimum TTL must be between 1 and 254";
      }
      if (!multihop) {
        return "Multihop must be enabled when minimum TTL is set";
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const peer: BfdPeer = {
        address: address.trim(),
        echo_mode: echoMode,
        interval: {
          echo_interval: echoInterval.trim()
            ? parseInt(echoInterval.trim(), 10)
            : null,
          multiplier: multiplier.trim()
            ? parseInt(multiplier.trim(), 10)
            : null,
          receive: receive.trim() ? parseInt(receive.trim(), 10) : null,
          transmit: transmit.trim() ? parseInt(transmit.trim(), 10) : null,
        },
        minimum_ttl: minimumTtl.trim()
          ? parseInt(minimumTtl.trim(), 10)
          : null,
        multihop,
        passive,
        profile: profile && profile !== "__none__" ? profile : null,
        shutdown,
        source: {
          address: sourceAddress.trim() || null,
          interface: sourceInterface.trim() || null,
        },
        vrf: vrf.trim() || null,
      };

      await onSubmit(peer);
      handleClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit BFD Peer" : "Add BFD Peer"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify the BFD peer configuration for ${existingPeer?.address}.`
              : "Configure a new BFD peer for bidirectional forwarding detection."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 pb-2">
            {/* Peer Address */}
            <Fieldset>
              <FormField
                label="Peer Address"
                htmlFor="bfd-peer-address"
                description="IPv4 or IPv6 address of the BFD peer."
              >
                <Input
                  id="bfd-peer-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 192.0.2.1 or 2001:db8::1"
                  disabled={isEditMode}
                  className={isEditMode ? "bg-muted" : ""}
                />
              </FormField>
            </Fieldset>

            <FieldsetDivider />

            {/* Status & Mode Section */}
            <Fieldset label="Status & Mode">
              <FormField
                label="Shutdown"
                htmlFor="bfd-peer-shutdown"
                description="Administratively disable this BFD peer."
                horizontal
              >
                <Checkbox
                  id="bfd-peer-shutdown"
                  checked={shutdown}
                  onCheckedChange={(checked) =>
                    setShutdown(checked === true)
                  }
                />
              </FormField>

              <FormField
                label="Passive Mode"
                htmlFor="bfd-peer-passive"
                description="Wait for the remote peer to initiate the BFD session."
                horizontal
              >
                <Checkbox
                  id="bfd-peer-passive"
                  checked={passive}
                  onCheckedChange={(checked) =>
                    setPassive(checked === true)
                  }
                />
              </FormField>

              <FormField
                label="Echo Mode"
                htmlFor="bfd-peer-echo-mode"
                description="Enable BFD echo mode for faster failure detection."
                horizontal
              >
                <Checkbox
                  id="bfd-peer-echo-mode"
                  checked={echoMode}
                  onCheckedChange={(checked) =>
                    setEchoMode(checked === true)
                  }
                />
              </FormField>

              <FormField
                label="Multihop"
                htmlFor="bfd-peer-multihop"
                description="Enable multihop BFD session (required for minimum TTL)."
                horizontal
              >
                <Checkbox
                  id="bfd-peer-multihop"
                  checked={multihop}
                  onCheckedChange={(checked) =>
                    setMultihop(checked === true)
                  }
                />
              </FormField>
            </Fieldset>

            <FieldsetDivider />

            {/* Timer Intervals Section */}
            <Fieldset label="Timer Intervals">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Transmit Interval (ms)" htmlFor="bfd-peer-transmit">
                  <Input
                    id="bfd-peer-transmit"
                    type="number"
                    value={transmit}
                    onChange={(e) => setTransmit(e.target.value)}
                    placeholder="300"
                    min={10}
                    max={60000}
                  />
                </FormField>

                <FormField label="Receive Interval (ms)" htmlFor="bfd-peer-receive">
                  <Input
                    id="bfd-peer-receive"
                    type="number"
                    value={receive}
                    onChange={(e) => setReceive(e.target.value)}
                    placeholder="300"
                    min={10}
                    max={60000}
                  />
                </FormField>

                <FormField label="Echo Interval (ms)" htmlFor="bfd-peer-echo-interval">
                  <Input
                    id="bfd-peer-echo-interval"
                    type="number"
                    value={echoInterval}
                    onChange={(e) => setEchoInterval(e.target.value)}
                    placeholder="10-60000"
                    min={10}
                    max={60000}
                  />
                </FormField>

                <FormField label="Multiplier" htmlFor="bfd-peer-multiplier">
                  <Input
                    id="bfd-peer-multiplier"
                    type="number"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                    placeholder="3"
                    min={2}
                    max={255}
                  />
                </FormField>
              </div>
            </Fieldset>

            <FieldsetDivider />

            {/* Advanced Section */}
            <Fieldset label="Advanced">
              <FormField
                label="Profile"
                htmlFor="bfd-peer-profile"
                description="Apply a BFD profile to this peer."
              >
                <Select value={profile} onValueChange={setProfile}>
                  <SelectTrigger id="bfd-peer-profile">
                    <SelectValue placeholder="Select profile (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Source Address"
                htmlFor="bfd-peer-source-address"
                description="Source IP address for BFD packets."
              >
                <Input
                  id="bfd-peer-source-address"
                  value={sourceAddress}
                  onChange={(e) => setSourceAddress(e.target.value)}
                  placeholder="e.g. 192.0.2.10"
                />
              </FormField>

              <FormField
                label="Source Interface"
                htmlFor="bfd-peer-source-interface"
                description="Source interface for BFD packets."
              >
                <Input
                  id="bfd-peer-source-interface"
                  value={sourceInterface}
                  onChange={(e) => setSourceInterface(e.target.value)}
                  placeholder="e.g. eth0"
                />
              </FormField>

              {multihop && (
                <FormField
                  label="Minimum TTL"
                  htmlFor="bfd-peer-minimum-ttl"
                  description="Minimum TTL for incoming BFD multihop packets (1-254)."
                >
                  <Input
                    id="bfd-peer-minimum-ttl"
                    type="number"
                    value={minimumTtl}
                    onChange={(e) => setMinimumTtl(e.target.value)}
                    placeholder="1-254"
                    min={1}
                    max={254}
                  />
                </FormField>
              )}

              <FormField
                label="VRF"
                htmlFor="bfd-peer-vrf"
                description="VRF instance for this BFD peer."
              >
                <Input
                  id="bfd-peer-vrf"
                  value={vrf}
                  onChange={(e) => setVrf(e.target.value)}
                  placeholder="e.g. my-vrf"
                />
              </FormField>
            </Fieldset>
          </div>
        </ScrollArea>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
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
                {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Peer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
