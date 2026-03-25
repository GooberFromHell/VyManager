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
import { AlertCircle, Plus, X } from "lucide-react";
import { dhcpv6ServerService } from "@/lib/api/dhcpv6-server";
import type { DHCPv6ServerCapabilities } from "@/lib/api/types/dhcpv6-server";
import { ApiError } from "@/lib/types/api";

const isValidIPv6Prefix = (prefix: string): boolean => {
  const parts = prefix.split("/");
  if (parts.length !== 2) return false;
  const [addr, len] = parts;
  const prefixLen = parseInt(len);
  if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 128) return false;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(addr) || addr === "::";
};

const isValidIPv6 = (ip: string): boolean => {
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip) || ip === "::";
};

interface CreateDHCPv6NetworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: DHCPv6ServerCapabilities | null;
  existingNetworks: string[];
}

export function CreateDHCPv6NetworkModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingNetworks,
}: CreateDHCPv6NetworkModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [networkName, setNetworkName] = useState("");
  const [subnetPrefixes, setSubnetPrefixes] = useState<string[]>([""]);
  const [nameServers, setNameServers] = useState<string[]>([""]);
  const [defaultLeaseTime, setDefaultLeaseTime] = useState("");
  const [maxLeaseTime, setMaxLeaseTime] = useState("");
  const [minLeaseTime, setMinLeaseTime] = useState("");

  const resetForm = () => {
    setNetworkName("");
    setSubnetPrefixes([""]);
    setNameServers([""]);
    setDefaultLeaseTime("");
    setMaxLeaseTime("");
    setMinLeaseTime("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    if (!networkName.trim()) {
      setError("Network name is required");
      return false;
    }
    if (existingNetworks.includes(networkName.trim())) {
      setError("A shared network with this name already exists");
      return false;
    }

    const validPrefixes = subnetPrefixes.filter((p) => p.trim());
    if (validPrefixes.length === 0) {
      setError("At least one subnet prefix is required");
      return false;
    }
    for (const prefix of validPrefixes) {
      if (!isValidIPv6Prefix(prefix.trim())) {
        setError(`Invalid IPv6 prefix: ${prefix}`);
        return false;
      }
    }

    const validNs = nameServers.filter((ns) => ns.trim());
    for (const ns of validNs) {
      if (!isValidIPv6(ns.trim())) {
        setError(`Invalid name server address: ${ns}`);
        return false;
      }
    }

    if (defaultLeaseTime && (isNaN(Number(defaultLeaseTime)) || Number(defaultLeaseTime) <= 0)) {
      setError("Default lease time must be a positive number");
      return false;
    }
    if (maxLeaseTime && (isNaN(Number(maxLeaseTime)) || Number(maxLeaseTime) <= 0)) {
      setError("Maximum lease time must be a positive number");
      return false;
    }
    if (minLeaseTime && (isNaN(Number(minLeaseTime)) || Number(minLeaseTime) <= 0)) {
      setError("Minimum lease time must be a positive number");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const operations: { op: string; value?: string }[] = [];

      const validPrefixes = subnetPrefixes
        .filter((p) => p.trim())
        .map((p) => p.trim());

      for (const prefix of validPrefixes) {
        operations.push({ op: "set_subnet", value: prefix });
      }

      const validNs = nameServers
        .filter((ns) => ns.trim())
        .map((ns) => ns.trim());

      for (const ns of validNs) {
        operations.push({ op: "set_name_server", value: `${validPrefixes[0]}|${ns}` });
      }

      if (defaultLeaseTime) {
        operations.push({
          op: "set_lease_time_default",
          value: `${validPrefixes[0]}|${defaultLeaseTime}`,
        });
      }
      if (maxLeaseTime) {
        operations.push({
          op: "set_lease_time_maximum",
          value: `${validPrefixes[0]}|${maxLeaseTime}`,
        });
      }
      if (minLeaseTime) {
        operations.push({
          op: "set_lease_time_minimum",
          value: `${validPrefixes[0]}|${minLeaseTime}`,
        });
      }

      await dhcpv6ServerService.createSharedNetwork(
        networkName.trim(),
        operations
      );
      await dhcpv6ServerService.refreshConfig();
      onSuccess();
      handleClose();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to create shared network"
      );
    } finally {
      setLoading(false);
    }
  };

  const addSubnetPrefix = () => setSubnetPrefixes([...subnetPrefixes, ""]);
  const updateSubnetPrefix = (index: number, value: string) => {
    const updated = [...subnetPrefixes];
    updated[index] = value;
    setSubnetPrefixes(updated);
  };
  const removeSubnetPrefix = (index: number) => {
    setSubnetPrefixes(subnetPrefixes.filter((_, i) => i !== index));
  };

  const addNameServer = () => setNameServers([...nameServers, ""]);
  const updateNameServer = (index: number, value: string) => {
    const updated = [...nameServers];
    updated[index] = value;
    setNameServers(updated);
  };
  const removeNameServer = (index: number) => {
    setNameServers(nameServers.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add DHCPv6 Shared Network</DialogTitle>
          <DialogDescription>
            Create a new DHCPv6 shared network with subnet configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            label="Network Name"
            htmlFor="networkName"
            required
            description="Unique name for this shared network"
          >
            <Input
              id="networkName"
              value={networkName}
              onChange={(e) => setNetworkName(e.target.value)}
              placeholder="e.g., LAN-v6"
            />
          </FormField>

          <FormField
            label="Subnet Prefixes"
            required
          >
            <div className="space-y-2">
              {subnetPrefixes.map((prefix, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={prefix}
                    onChange={(e) => updateSubnetPrefix(index, e.target.value)}
                    placeholder="e.g., 2001:db8::/64"
                  />
                  {subnetPrefixes.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeSubnetPrefix(index)}
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
                onClick={addSubnetPrefix}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Subnet
              </Button>
            </div>
          </FormField>

          <FormField
            label="Name Servers"
            description="IPv6 DNS server addresses advertised to clients"
          >
            <div className="space-y-2">
              {nameServers.map((ns, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={ns}
                    onChange={(e) => updateNameServer(index, e.target.value)}
                    placeholder="e.g., 2001:db8::1"
                  />
                  {nameServers.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeNameServer(index)}
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
                onClick={addNameServer}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Name Server
              </Button>
            </div>
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Default Lease (s)" htmlFor="defaultLeaseTime">
              <Input
                id="defaultLeaseTime"
                type="number"
                value={defaultLeaseTime}
                onChange={(e) => setDefaultLeaseTime(e.target.value)}
                placeholder="86400"
              />
            </FormField>
            <FormField label="Min Lease (s)" htmlFor="minLeaseTime">
              <Input
                id="minLeaseTime"
                type="number"
                value={minLeaseTime}
                onChange={(e) => setMinLeaseTime(e.target.value)}
                placeholder="600"
              />
            </FormField>
            <FormField label="Max Lease (s)" htmlFor="maxLeaseTime">
              <Input
                id="maxLeaseTime"
                type="number"
                value={maxLeaseTime}
                onChange={(e) => setMaxLeaseTime(e.target.value)}
                placeholder="172800"
              />
            </FormField>
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Add Shared Network"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
