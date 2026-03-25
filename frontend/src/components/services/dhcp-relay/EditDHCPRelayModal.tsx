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
import { FormField } from "@/components/ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus, X } from "lucide-react";
import { dhcpRelayService } from "@/lib/api/dhcp-relay";
import type { DHCPRelayConfig, DHCPRelayCapabilities } from "@/lib/api/types/dhcp-relay";
import { ApiError } from "@/lib/types/api";

const RELAY_AGENTS_PACKETS_OPTIONS = ["append", "discard", "forward", "replace"];

interface EditDHCPRelayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: DHCPRelayConfig;
  capabilities: DHCPRelayCapabilities | null;
}

export function EditDHCPRelayModal({
  open,
  onOpenChange,
  onSuccess,
  config,
  capabilities,
}: EditDHCPRelayModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [servers, setServers] = useState<string[]>([]);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [hopCount, setHopCount] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [relayAgentsPackets, setRelayAgentsPackets] = useState("");
  const [listenAddresses, setListenAddresses] = useState<string[]>([]);

  useEffect(() => {
    if (open && config) {
      setServers(config.servers.length > 0 ? [...config.servers] : []);
      setInterfaces(config.interfaces.length > 0 ? [...config.interfaces] : []);
      setHopCount(config.relay_options.hop_count?.toString() || "");
      setMaxSize(config.relay_options.max_size?.toString() || "");
      setRelayAgentsPackets(config.relay_options.relay_agents_packets || "");
      setListenAddresses(config.listen_addresses.length > 0 ? [...config.listen_addresses] : []);
      setError(null);
    }
  }, [open, config]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  // Multi-value list helpers
  const addToList = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, ""]);
  };

  const removeFromList = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInList = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const renderMultiValueField = (
    label: string,
    values: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string,
    addLabel: string,
    description?: string
  ) => (
    <FormField label={label} description={description}>
      <div className="space-y-2">
        {values.length === 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addToList(setter)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {addLabel}
          </Button>
        ) : (
          <>
            {values.map((val, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={val}
                  onChange={(e) => updateInList(setter, index, e.target.value)}
                  placeholder={placeholder}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeFromList(setter, index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addToList(setter)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {addLabel}
            </Button>
          </>
        )}
      </div>
    </FormField>
  );

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const operations: { op: string; value?: string }[] = [];

      // Handle servers
      const currentServers = new Set(config.servers);
      const newServers = new Set(servers.map((s) => s.trim()).filter(Boolean));

      for (const server of newServers) {
        if (!currentServers.has(server)) {
          operations.push({ op: "set_server", value: server });
        }
      }
      for (const server of currentServers) {
        if (!newServers.has(server)) {
          operations.push({ op: "delete_server", value: server });
        }
      }

      // Handle interfaces
      const currentInterfaces = new Set(config.interfaces);
      const newInterfaces = new Set(interfaces.map((i) => i.trim()).filter(Boolean));

      for (const iface of newInterfaces) {
        if (!currentInterfaces.has(iface)) {
          operations.push({ op: "set_interface", value: iface });
        }
      }
      for (const iface of currentInterfaces) {
        if (!newInterfaces.has(iface)) {
          operations.push({ op: "delete_interface", value: iface });
        }
      }

      // Handle relay options - hop count
      const newHopCount = hopCount.trim();
      const oldHopCount = config.relay_options.hop_count?.toString() || "";
      if (newHopCount !== oldHopCount) {
        if (newHopCount) {
          operations.push({ op: "set_hop_count", value: newHopCount });
        } else {
          operations.push({ op: "delete_hop_count" });
        }
      }

      // Handle relay options - max size
      const newMaxSize = maxSize.trim();
      const oldMaxSize = config.relay_options.max_size?.toString() || "";
      if (newMaxSize !== oldMaxSize) {
        if (newMaxSize) {
          operations.push({ op: "set_max_size", value: newMaxSize });
        } else {
          operations.push({ op: "delete_max_size" });
        }
      }

      // Handle relay options - relay agents packets
      const newRelayAgentsPackets = relayAgentsPackets;
      const oldRelayAgentsPackets = config.relay_options.relay_agents_packets || "";
      if (newRelayAgentsPackets !== oldRelayAgentsPackets) {
        if (newRelayAgentsPackets) {
          operations.push({ op: "set_relay_agents_packets", value: newRelayAgentsPackets });
        } else {
          operations.push({ op: "delete_relay_agents_packets" });
        }
      }

      // Handle listen addresses
      if (capabilities?.has_listen_address) {
        const currentListenAddrs = new Set(config.listen_addresses);
        const newListenAddrs = new Set(listenAddresses.map((a) => a.trim()).filter(Boolean));

        for (const addr of newListenAddrs) {
          if (!currentListenAddrs.has(addr)) {
            operations.push({ op: "set_listen_address", value: addr });
          }
        }
        for (const addr of currentListenAddrs) {
          if (!newListenAddrs.has(addr)) {
            operations.push({ op: "delete_listen_address", value: addr });
          }
        }
      }

      if (operations.length > 0) {
        await dhcpRelayService.updateRelayOptions(operations);
        await dhcpRelayService.refreshConfig();
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update DHCP relay settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit DHCP Relay Settings</DialogTitle>
          <DialogDescription>
            Configure DHCP relay servers, interfaces, and relay options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {renderMultiValueField(
            "Relay Servers",
            servers,
            setServers,
            "e.g., 10.0.0.1",
            "Add Server",
            "Upstream DHCP server IP addresses to relay requests to"
          )}

          {renderMultiValueField(
            "Interfaces",
            interfaces,
            setInterfaces,
            "e.g., eth0",
            "Add Interface",
            "Interfaces to listen for DHCP requests on"
          )}

          <FormField
            label="Hop Count"
            htmlFor="hop-count"
            description="Maximum number of hops before discarding the relay packet"
          >
            <Input
              id="hop-count"
              type="number"
              min={0}
              value={hopCount}
              onChange={(e) => setHopCount(e.target.value)}
              placeholder="e.g., 10"
            />
          </FormField>

          <FormField
            label="Max Size"
            htmlFor="max-size"
            description="Maximum packet size for relayed DHCP messages (bytes)"
          >
            <Input
              id="max-size"
              type="number"
              min={0}
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              placeholder="e.g., 576"
            />
          </FormField>

          <FormField
            label="Relay Agents Packets"
            htmlFor="relay-agents-packets"
            description="Policy for handling relay agent information options"
          >
            <Select
              value={relayAgentsPackets || "placeholder"}
              onValueChange={(v) => setRelayAgentsPackets(v === "placeholder" ? "" : v)}
            >
              <SelectTrigger id="relay-agents-packets">
                <SelectValue placeholder="Select policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>
                  Select policy
                </SelectItem>
                {RELAY_AGENTS_PACKETS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {capabilities?.has_listen_address &&
            renderMultiValueField(
              "Listen Addresses",
              listenAddresses,
              setListenAddresses,
              "e.g., 0.0.0.0",
              "Add Listen Address",
              "IP addresses the DHCP relay agent listens on"
            )
          }

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
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
