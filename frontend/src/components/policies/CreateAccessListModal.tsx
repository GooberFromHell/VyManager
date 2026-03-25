"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { accessListService, type AccessList } from "@/lib/api/access-list";

interface CreateAccessListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  listType: "ipv4" | "ipv6";
  existingLists: AccessList[];
}

export function CreateAccessListModal({ open, onOpenChange, onSuccess, listType, existingLists }: CreateAccessListModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  // Basic tab
  const [listNumber, setListNumber] = useState("");
  const [listDescription, setListDescription] = useState("");

  // First rule tab
  const [ruleNumber, setRuleNumber] = useState(100);
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [ruleDescription, setRuleDescription] = useState("");
  const [sourceType, setSourceType] = useState<"any" | "host" | "network">("any");
  const [sourceNetworkFormat, setSourceNetworkFormat] = useState<"network" | "inverse-mask">("network");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceMask, setSourceMask] = useState("");
  const [destinationType, setDestinationType] = useState<"any" | "host" | "network">("any");
  const [destinationNetworkFormat, setDestinationNetworkFormat] = useState<"network" | "inverse-mask">("network");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationMask, setDestinationMask] = useState("");

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

  const resetForm = () => {
    setListNumber("");
    setListDescription("");
    setRuleNumber(100);
    setAction("permit");
    setRuleDescription("");
    setSourceType("any");
    setSourceAddress("");
    setSourceMask("");
    setDestinationType("any");
    setDestinationAddress("");
    setDestinationMask("");
    setActiveTab("basic");
  };

  const handleClose = () => {
    setError(null);
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!listNumber.trim()) {
      setError(`Please enter an access list ${listType === "ipv4" ? "number" : "name"}`);
      setActiveTab("basic");
      return;
    }

    // Validate source fields
    if (sourceType === "host" && !sourceAddress.trim()) {
      setError("Please enter a source address for host type");
      setActiveTab("rule");
      return;
    }
    if (sourceType === "network" && !sourceAddress.trim()) {
      setError("Please enter a source address for network type");
      setActiveTab("rule");
      return;
    }
    if (sourceType === "network" && listType === "ipv4" && !sourceMask.trim()) {
      setError("Please enter a source mask for network type");
      setActiveTab("rule");
      return;
    }

    // Validate destination fields
    if (destinationType === "host" && !destinationAddress.trim()) {
      setError("Please enter a destination address for host type");
      setActiveTab("rule");
      return;
    }
    if (destinationType === "network" && !destinationAddress.trim()) {
      setError("Please enter a destination address for network type");
      setActiveTab("rule");
      return;
    }
    if (destinationType === "network" && listType === "ipv4" && !destinationMask.trim()) {
      setError("Please enter a destination mask for network type");
      setActiveTab("rule");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map network type to inverse-mask (always use inverse-mask for network in IPv4)
      const actualSourceType = sourceType === "network" ? "inverse-mask" : sourceType;
      const actualDestinationType = destinationType === "network" ? "inverse-mask" : destinationType;

      // Build first rule
      const firstRule: any = {
        rule_number: ruleNumber,
        action,
        description: ruleDescription || null,
        source_type: actualSourceType,
        source_address: sourceAddress || null,
        source_mask: sourceMask || null,
        destination_type: actualDestinationType,
        destination_address: destinationAddress || null,
        destination_mask: destinationMask || null,
      };

      await accessListService.createAccessList(
        listNumber.trim(),
        listType,
        listDescription || null,
        firstRule
      );
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create access list");
    } finally {
      setLoading(false);
    }
  };

  const getHelperText = () => {
    if (listType === "ipv6") {
      return "Enter a unique name for the IPv6 access list";
    }
    return "Standard: 1-99, 1300-1999 | Extended: 100-199, 2000-2699";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create {listType.toUpperCase()} Access List</DialogTitle>
          <DialogDescription>
            Create a new access list with the first rule
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="rule">First Rule</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <Fieldset label="Access List">
              <FormField
                label={listType === "ipv4" ? "Access List Number" : "Access List Name"}
                htmlFor="list-number"
                description={getHelperText()}
                required
              >
                <Input
                  id="list-number"
                  value={listNumber}
                  onChange={(e) => setListNumber(e.target.value)}
                  placeholder={listType === "ipv4" ? "e.g., 100" : "e.g., MY-ACL"}
                  disabled={loading}
                />
              </FormField>

              <FormField label="Description" htmlFor="list-description">
                <Input
                  id="list-description"
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  placeholder="Enter access list description (optional)"
                  disabled={loading}
                />
              </FormField>
            </Fieldset>
          </TabsContent>

          {/* First Rule Tab */}
          <TabsContent value="rule" className="space-y-5 mt-4">
            <Fieldset label="Rule Info">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Rule Number"
                  htmlFor="rule-number"
                  description="Default starting rule number"
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
                      placeholder={listType === "ipv4" ? "e.g., 192.168.1.1" : "e.g., 2001:db8::1"}
                      disabled={loading}
                    />
                  </FormField>
                </div>
              )}

              {sourceType === "network" && (
                <div className="space-y-3 mt-3">
                  {listType === "ipv4" ? (
                    <div className="grid grid-cols-2 gap-4">
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
                  ) : (
                    <FormField label="Network (CIDR)" htmlFor="source-address-net6" required>
                      <Input
                        id="source-address-net6"
                        value={sourceAddress}
                        onChange={(e) => setSourceAddress(e.target.value)}
                        placeholder="e.g., 2001:db8::/32"
                        disabled={loading}
                      />
                    </FormField>
                  )}
                </div>
              )}
            </div>

            {/* Destination Configuration */}
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
                      placeholder={listType === "ipv4" ? "e.g., 10.0.0.1" : "e.g., 2001:db8::2"}
                      disabled={loading}
                    />
                  </FormField>
                </div>
              )}

              {destinationType === "network" && (
                <div className="space-y-3 mt-3">
                  {listType === "ipv4" ? (
                    <div className="grid grid-cols-2 gap-4">
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
                  ) : (
                    <FormField label="Network (CIDR)" htmlFor="dest-address-net6" required>
                      <Input
                        id="dest-address-net6"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        placeholder="e.g., 2001:db8:1::/48"
                        disabled={loading}
                      />
                    </FormField>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

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
            {loading ? "Creating..." : "Create Access List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
