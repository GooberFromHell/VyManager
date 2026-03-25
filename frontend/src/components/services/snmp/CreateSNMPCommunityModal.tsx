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
import { FormField } from "@/components/ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus, X } from "lucide-react";
import { snmpService } from "@/lib/api/snmp";
import type { SNMPCapabilities } from "@/lib/api/types/snmp";
import { ApiError } from "@/lib/types/api";

const isValidIPv4 = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  if (!match) return false;
  return match.slice(1).every((octet) => {
    const num = parseInt(octet);
    return num >= 0 && num <= 255;
  });
};

const isValidIPv6 = (ip: string): boolean => {
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip) || ip === "::";
};

const isValidIP = (ip: string): boolean => {
  return isValidIPv4(ip) || isValidIPv6(ip);
};

const isValidCIDR = (cidr: string): boolean => {
  const parts = cidr.split("/");
  if (parts.length !== 2) return false;
  const [ip, prefix] = parts;
  const prefixNum = parseInt(prefix);
  if (isValidIPv4(ip)) {
    return prefixNum >= 0 && prefixNum <= 32;
  }
  if (isValidIPv6(ip)) {
    return prefixNum >= 0 && prefixNum <= 128;
  }
  return false;
};

interface CreateSNMPCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: SNMPCapabilities | null;
  existingCommunities: string[];
}

export function CreateSNMPCommunityModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingCommunities,
}: CreateSNMPCommunityModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [communityName, setCommunityName] = useState("");
  const [authorization, setAuthorization] = useState("ro");
  const [clients, setClients] = useState<string[]>([""]);
  const [networks, setNetworks] = useState<string[]>([""]);

  const resetForm = () => {
    setCommunityName("");
    setAuthorization("ro");
    setClients([""]);
    setNetworks([""]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    if (!communityName.trim()) {
      setError("Community name is required");
      return false;
    }
    if (existingCommunities.includes(communityName.trim())) {
      setError("A community with this name already exists");
      return false;
    }

    const validClients = clients.filter((c) => c.trim());
    for (const client of validClients) {
      if (!isValidIP(client.trim())) {
        setError(`Invalid client IP address: ${client}`);
        return false;
      }
    }

    const validNetworks = networks.filter((n) => n.trim());
    for (const network of validNetworks) {
      if (!isValidCIDR(network.trim())) {
        setError(`Invalid network CIDR: ${network}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const operations: { op: string; value?: string }[] = [];

      operations.push({ op: "set_community" });

      if (authorization) {
        operations.push({ op: "set_authorization", value: authorization });
      }

      const validClients = clients
        .filter((c) => c.trim())
        .map((c) => c.trim());
      for (const client of validClients) {
        operations.push({ op: "set_client", value: client });
      }

      const validNetworks = networks
        .filter((n) => n.trim())
        .map((n) => n.trim());
      for (const network of validNetworks) {
        operations.push({ op: "set_network", value: network });
      }

      await snmpService.createCommunity(communityName.trim(), operations);
      await snmpService.refreshConfig();
      onSuccess();
      handleClose();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to create SNMP community"
      );
    } finally {
      setLoading(false);
    }
  };

  const addClient = () => setClients([...clients, ""]);
  const updateClient = (index: number, value: string) => {
    const updated = [...clients];
    updated[index] = value;
    setClients(updated);
  };
  const removeClient = (index: number) => {
    setClients(clients.filter((_, i) => i !== index));
  };

  const addNetwork = () => setNetworks([...networks, ""]);
  const updateNetwork = (index: number, value: string) => {
    const updated = [...networks];
    updated[index] = value;
    setNetworks(updated);
  };
  const removeNetwork = (index: number) => {
    setNetworks(networks.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add SNMP Community</DialogTitle>
          <DialogDescription>
            Create a new SNMP community with access controls
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            label="Community Name"
            htmlFor="communityName"
            required
            description="Name of the SNMP community string"
          >
            <Input
              id="communityName"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              placeholder="e.g., public"
            />
          </FormField>

          <FormField
            label="Authorization"
            htmlFor="authorization"
            description="Access level for this community"
          >
            <Select value={authorization} onValueChange={setAuthorization}>
              <SelectTrigger id="authorization">
                <SelectValue placeholder="Select authorization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ro">Read-Only (ro)</SelectItem>
                <SelectItem value="rw">Read-Write (rw)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Client IPs" description="Restrict access to specific client IP addresses (optional)">
            <div className="space-y-2">
              {clients.map((client, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={client}
                    onChange={(e) => updateClient(index, e.target.value)}
                    placeholder="e.g., 10.0.0.100"
                  />
                  {clients.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeClient(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addClient}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
          </FormField>

          <FormField label="Networks" description="Restrict access to specific networks in CIDR notation (optional)">
            <div className="space-y-2">
              {networks.map((network, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={network}
                    onChange={(e) => updateNetwork(index, e.target.value)}
                    placeholder="e.g., 10.0.0.0/24"
                  />
                  {networks.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeNetwork(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNetwork}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Network
              </Button>
            </div>
          </FormField>

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
            {loading ? "Creating..." : "Add Community"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
