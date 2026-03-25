"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Fieldset, FormField } from "@/components/ui/fieldset";
import { wireguardService, WireGuardInterface } from "@/lib/api/wireguard";
import { ApiError } from "@/lib/types/api";

interface CreatePeerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: WireGuardInterface | null;
}

export function CreatePeerModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: CreatePeerModalProps) {
  // Form state
  const [name, setName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [allowedIps, setAllowedIps] = useState("");
  const [presharedKey, setPresharedKey] = useState("");
  const [address, setAddress] = useState("");
  const [port, setPort] = useState("");
  const [persistentKeepalive, setPersistentKeepalive] = useState("");
  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [hostName, setHostName] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPresharedKey, setShowPresharedKey] = useState(false);

  // Generate preshared key
  const handleGeneratePSK = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await wireguardService.generatePSK();
      if (result.preshared_key) {
        setPresharedKey(result.preshared_key);
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to generate preshared key");
    } finally {
      setGenerating(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setName("");
    setPublicKey("");
    setAllowedIps("");
    setPresharedKey("");
    setAddress("");
    setPort("");
    setPersistentKeepalive("");
    setDescription("");
    setDisabled(false);
    setHostName("");
    setError(null);
    setShowPresharedKey(false);
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!name.trim()) {
      return "Peer name is required";
    }
    if (/\s/.test(name.trim())) {
      return "Peer name cannot contain spaces";
    }
    if (!publicKey.trim()) {
      return "Public key is required";
    }
    if (!allowedIps.trim()) {
      return "At least one allowed IP is required";
    }
    // Check if peer name already exists
    if (interfaceData?.peers.some((p) => p.name === name.trim())) {
      return `Peer '${name}' already exists on this interface`;
    }
    return null;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!interfaceData) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config: {
        name: string;
        public_key: string;
        allowed_ips: string[];
        preshared_key?: string;
        address?: string;
        port?: string;
        persistent_keepalive?: string;
        description?: string;
        disabled?: boolean;
        host_name?: string;
      } = {
        name: name.trim(),
        public_key: publicKey.trim(),
        allowed_ips: allowedIps
          .split(",")
          .map((ip) => ip.trim())
          .filter(Boolean),
      };

      if (presharedKey.trim()) {
        config.preshared_key = presharedKey.trim();
      }

      if (address.trim()) {
        config.address = address.trim();
      }

      if (port.trim()) {
        config.port = port.trim();
      }

      if (persistentKeepalive.trim()) {
        config.persistent_keepalive = persistentKeepalive.trim();
      }

      if (description.trim()) {
        config.description = description.trim();
      }

      if (disabled) {
        config.disabled = true;
      }

      if (hostName.trim()) {
        config.host_name = hostName.trim();
      }

      const result = await wireguardService.createPeer(
        interfaceData.name,
        config
      );

      if (result.success) {
        handleClose();
        onSuccess();
      } else {
        setError(result.error || "Failed to add peer");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to add peer");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Peer to {interfaceData.name}
          </DialogTitle>
          <DialogDescription>
            Configure a new WireGuard peer connection.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="endpoint">Endpoint</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <Fieldset>
              <FormField
                label="Peer Name"
                htmlFor="peer-name"
                description="A friendly name to identify this peer (no spaces)."
              >
                <Input
                  id="peer-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-laptop"
                />
              </FormField>

              <FormField
                label="Description"
                htmlFor="peer-description"
                description="A description to help identify this peer."
              >
                <Input
                  id="peer-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="John's laptop for remote work"
                />
              </FormField>

              <FormField
                label="Public Key"
                htmlFor="peer-public-key"
                description="The peer's WireGuard public key. Get this from the peer device."
              >
                <Input
                  id="peer-public-key"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="Base64 encoded public key from peer"
                  className="font-mono text-sm"
                />
              </FormField>

              <FormField
                label="Allowed IPs"
                htmlFor="peer-allowed-ips"
                description="Comma-separated IPs/networks this peer can route. Use x.x.x.x/32 for single client or 0.0.0.0/0 for all traffic."
              >
                <Input
                  id="peer-allowed-ips"
                  value={allowedIps}
                  onChange={(e) => setAllowedIps(e.target.value)}
                  placeholder="10.0.0.2/32, 192.168.1.0/24"
                />
              </FormField>

              <FormField
                label="Preshared Key"
                htmlFor="peer-psk"
                description="Adds an extra layer of symmetric encryption for post-quantum security."
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="peer-psk"
                      type={showPresharedKey ? "text" : "password"}
                      value={presharedKey}
                      onChange={(e) => setPresharedKey(e.target.value)}
                      placeholder="Optional additional encryption"
                      className="pr-10 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPresharedKey(!showPresharedKey)}
                    >
                      {showPresharedKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGeneratePSK}
                    disabled={generating}
                    className="gap-2"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate
                  </Button>
                </div>
              </FormField>
            </Fieldset>
          </TabsContent>

          <TabsContent value="endpoint" className="space-y-4 mt-4">
            <div className="rounded-lg bg-muted/50 border p-3">
              <p className="text-sm text-muted-foreground">
                Endpoint settings are for connecting to peers that act as servers.
                Leave these empty if this peer will connect to your VyOS device.
              </p>
            </div>

            <Fieldset>
              <FormField
                label="Endpoint IP Address"
                htmlFor="peer-address"
                description="IP address of the remote peer. Use this OR hostname below."
              >
                <Input
                  id="peer-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="203.0.113.1"
                />
              </FormField>

              <FormField
                label="Endpoint Hostname"
                htmlFor="peer-hostname"
                description="Hostname of the remote peer. Use this OR IP address above."
              >
                <Input
                  id="peer-hostname"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="vpn.example.com"
                />
              </FormField>

              <FormField
                label="Endpoint Port"
                htmlFor="peer-port"
                description="UDP port on the remote peer. Default: 51820"
              >
                <Input
                  id="peer-port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="51820"
                />
              </FormField>

              <FormField
                label="Persistent Keepalive (seconds)"
                htmlFor="peer-keepalive"
                description="Send keepalive packets every N seconds. Useful for NAT traversal (typically 25 seconds)."
              >
                <Input
                  id="peer-keepalive"
                  type="number"
                  value={persistentKeepalive}
                  onChange={(e) => setPersistentKeepalive(e.target.value)}
                  placeholder="25"
                />
              </FormField>

              <FormField
                label="Disable Peer"
                htmlFor="peer-disabled"
                description="Create the peer in a disabled state."
                horizontal
              >
                <Checkbox
                  id="peer-disabled"
                  checked={disabled}
                  onCheckedChange={(checked) => setDisabled(checked === true)}
                />
              </FormField>
            </Fieldset>
          </TabsContent>
        </Tabs>

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
                Adding...
              </>
            ) : (
              "Add Peer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
