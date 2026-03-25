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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Plus, X } from "lucide-react";
import { dnsForwardingService } from "@/lib/api/dns-forwarding";
import type {
  DNSForwardingConfig,
  DNSForwardingCapabilities,
} from "@/lib/api/types/dns-forwarding";
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

interface EditDNSForwardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: DNSForwardingConfig;
  capabilities: DNSForwardingCapabilities | null;
}

export function EditDNSForwardingModal({
  open,
  onOpenChange,
  onSuccess,
  config,
  capabilities,
}: EditDNSForwardingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listenAddresses, setListenAddresses] = useState<string[]>([""]);
  const [allowFrom, setAllowFrom] = useState<string[]>([""]);
  const [nameServers, setNameServers] = useState<string[]>([""]);
  const [cacheSize, setCacheSize] = useState("10000");
  const [dnssec, setDnssec] = useState("auto");
  const [noServeRfc1918, setNoServeRfc1918] = useState(false);
  const [useSystemNameservers, setUseSystemNameservers] = useState(false);
  const [ignoreHostsFile, setIgnoreHostsFile] = useState(false);

  useEffect(() => {
    if (open && config) {
      setListenAddresses(
        config.listen_addresses.length > 0 ? [...config.listen_addresses] : [""]
      );
      setAllowFrom(
        config.allow_from.length > 0 ? [...config.allow_from] : [""]
      );
      setNameServers(
        config.name_servers.length > 0 ? [...config.name_servers] : [""]
      );
      setCacheSize(config.cache_size?.toString() || "10000");
      setDnssec(config.dnssec || "auto");
      setNoServeRfc1918(config.no_serve_rfc1918);
      setUseSystemNameservers(config.use_system_nameservers);
      setIgnoreHostsFile(config.ignore_hosts_file);
      setError(null);
    }
  }, [open, config]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    const validListenAddrs = listenAddresses.filter((a) => a.trim());
    if (validListenAddrs.length === 0) {
      setError("At least one listen address is required");
      return false;
    }
    for (const addr of validListenAddrs) {
      if (!isValidIP(addr.trim())) {
        setError(`Invalid listen address: ${addr}`);
        return false;
      }
    }

    const validAllowFrom = allowFrom.filter((a) => a.trim());
    if (validAllowFrom.length === 0) {
      setError("At least one allow-from network is required");
      return false;
    }
    for (const network of validAllowFrom) {
      if (!isValidCIDR(network.trim())) {
        setError(`Invalid allow-from CIDR: ${network}`);
        return false;
      }
    }

    const validNameServers = nameServers.filter((s) => s.trim());
    for (const server of validNameServers) {
      if (!isValidIP(server.trim())) {
        setError(`Invalid name server address: ${server}`);
        return false;
      }
    }

    const cacheSizeNum = parseInt(cacheSize);
    if (cacheSize.trim() && (isNaN(cacheSizeNum) || cacheSizeNum < 0)) {
      setError("Cache size must be a non-negative integer");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const newListenAddrs = listenAddresses
        .filter((a) => a.trim())
        .map((a) => a.trim());
      const newAllowFrom = allowFrom
        .filter((a) => a.trim())
        .map((a) => a.trim());
      const newNameServers = nameServers
        .filter((s) => s.trim())
        .map((s) => s.trim());

      // Compute deletes: addresses in original config but not in new values
      const deleteListenAddrs = config.listen_addresses.filter(
        (a) => !newListenAddrs.includes(a)
      );
      const deleteAllowFrom = config.allow_from.filter(
        (a) => !newAllowFrom.includes(a)
      );
      const deleteNameServers = config.name_servers.filter(
        (s) => !newNameServers.includes(s)
      );

      // Compute adds: addresses in new values but not in original config
      const addListenAddrs = newListenAddrs.filter(
        (a) => !config.listen_addresses.includes(a)
      );
      const addAllowFrom = newAllowFrom.filter(
        (a) => !config.allow_from.includes(a)
      );
      const addNameServers = newNameServers.filter(
        (s) => !config.name_servers.includes(s)
      );

      await dnsForwardingService.updateGlobalSettings({
        listen_addresses:
          addListenAddrs.length > 0 ? addListenAddrs : undefined,
        allow_from: addAllowFrom.length > 0 ? addAllowFrom : undefined,
        name_servers: addNameServers.length > 0 ? addNameServers : undefined,
        cache_size: parseInt(cacheSize) !== config.cache_size
          ? parseInt(cacheSize)
          : undefined,
        no_serve_rfc1918:
          noServeRfc1918 !== config.no_serve_rfc1918
            ? noServeRfc1918
            : undefined,
        use_system_nameservers:
          useSystemNameservers !== config.use_system_nameservers
            ? useSystemNameservers
            : undefined,
        dnssec: dnssec !== config.dnssec ? dnssec : undefined,
        ignore_hosts_file:
          ignoreHostsFile !== config.ignore_hosts_file
            ? ignoreHostsFile
            : undefined,
        delete_listen_addresses:
          deleteListenAddrs.length > 0 ? deleteListenAddrs : undefined,
        delete_allow_from:
          deleteAllowFrom.length > 0 ? deleteAllowFrom : undefined,
        delete_name_servers:
          deleteNameServers.length > 0 ? deleteNameServers : undefined,
      });

      await dnsForwardingService.refreshConfig();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to update DNS forwarding settings"
      );
    } finally {
      setLoading(false);
    }
  };

  // Array helpers
  const addListenAddress = () => setListenAddresses([...listenAddresses, ""]);
  const updateListenAddress = (index: number, value: string) => {
    const updated = [...listenAddresses];
    updated[index] = value;
    setListenAddresses(updated);
  };
  const removeListenAddress = (index: number) => {
    setListenAddresses(listenAddresses.filter((_, i) => i !== index));
  };

  const addAllowFrom = () => setAllowFrom([...allowFrom, ""]);
  const updateAllowFrom = (index: number, value: string) => {
    const updated = [...allowFrom];
    updated[index] = value;
    setAllowFrom(updated);
  };
  const removeAllowFromEntry = (index: number) => {
    setAllowFrom(allowFrom.filter((_, i) => i !== index));
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
      <DialogContent className="max-w-2xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit DNS Forwarding Settings</DialogTitle>
          <DialogDescription>
            Update global DNS forwarding configuration
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 min-h-0">
          <div className="space-y-6 pb-4">
            {/* Listen Addresses */}
            <Fieldset label="Listen Addresses">
              <FormField
                label="Addresses"
                description="IP addresses the DNS forwarder listens on"
                required
              >
                <div className="space-y-2">
                  {listenAddresses.map((addr, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={addr}
                        onChange={(e) =>
                          updateListenAddress(index, e.target.value)
                        }
                        placeholder="e.g., 10.0.0.1"
                      />
                      {listenAddresses.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeListenAddress(index)}
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
                    onClick={addListenAddress}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Listen Address
                  </Button>
                </div>
              </FormField>
            </Fieldset>

            <FieldsetDivider />

            {/* Allow From Networks */}
            <Fieldset label="Allow From Networks">
              <FormField
                label="Networks"
                description="Networks allowed to query (CIDR notation)"
                required
              >
                <div className="space-y-2">
                  {allowFrom.map((network, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={network}
                        onChange={(e) => updateAllowFrom(index, e.target.value)}
                        placeholder="e.g., 10.0.0.0/8"
                      />
                      {allowFrom.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeAllowFromEntry(index)}
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
                    onClick={addAllowFrom}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Network
                  </Button>
                </div>
              </FormField>
            </Fieldset>

            <FieldsetDivider />

            {/* Upstream Name Servers */}
            <Fieldset label="Upstream Name Servers">
              <FormField
                label="Servers"
                description="DNS servers to forward queries to"
              >
                <div className="space-y-2">
                  {nameServers.map((server, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={server}
                        onChange={(e) => updateNameServer(index, e.target.value)}
                        placeholder="e.g., 8.8.8.8"
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
            </Fieldset>

            <FieldsetDivider />

            {/* Cache and DNSSEC */}
            <Fieldset label="Cache &amp; Security">
              {capabilities?.fields?.cache_size?.supported !== false && (
                <FormField
                  label="Cache Size"
                  htmlFor="cacheSize"
                  description="Number of DNS entries to cache (default: 10000)"
                >
                  <Input
                    id="cacheSize"
                    type="number"
                    value={cacheSize}
                    onChange={(e) => setCacheSize(e.target.value)}
                    placeholder="10000"
                  />
                </FormField>
              )}

              {capabilities?.fields?.dnssec?.supported !== false && (
                <FormField
                  label="DNSSEC"
                  htmlFor="dnssec"
                >
                  <select
                    id="dnssec"
                    value={dnssec}
                    onChange={(e) => setDnssec(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="auto">Auto</option>
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </FormField>
              )}
            </Fieldset>

            <FieldsetDivider />

            {/* Boolean Options */}
            <Fieldset label="Options">
              {capabilities?.fields?.no_serve_rfc1918?.supported !== false && (
                <FormField
                  label="No Serve RFC1918"
                  htmlFor="noServeRfc1918"
                  description="Block private IP (RFC1918) reverse lookup zones"
                  horizontal
                >
                  <Checkbox
                    id="noServeRfc1918"
                    checked={noServeRfc1918}
                    onCheckedChange={(checked) =>
                      setNoServeRfc1918(checked as boolean)
                    }
                  />
                </FormField>
              )}

              {capabilities?.fields?.system?.supported !== false && (
                <FormField
                  label="Use System Nameservers"
                  htmlFor="useSystemNameservers"
                  description="Also use name servers configured in the system settings"
                  horizontal
                >
                  <Checkbox
                    id="useSystemNameservers"
                    checked={useSystemNameservers}
                    onCheckedChange={(checked) =>
                      setUseSystemNameservers(checked as boolean)
                    }
                  />
                </FormField>
              )}

              {capabilities?.fields?.ignore_hosts_file?.supported !== false && (
                <FormField
                  label="Ignore Hosts File"
                  htmlFor="ignoreHostsFile"
                  description="Do not use the local /etc/hosts file for DNS resolution"
                  horizontal
                >
                  <Checkbox
                    id="ignoreHostsFile"
                    checked={ignoreHostsFile}
                    onCheckedChange={(checked) =>
                      setIgnoreHostsFile(checked as boolean)
                    }
                  />
                </FormField>
              )}
            </Fieldset>
          </div>
        </ScrollArea>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

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
