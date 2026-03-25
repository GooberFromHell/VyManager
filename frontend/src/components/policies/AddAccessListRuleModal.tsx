"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { accessListService, type AccessList } from "@/lib/api/access-list";

interface AddAccessListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  accessList: AccessList | null;
}

export function AddAccessListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  accessList,
}: AddAccessListRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [ruleNumber, setRuleNumber] = useState(100);
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [ruleDescription, setRuleDescription] = useState("");
  const [sourceType, setSourceType] = useState<"any" | "host" | "network">("any");
  const [sourceNetworkFormat, setSourceNetworkFormat] = useState<"network" | "inverse-mask">("network");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceMask, setSourceMask] = useState("");
  // IPv6 specific fields
  const [sourceAny, setSourceAny] = useState(false);
  const [sourceExactMatch, setSourceExactMatch] = useState(false);
  const [sourceNetwork, setSourceNetwork] = useState("");
  const [destinationType, setDestinationType] = useState<"any" | "host" | "network">("any");
  const [destinationNetworkFormat, setDestinationNetworkFormat] = useState<"network" | "inverse-mask">("network");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationMask, setDestinationMask] = useState("");

  useEffect(() => {
    if (open && accessList) {
      // Calculate next rule number
      const ruleNumbers = accessList.rules.map(r => r.rule_number);
      if (ruleNumbers.length === 0) {
        setRuleNumber(100);
      } else {
        setRuleNumber(Math.max(...ruleNumbers) + 1);
      }
    }
  }, [open, accessList]);

  // Clear source fields when type changes
  useEffect(() => {
    if (sourceType === "any") {
      setSourceAddress("");
      setSourceMask("");
    } else if (sourceType === "host") {
      setSourceMask("");
    }
  }, [sourceType]);

  // Clear destination fields when type changes
  useEffect(() => {
    if (destinationType === "any") {
      setDestinationAddress("");
      setDestinationMask("");
    } else if (destinationType === "host") {
      setDestinationMask("");
    }
  }, [destinationType]);

  // Mutual exclusivity for IPv6: exact-match and network are mutually exclusive
  // But "any" can coexist with either
  useEffect(() => {
    if (sourceNetwork.trim() && sourceExactMatch) {
      setSourceExactMatch(false);
    }
  }, [sourceNetwork]);

  useEffect(() => {
    if (sourceExactMatch && sourceNetwork.trim()) {
      setSourceNetwork("");
    }
  }, [sourceExactMatch]);

  const resetForm = () => {
    setRuleNumber(100);
    setAction("permit");
    setRuleDescription("");
    setSourceType("any");
    setSourceAddress("");
    setSourceMask("");
    setSourceAny(false);
    setSourceExactMatch(false);
    setSourceNetwork("");
    setDestinationType("any");
    setDestinationAddress("");
    setDestinationMask("");
  };

  const handleClose = () => {
    setError(null);
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!accessList) return;

    const listType = accessList.list_type as "ipv4" | "ipv6";

    // Validation
    if (listType === "ipv4") {
      // IPv4 validation
      if (sourceType === "host" && !sourceAddress.trim()) {
        setError("Please enter a source address for host type");
        return;
      }
      if (sourceType === "network" && !sourceAddress.trim()) {
        setError("Please enter a source address for network type");
        return;
      }
      if (sourceType === "network" && !sourceMask.trim()) {
        setError("Please enter a source mask for network type");
        return;
      }

      // Destination validation (IPv4 only)
      if (destinationType === "host" && !destinationAddress.trim()) {
        setError("Please enter a destination address for host type");
        return;
      }
      if (destinationType === "network" && !destinationAddress.trim()) {
        setError("Please enter a destination address for network type");
        return;
      }
      if (destinationType === "network" && !destinationMask.trim()) {
        setError("Please enter a destination mask for network type");
        return;
      }
    } else {
      // IPv6 validation
      if (sourceNetwork.trim()) {
        // Validate IPv6 CIDR format
        if (!sourceNetwork.includes('/')) {
          setError("IPv6 network must be in CIDR format (e.g., 2001:db8::/32)");
          return;
        }
      }

      // At least one option must be selected
      if (!sourceAny && !sourceExactMatch && !sourceNetwork.trim()) {
        setError("Please select at least one source option (Any, Exact Match, or Network)");
        return;
      }

      // Exact-match and network are mutually exclusive
      if (sourceExactMatch && sourceNetwork.trim()) {
        setError("Exact Match and Network cannot be used together");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let newRule: any = {
        rule_number: ruleNumber,
        action,
        description: ruleDescription || null,
      };

      if (listType === "ipv4") {
        // IPv4 rule - map network type to inverse-mask
        const actualSourceType = sourceType === "network" ? "inverse-mask" : sourceType;
        const actualDestinationType = destinationType === "network" ? "inverse-mask" : destinationType;

        newRule.source_type = actualSourceType;
        newRule.source_address = sourceAddress || null;
        newRule.source_mask = sourceMask || null;
        newRule.destination_type = actualDestinationType;
        newRule.destination_address = destinationAddress || null;
        newRule.destination_mask = destinationMask || null;
      } else {
        // IPv6 rule - handle combinations
        // any can coexist with network or exact-match
        // exact-match and network are mutually exclusive
        if (sourceAny) {
          newRule.source_type = "any";
        }

        if (sourceNetwork.trim()) {
          newRule.source_address = sourceNetwork;
          // If we don't have "any" already set, set source_type to "network"
          if (!sourceAny) {
            newRule.source_type = "network";
          }
        }

        if (sourceExactMatch) {
          newRule.source_exact_match = true;
        }
      }

      await accessListService.addRule(
        accessList.number,
        accessList.list_type,
        newRule
      );
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add rule");
    } finally {
      setLoading(false);
    }
  };

  if (!accessList) return null;

  const listType = accessList.list_type as "ipv4" | "ipv6";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Rule to {accessList.number}</DialogTitle>
          <DialogDescription>
            Create a new rule for this access list
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Fieldset label="Rule Info">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Rule Number"
                htmlFor="rule-number"
                description="Auto-calculated based on existing rules"
              >
                <Input
                  id="rule-number"
                  type="number"
                  value={ruleNumber}
                  disabled
                  className="bg-muted"
                />
              </FormField>

              <FormField label="Action" htmlFor="action" required>
                <Select value={action} onValueChange={(v) => setAction(v as "permit" | "deny")} disabled={loading}>
                  <SelectTrigger id="action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permit">Permit</SelectItem>
                    <SelectItem value="deny">Deny</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Rule Description" htmlFor="rule-description">
              <Input
                id="rule-description"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="Enter rule description (optional)"
                disabled={loading}
              />
            </FormField>
          </Fieldset>

          <FieldsetDivider />

          {/* Source Configuration */}
          <div className="space-y-3 border rounded-lg p-4">
            <p className="text-sm font-semibold text-foreground">Source</p>

            {listType === "ipv4" ? (
              /* IPv4 Source - Radio Buttons */
              <>
                <RadioGroup value={sourceType} onValueChange={(v: any) => setSourceType(v)} disabled={loading}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="any" id="source-any" />
                    <label htmlFor="source-any" className="font-normal cursor-pointer">Any</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="host" id="source-host" />
                    <label htmlFor="source-host" className="font-normal cursor-pointer">Host</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="network" id="source-network" />
                    <label htmlFor="source-network" className="font-normal cursor-pointer">Network</label>
                  </div>
                </RadioGroup>

                {sourceType === "host" && (
                  <div className="mt-3">
                    <FormField label="Host Address" htmlFor="source-address" required>
                      <Input
                        id="source-address"
                        value={sourceAddress}
                        onChange={(e) => setSourceAddress(e.target.value)}
                        placeholder="e.g., 192.168.1.1"
                        disabled={loading}
                      />
                    </FormField>
                  </div>
                )}

                {sourceType === "network" && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <FormField label="Network Address" htmlFor="source-address-net" required>
                      <Input
                        id="source-address-net"
                        value={sourceAddress}
                        onChange={(e) => setSourceAddress(e.target.value)}
                        placeholder="e.g., 192.168.1.0"
                        disabled={loading}
                      />
                    </FormField>
                    <FormField label="Inverse Mask" htmlFor="source-mask-net" required>
                      <Input
                        id="source-mask-net"
                        value={sourceMask}
                        onChange={(e) => setSourceMask(e.target.value)}
                        placeholder="e.g., 0.0.0.255"
                        disabled={loading}
                      />
                    </FormField>
                  </div>
                )}
              </>
            ) : (
              /* IPv6 Source - Checkboxes for Any/Exact-Match, separate Network field */
              <>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source-any-v6"
                      checked={sourceAny}
                      onCheckedChange={(checked) => setSourceAny(checked as boolean)}
                      disabled={loading}
                    />
                    <label htmlFor="source-any-v6" className="font-normal cursor-pointer">Any</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source-exact-match"
                      checked={sourceExactMatch}
                      onCheckedChange={(checked) => setSourceExactMatch(checked as boolean)}
                      disabled={loading || !!sourceNetwork.trim()}
                    />
                    <label htmlFor="source-exact-match" className="font-normal cursor-pointer">Exact Match</label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Any can coexist with Exact Match OR Network. Exact Match and Network are mutually exclusive.
                  </p>
                </div>

                <div className="mt-4">
                  <FormField
                    label="Network (CIDR)"
                    htmlFor="source-network-v6"
                    description="Must include prefix length (e.g., /32, /64). Can coexist with Any, but not Exact Match."
                  >
                    <Input
                      id="source-network-v6"
                      value={sourceNetwork}
                      onChange={(e) => setSourceNetwork(e.target.value)}
                      placeholder="e.g., 2001:db8::/32"
                      disabled={loading || sourceExactMatch}
                    />
                  </FormField>
                </div>
              </>
            )}
          </div>

          {/* Destination Configuration (IPv4 only) */}
          {listType === "ipv4" && (
            <div className="space-y-3 border rounded-lg p-4">
              <p className="text-sm font-semibold text-foreground">Destination</p>
              <RadioGroup value={destinationType} onValueChange={(v: any) => setDestinationType(v)} disabled={loading}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="dest-any" />
                  <label htmlFor="dest-any" className="font-normal cursor-pointer">Any</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="host" id="dest-host" />
                  <label htmlFor="dest-host" className="font-normal cursor-pointer">Host</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="network" id="dest-network" />
                  <label htmlFor="dest-network" className="font-normal cursor-pointer">Network</label>
                </div>
              </RadioGroup>

              {destinationType === "host" && (
                <div className="mt-3">
                  <FormField label="Host Address" htmlFor="dest-address" required>
                    <Input
                      id="dest-address"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder="e.g., 10.0.0.1"
                      disabled={loading}
                    />
                  </FormField>
                </div>
              )}

              {destinationType === "network" && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <FormField label="Network Address" htmlFor="dest-address-net" required>
                    <Input
                      id="dest-address-net"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder="e.g., 10.0.0.0"
                      disabled={loading}
                    />
                  </FormField>
                  <FormField label="Inverse Mask" htmlFor="dest-mask-net" required>
                    <Input
                      id="dest-mask-net"
                      value={destinationMask}
                      onChange={(e) => setDestinationMask(e.target.value)}
                      placeholder="e.g., 0.0.0.255"
                      disabled={loading}
                    />
                  </FormField>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
