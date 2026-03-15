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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Plus, X } from "lucide-react";
import { dnsForwardingService } from "@/lib/api/dns-forwarding";
import type { DNSForwardingCapabilities } from "@/lib/api/types/dns-forwarding";
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
  return ipv6Regex.test(ip);
};

const isValidIP = (ip: string): boolean => {
  return isValidIPv4(ip) || isValidIPv6(ip);
};

const isValidDomain = (domain: string): boolean => {
  const domainRegex =
    /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return domainRegex.test(domain) && domain.length <= 253;
};

interface CreateDNSForwardingDomainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: DNSForwardingCapabilities | null;
  existingDomains: string[];
}

export function CreateDNSForwardingDomainModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingDomains,
}: CreateDNSForwardingDomainModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [domainName, setDomainName] = useState("");
  const [servers, setServers] = useState<string[]>([""]);
  const [addnta, setAddnta] = useState(false);
  const [recursionDesired, setRecursionDesired] = useState(false);

  const resetForm = () => {
    setDomainName("");
    setServers([""]);
    setAddnta(false);
    setRecursionDesired(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    if (!domainName.trim()) {
      setError("Domain name is required");
      return false;
    }
    if (!isValidDomain(domainName.trim())) {
      setError("Invalid domain name format");
      return false;
    }
    if (existingDomains.includes(domainName.trim())) {
      setError("A forwarding rule for this domain already exists");
      return false;
    }

    const validServers = servers.filter((s) => s.trim());
    if (validServers.length === 0) {
      setError("At least one DNS server is required");
      return false;
    }
    for (const server of validServers) {
      if (!isValidIP(server.trim())) {
        setError(`Invalid server address: ${server}`);
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
      const validServers = servers
        .filter((s) => s.trim())
        .map((s) => s.trim());

      await dnsForwardingService.createDomain(
        domainName.trim(),
        validServers,
        addnta,
        recursionDesired
      );

      await dnsForwardingService.refreshConfig();
      onSuccess();
      handleClose();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to create domain forwarding rule"
      );
    } finally {
      setLoading(false);
    }
  };

  const addServer = () => setServers([...servers, ""]);
  const updateServer = (index: number, value: string) => {
    const updated = [...servers];
    updated[index] = value;
    setServers(updated);
  };
  const removeServer = (index: number) => {
    setServers(servers.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Domain Forwarding Rule</DialogTitle>
          <DialogDescription>
            Forward DNS queries for a specific domain to designated servers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="domainName" className="required">
              Domain Name
            </Label>
            <Input
              id="domainName"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder="e.g., example.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              DNS queries for this domain will be forwarded to the specified
              servers
            </p>
          </div>

          <div>
            <Label className="required">DNS Servers</Label>
            <div className="space-y-2 mt-2">
              {servers.map((server, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={server}
                    onChange={(e) => updateServer(index, e.target.value)}
                    placeholder="e.g., 10.1.1.53"
                  />
                  {servers.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeServer(index)}
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
                onClick={addServer}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="addnta"
                checked={addnta}
                onCheckedChange={(checked) => setAddnta(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="addnta" className="cursor-pointer">
                  Add Negative Trust Anchor (ADDNTA)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Set a Negative Trust Anchor for this domain to disable DNSSEC
                  validation
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="recursionDesired"
                checked={recursionDesired}
                onCheckedChange={(checked) =>
                  setRecursionDesired(checked as boolean)
                }
              />
              <div className="space-y-1">
                <Label htmlFor="recursionDesired" className="cursor-pointer">
                  Recursion Desired
                </Label>
                <p className="text-xs text-muted-foreground">
                  Set the recursion desired (RD) bit in forwarded queries
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Add Domain Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
