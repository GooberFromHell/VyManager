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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fieldset, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Loader2 } from "lucide-react";
import { staticRoutesService } from "@/lib/api/static-routes";
import { showService } from "@/lib/api/show";

interface CreateNeighborProxyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateNeighborProxyModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateNeighborProxyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);
  const [proxyType, setProxyType] = useState<"arp" | "nd">("arp");

  // Form fields
  const [ipAddress, setIpAddress] = useState("");
  const [interfaceName, setInterfaceName] = useState("");

  useEffect(() => {
    if (open) {
      loadInterfaces();
      resetForm();
    }
  }, [open]);

  const loadInterfaces = async () => {
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces.map((i) => i.name));
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const resetForm = () => {
    setIpAddress("");
    setInterfaceName("");
    setProxyType("arp");
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!ipAddress) {
      setError("IP address is required");
      return;
    }
    if (!interfaceName) {
      setError("Interface is required");
      return;
    }

    // Validate IP address format based on proxy type
    if (proxyType === "arp") {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4Regex.test(ipAddress)) {
        setError("Invalid IPv4 address format");
        return;
      }
    } else {
      // Basic IPv6 validation
      const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
      if (!ipv6Regex.test(ipAddress)) {
        setError("Invalid IPv6 address format");
        return;
      }
    }

    setLoading(true);

    try {
      if (proxyType === "arp") {
        await staticRoutesService.createNeighborProxyArp(ipAddress, [interfaceName]);
      } else {
        await staticRoutesService.createNeighborProxyNd(ipAddress, [interfaceName]);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create neighbor proxy entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Neighbor Proxy Entry</DialogTitle>
          <DialogDescription>
            Add a neighbor proxy entry for ARP (IPv4) or ND (IPv6)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Tabs value={proxyType} onValueChange={(v) => setProxyType(v as "arp" | "nd")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="arp">ARP Proxy (IPv4)</TabsTrigger>
              <TabsTrigger value="nd">ND Proxy (IPv6)</TabsTrigger>
            </TabsList>

            <TabsContent value="arp" className="mt-4">
              <Fieldset>
                <FormField label="IPv4 Address" htmlFor="ipv4-address">
                  <Input
                    id="ipv4-address"
                    placeholder="192.168.1.100"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                  />
                </FormField>
              </Fieldset>
            </TabsContent>

            <TabsContent value="nd" className="mt-4">
              <Fieldset>
                <FormField label="IPv6 Address" htmlFor="ipv6-address">
                  <Input
                    id="ipv6-address"
                    placeholder="2001:db8::1"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                  />
                </FormField>
              </Fieldset>
            </TabsContent>
          </Tabs>

          <Fieldset>
            <FormField label="Interface" htmlFor="interface">
              <Select value={interfaceName} onValueChange={setInterfaceName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interface..." />
                </SelectTrigger>
                <SelectContent>
                  {availableInterfaces.map((iface) => (
                    <SelectItem key={iface} value={iface}>
                      {iface}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </Fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
