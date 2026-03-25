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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Plus, X } from "lucide-react";
import { lldpService } from "@/lib/api/lldp";
import type { LLDPConfig, LLDPCapabilities } from "@/lib/api/types/lldp";
import { ApiError } from "@/lib/types/api";

const LEGACY_PROTOCOL_OPTIONS = ["cdp", "edp", "fdp", "sonmp"];

interface EditLLDPSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: LLDPConfig;
  capabilities: LLDPCapabilities | null;
}

export function EditLLDPSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  config,
  capabilities,
}: EditLLDPSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [snmpEnabled, setSnmpEnabled] = useState(false);
  const [managementAddresses, setManagementAddresses] = useState<string[]>([]);
  const [legacyProtocols, setLegacyProtocols] = useState<string[]>([]);

  useEffect(() => {
    if (open && config) {
      setSnmpEnabled(config.snmp_enabled);
      setManagementAddresses(
        config.management_addresses.length > 0 ? [...config.management_addresses] : []
      );
      setLegacyProtocols(
        config.legacy_protocols.length > 0 ? [...config.legacy_protocols] : []
      );
      setError(null);
    }
  }, [open, config]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  // Multi-value list helpers
  const addManagementAddress = () => setManagementAddresses([...managementAddresses, ""]);
  const updateManagementAddress = (index: number, value: string) => {
    const updated = [...managementAddresses];
    updated[index] = value;
    setManagementAddresses(updated);
  };
  const removeManagementAddress = (index: number) => {
    setManagementAddresses(managementAddresses.filter((_, i) => i !== index));
  };

  const toggleLegacyProtocol = (protocol: string) => {
    if (legacyProtocols.includes(protocol)) {
      setLegacyProtocols(legacyProtocols.filter((p) => p !== protocol));
    } else {
      setLegacyProtocols([...legacyProtocols, protocol]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const operations: { op: string; value?: string }[] = [];

      // Handle SNMP toggle
      if (snmpEnabled !== config.snmp_enabled) {
        operations.push({
          op: snmpEnabled ? "set_snmp" : "delete_snmp",
        });
      }

      // Handle management addresses
      if (capabilities?.has_management_address) {
        const currentAddrs = new Set(config.management_addresses);
        const newAddrs = new Set(managementAddresses.map((a) => a.trim()).filter(Boolean));

        for (const addr of newAddrs) {
          if (!currentAddrs.has(addr)) {
            operations.push({ op: "set_management_address", value: addr });
          }
        }
        for (const addr of currentAddrs) {
          if (!newAddrs.has(addr)) {
            operations.push({ op: "delete_management_address", value: addr });
          }
        }
      }

      // Handle legacy protocols
      if (capabilities?.has_legacy_protocols) {
        const currentProtos = new Set(config.legacy_protocols);
        const newProtos = new Set(legacyProtocols);

        for (const proto of newProtos) {
          if (!currentProtos.has(proto)) {
            operations.push({ op: "set_legacy_protocol", value: proto });
          }
        }
        for (const proto of currentProtos) {
          if (!newProtos.has(proto)) {
            operations.push({ op: "delete_legacy_protocol", value: proto });
          }
        }
      }

      if (operations.length > 0) {
        await lldpService.updateSettings(operations);
        await lldpService.refreshConfig();
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update LLDP settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit LLDP Settings</DialogTitle>
          <DialogDescription>
            Configure LLDP global settings, management addresses, and legacy protocols.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="snmp-enabled"
              checked={snmpEnabled}
              onCheckedChange={(checked) => setSnmpEnabled(checked as boolean)}
            />
            <div className="space-y-1">
              <label htmlFor="snmp-enabled" className="text-sm font-medium cursor-pointer">
                Enable SNMP
              </label>
              <p className="text-xs text-muted-foreground">
                Enable SNMP queries for LLDP information
              </p>
            </div>
          </div>

          {capabilities?.has_management_address && (
            <FormField label="Management Addresses" description="Management IP addresses advertised via LLDP">
              <div className="space-y-2">
                {managementAddresses.length === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addManagementAddress}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Management Address
                  </Button>
                ) : (
                  <>
                    {managementAddresses.map((addr, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={addr}
                          onChange={(e) => updateManagementAddress(index, e.target.value)}
                          placeholder="e.g., 10.0.0.1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeManagementAddress(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addManagementAddress}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Management Address
                    </Button>
                  </>
                )}
              </div>
            </FormField>
          )}

          {capabilities?.has_legacy_protocols && (
            <FormField label="Legacy Protocols" description="Enable compatibility with legacy discovery protocols">
              <div className="space-y-2">
                {LEGACY_PROTOCOL_OPTIONS.map((proto) => (
                  <div key={proto} className="flex items-start space-x-3">
                    <Checkbox
                      id={`legacy-${proto}`}
                      checked={legacyProtocols.includes(proto)}
                      onCheckedChange={() => toggleLegacyProtocol(proto)}
                    />
                    <label htmlFor={`legacy-${proto}`} className="text-sm font-medium cursor-pointer uppercase">
                      {proto}
                    </label>
                  </div>
                ))}
              </div>
            </FormField>
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
