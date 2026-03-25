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
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Plus, X } from "lucide-react";
import { ntpService } from "@/lib/api/ntp";
import type { NTPConfig, NTPCapabilities } from "@/lib/api/types/ntp";
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
  // Simplified IPv6 check
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

interface EditNTPSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: NTPConfig;
  capabilities: NTPCapabilities | null;
}

export function EditNTPSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  config,
  capabilities,
}: EditNTPSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listenAddresses, setListenAddresses] = useState<string[]>([]);
  const [allowClients, setAllowClients] = useState<string[]>([]);
  const [vrf, setVrf] = useState("");

  useEffect(() => {
    if (open && config) {
      setListenAddresses(
        config.listen_addresses.length > 0 ? [...config.listen_addresses] : []
      );
      setAllowClients(
        config.allow_clients.length > 0 ? [...config.allow_clients] : []
      );
      setVrf(config.vrf || "");
      setError(null);
    }
  }, [open, config]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    for (const addr of listenAddresses.filter((a) => a.trim())) {
      if (!isValidIP(addr.trim())) {
        setError(`Invalid listen address: ${addr}`);
        return false;
      }
    }

    for (const client of allowClients.filter((c) => c.trim())) {
      if (!isValidCIDR(client.trim())) {
        setError(`Invalid allow client CIDR: ${client}`);
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

      // Handle listen addresses
      const currentListenAddrs = config.listen_addresses;
      const newListenAddrs = listenAddresses
        .map((a) => a.trim())
        .filter(Boolean);

      // Delete removed listen addresses
      for (const addr of currentListenAddrs) {
        if (!newListenAddrs.includes(addr)) {
          operations.push({ op: "delete_listen_address", value: addr });
        }
      }
      // Add new listen addresses
      for (const addr of newListenAddrs) {
        if (!currentListenAddrs.includes(addr)) {
          operations.push({ op: "set_listen_address", value: addr });
        }
      }

      // Handle allow clients
      const currentClients = config.allow_clients;
      const newClients = allowClients.map((c) => c.trim()).filter(Boolean);

      for (const client of currentClients) {
        if (!newClients.includes(client)) {
          operations.push({ op: "delete_allow_client", value: client });
        }
      }
      for (const client of newClients) {
        if (!currentClients.includes(client)) {
          operations.push({ op: "set_allow_client", value: client });
        }
      }

      // Handle VRF
      const newVrf = vrf.trim();
      if (newVrf && newVrf !== (config.vrf || "")) {
        operations.push({ op: "set_vrf", value: newVrf });
      } else if (!newVrf && config.vrf) {
        operations.push({ op: "delete_vrf" });
      }

      if (operations.length > 0) {
        await ntpService.batchConfigure({ operations });
        await ntpService.refreshConfig();
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update NTP settings");
    } finally {
      setLoading(false);
    }
  };

  // Array management helpers
  const addListenAddress = () => setListenAddresses([...listenAddresses, ""]);
  const updateListenAddress = (index: number, value: string) => {
    const updated = [...listenAddresses];
    updated[index] = value;
    setListenAddresses(updated);
  };
  const removeListenAddress = (index: number) => {
    setListenAddresses(listenAddresses.filter((_, i) => i !== index));
  };

  const addAllowClient = () => setAllowClients([...allowClients, ""]);
  const updateAllowClient = (index: number, value: string) => {
    const updated = [...allowClients];
    updated[index] = value;
    setAllowClients(updated);
  };
  const removeAllowClient = (index: number) => {
    setAllowClients(allowClients.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit NTP Settings</DialogTitle>
          <DialogDescription>
            Configure NTP service listen addresses, allowed clients, and VRF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {capabilities?.fields?.listen_address?.supported && (
            <Fieldset label="Listen Addresses">
              <FormField
                label="Addresses"
                description="IP addresses the NTP service listens on"
              >
                <div className="space-y-2">
                  {listenAddresses.length === 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addListenAddress}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Listen Address
                    </Button>
                  ) : (
                    <>
                      {listenAddresses.map((addr, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={addr}
                            onChange={(e) =>
                              updateListenAddress(index, e.target.value)
                            }
                            placeholder="e.g., 0.0.0.0"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeListenAddress(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
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
                    </>
                  )}
                </div>
              </FormField>
            </Fieldset>
          )}

          {capabilities?.fields?.listen_address?.supported &&
            capabilities?.fields?.allow_client?.supported && (
              <FieldsetDivider />
            )}

          {capabilities?.fields?.allow_client?.supported && (
            <Fieldset label="Allowed Clients">
              <FormField
                label="Client Networks"
                description="Networks allowed to query this NTP server (CIDR notation)"
              >
                <div className="space-y-2">
                  {allowClients.length === 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAllowClient}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Allowed Client Network
                    </Button>
                  ) : (
                    <>
                      {allowClients.map((client, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={client}
                            onChange={(e) =>
                              updateAllowClient(index, e.target.value)
                            }
                            placeholder="e.g., 10.0.0.0/8"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeAllowClient(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addAllowClient}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Allowed Client Network
                      </Button>
                    </>
                  )}
                </div>
              </FormField>
            </Fieldset>
          )}

          {capabilities?.fields?.vrf?.supported && (
            <>
              {(capabilities?.fields?.listen_address?.supported ||
                capabilities?.fields?.allow_client?.supported) && (
                <FieldsetDivider />
              )}

              <Fieldset label="Network">
                <FormField
                  label="VRF"
                  htmlFor="vrf"
                  description="VRF instance for the NTP service (optional)"
                >
                  <Input
                    id="vrf"
                    value={vrf}
                    onChange={(e) => setVrf(e.target.value)}
                    placeholder="e.g., mgmt"
                  />
                </FormField>
              </Fieldset>
            </>
          )}

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
