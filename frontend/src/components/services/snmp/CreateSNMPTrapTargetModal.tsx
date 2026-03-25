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
import { AlertCircle } from "lucide-react";
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

interface CreateSNMPTrapTargetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: SNMPCapabilities | null;
  existingTargets: string[];
}

export function CreateSNMPTrapTargetModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingTargets,
}: CreateSNMPTrapTargetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [community, setCommunity] = useState("");
  const [port, setPort] = useState("");

  const resetForm = () => {
    setAddress("");
    setCommunity("");
    setPort("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setError("Trap target address is required");
      return false;
    }
    if (!isValidIP(trimmedAddress)) {
      setError("Invalid IP address format");
      return false;
    }
    if (existingTargets.includes(trimmedAddress)) {
      setError("A trap target with this address already exists");
      return false;
    }

    if (port.trim()) {
      const portNum = parseInt(port.trim());
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        setError("Port must be between 1 and 65535");
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

      operations.push({ op: "set_trap_target" });

      const trimmedCommunity = community.trim();
      if (trimmedCommunity) {
        operations.push({
          op: "set_trap_target_community",
          value: trimmedCommunity,
        });
      }

      const trimmedPort = port.trim();
      if (trimmedPort) {
        operations.push({ op: "set_trap_target_port", value: trimmedPort });
      }

      await snmpService.batchConfigure({
        item_name: address.trim(),
        operations,
      });
      await snmpService.refreshConfig();
      onSuccess();
      handleClose();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to create trap target"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add SNMP Trap Target</DialogTitle>
          <DialogDescription>
            Configure a new SNMP trap notification target
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            label="Address"
            htmlFor="address"
            required
            description="IP address of the SNMP trap receiver"
          >
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 10.0.0.100"
            />
          </FormField>

          <FormField
            label="Community"
            htmlFor="community"
            description="Community string for trap authentication"
          >
            <Input
              id="community"
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
              placeholder="e.g., public"
            />
          </FormField>

          <FormField
            label="Port"
            htmlFor="port"
            description="UDP port for trap notifications (default: 162)"
          >
            <Input
              id="port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="162"
            />
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
            {loading ? "Creating..." : "Add Trap Target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
