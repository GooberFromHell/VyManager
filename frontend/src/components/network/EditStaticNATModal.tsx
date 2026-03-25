"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { natService } from "@/lib/api/nat";
import { configService } from "@/lib/api/config";
import type { StaticNATRule } from "@/lib/api/nat";

interface SimpleInterface {
  name: string;
  type: string;
}

interface EditStaticNATModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: StaticNATRule | null;
  onSuccess: () => void;
}

export function EditStaticNATModal({ open, onOpenChange, rule, onSuccess }: EditStaticNATModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data
  const [interfaces, setInterfaces] = useState<SimpleInterface[]>([]);

  // Form fields - Description
  const [description, setDescription] = useState("");

  // Destination
  const [destinationAddress, setDestinationAddress] = useState("");

  // Inbound interface
  const [inboundInterfaceName, setInboundInterfaceName] = useState("");

  // Translation
  const [translationAddress, setTranslationAddress] = useState("");

  // Reset all form fields to defaults
  const resetForm = () => {
    setDescription("");
    setDestinationAddress("");
    setInboundInterfaceName("");
    setTranslationAddress("");
    setError(null);
  };

  // Load interfaces on mount
  useEffect(() => {
    if (open) {
      loadInterfaces();
    }
  }, [open]);

  // Populate form when rule changes
  useEffect(() => {
    if (rule && open) {
      // Reset form first to clear any stale data from previous rule
      resetForm();
      populateForm(rule);
    }
  }, [rule, open]);

  const populateForm = (rule: StaticNATRule) => {
    // Description
    setDescription(rule.description || "");

    // Destination
    if (rule.destination?.address) {
      setDestinationAddress(rule.destination.address);
    }

    // Inbound interface
    if (rule.inbound_interface) {
      setInboundInterfaceName(rule.inbound_interface);
    }

    // Translation
    if (rule.translation?.address) {
      setTranslationAddress(rule.translation.address);
    }
  };

  const loadInterfaces = async () => {
    try {
      const snapshot = await configService.getSnapshot();
      const interfacesConfig = snapshot.config?.interfaces || {};
      const allInterfaces: SimpleInterface[] = [];

      // Parse all interface types from the config
      const interfaceTypes = [
        "ethernet",
        "wireguard",
        "vti",
        "tunnel",
        "dummy",
        "loopback",
        "bridge",
        "bonding",
        "pppoe",
        "wwan",
        "macsec",
        "openvpn",
        "vxlan",
        "geneve",
        "l2tpv3",
        "sstpc",
        "virtual-ethernet",
      ];

      for (const ifaceType of interfaceTypes) {
        const typeInterfaces = interfacesConfig[ifaceType];
        if (typeInterfaces && typeof typeInterfaces === "object") {
          for (const ifaceName of Object.keys(typeInterfaces)) {
            allInterfaces.push({ name: ifaceName, type: ifaceType });

            // Check for VLANs (vif) under ethernet/bonding/bridge interfaces
            const ifaceConfig = typeInterfaces[ifaceName];
            if (ifaceConfig?.vif && typeof ifaceConfig.vif === "object") {
              for (const vlanId of Object.keys(ifaceConfig.vif)) {
                allInterfaces.push({
                  name: `${ifaceName}.${vlanId}`,
                  type: "vlan",
                });
              }
            }
          }
        }
      }

      // Sort interfaces by name
      allInterfaces.sort((a, b) => a.name.localeCompare(b.name));
      setInterfaces(allInterfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!rule) return;

    setLoading(true);
    setError(null);

    try {
      const config: Record<string, string> = {};

      // Always pass description so service can set or delete it
      config.description = description.trim();

      // Destination
      if (destinationAddress.trim()) {
        config.destination_address = destinationAddress.trim();
      }

      // Inbound interface
      if (inboundInterfaceName) {
        config.inbound_interface = inboundInterfaceName;
      }

      // Translation
      if (translationAddress.trim()) {
        config.translation_address = translationAddress.trim();
      }

      // Update the rule
      await natService.updateStaticRule(rule.rule_number, config);

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update static NAT rule");
    } finally {
      setLoading(false);
    }
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Static NAT Rule {rule.rule_number}</DialogTitle>
          <DialogDescription>
            Modify the static NAT rule configuration (1:1 mapping).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <Fieldset>
            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this rule"
                rows={2}
              />
            </FormField>
          </Fieldset>

          <FieldsetDivider />

          <Fieldset label="Address Mapping">
            <FormField
              label="Destination Address (External)"
              htmlFor="destination-address"
              description="The external/public IP address"
            >
              <Input
                id="destination-address"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="e.g., 203.0.113.10"
                className="font-mono"
              />
            </FormField>

            <FormField label="Inbound Interface" htmlFor="inbound-interface">
              <Select value={inboundInterfaceName || undefined} onValueChange={setInboundInterfaceName}>
                <SelectTrigger id="inbound-interface">
                  <SelectValue placeholder="Select interface (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {interfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>
                      {iface.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inboundInterfaceName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInboundInterfaceName("")}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear selection
                </Button>
              )}
            </FormField>

            <FormField
              label="Translation Address (Internal)"
              htmlFor="translation-address"
              description="The internal/private IP address to translate to"
            >
              <Input
                id="translation-address"
                value={translationAddress}
                onChange={(e) => setTranslationAddress(e.target.value)}
                placeholder="e.g., 192.168.1.10"
                className="font-mono"
              />
            </FormField>
          </Fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
