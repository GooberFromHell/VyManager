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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { AlertCircle } from "lucide-react";
import { routerAdvertService } from "@/lib/api/router-advert";
import type {
  RouterAdvertCapabilities,
  RouterAdvertBatchOperation,
} from "@/lib/api/types/router-advert";
import { ApiError } from "@/lib/types/api";

const isValidIPv6Prefix = (value: string): boolean => {
  const parts = value.split("/");
  if (parts.length !== 2) return false;
  const prefixLen = parseInt(parts[1]);
  if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 128) return false;
  // Basic IPv6 address check
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(parts[0]);
};

interface AddRouterAdvertInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingInterfaces: string[];
  capabilities: RouterAdvertCapabilities | null;
}

export function AddRouterAdvertInterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
  capabilities,
}: AddRouterAdvertInterfaceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ifaceName, setIfaceName] = useState("");
  const [initialPrefix, setInitialPrefix] = useState("");
  const [defaultPreference, setDefaultPreference] = useState("medium");
  const [managedFlag, setManagedFlag] = useState(false);
  const [otherConfigFlag, setOtherConfigFlag] = useState(false);
  const [sendAdvert, setSendAdvert] = useState(false);

  const resetForm = () => {
    setIfaceName("");
    setInitialPrefix("");
    setDefaultPreference("medium");
    setManagedFlag(false);
    setOtherConfigFlag(false);
    setSendAdvert(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    const trimmed = ifaceName.trim();
    if (!trimmed) {
      setError("Interface name is required");
      return false;
    }
    if (existingInterfaces.includes(trimmed)) {
      setError("This interface already has a router advertisement configuration");
      return false;
    }
    const trimmedPrefix = initialPrefix.trim();
    if (trimmedPrefix && !isValidIPv6Prefix(trimmedPrefix)) {
      setError("Invalid IPv6 prefix format (e.g., 2001:db8::/64)");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const operations: RouterAdvertBatchOperation[] = [
        { op: "set_interface" },
      ];

      if (defaultPreference) {
        operations.push({ op: "set_default_preference", value: defaultPreference });
      }

      if (managedFlag) {
        operations.push({ op: "set_managed_flag" });
      }

      if (otherConfigFlag) {
        operations.push({ op: "set_other_config_flag" });
      }

      if (capabilities?.has_send_advert_bool && sendAdvert) {
        operations.push({ op: "set_send_advert" });
      }

      const trimmedPrefix = initialPrefix.trim();
      if (trimmedPrefix) {
        operations.push({ op: "set_prefix", value: trimmedPrefix });
      }

      await routerAdvertService.addInterface(ifaceName.trim(), operations);
      await routerAdvertService.refreshConfig();
      onSuccess();
      handleClose();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to add router advertisement interface"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Router Advertisement Interface</DialogTitle>
          <DialogDescription>
            Configure IPv6 router advertisements on a network interface
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Fieldset label="Interface">
            <FormField
              label="Interface Name"
              htmlFor="iface-name"
              description="Name of the network interface to send router advertisements on"
              required
            >
              <Input
                id="iface-name"
                value={ifaceName}
                onChange={(e) => setIfaceName(e.target.value)}
                placeholder="e.g., eth0"
              />
            </FormField>

            <FormField
              label="Initial Prefix"
              htmlFor="initial-prefix"
              description="IPv6 network prefix to advertise (optional, can be added later)"
            >
              <Input
                id="initial-prefix"
                value={initialPrefix}
                onChange={(e) => setInitialPrefix(e.target.value)}
                placeholder="e.g., 2001:db8::/64"
              />
            </FormField>

            <FormField
              label="Default Preference"
              htmlFor="default-preference"
              description="Preference of this router over other default routers"
            >
              <Select value={defaultPreference} onValueChange={setDefaultPreference}>
                <SelectTrigger id="default-preference" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </Fieldset>

          <FieldsetDivider />

          <Fieldset label="Flags">
            <FormField
              label="Managed Flag"
              htmlFor="managed-flag"
              description="Indicate that addresses are managed via DHCPv6"
              horizontal
            >
              <Checkbox
                id="managed-flag"
                checked={managedFlag}
                onCheckedChange={(checked) => setManagedFlag(checked as boolean)}
              />
            </FormField>

            <FormField
              label="Other Config Flag"
              htmlFor="other-config-flag"
              description="Indicate that other configuration is available via DHCPv6"
              horizontal
            >
              <Checkbox
                id="other-config-flag"
                checked={otherConfigFlag}
                onCheckedChange={(checked) =>
                  setOtherConfigFlag(checked as boolean)
                }
              />
            </FormField>

            {capabilities?.has_send_advert_bool && (
              <FormField
                label="Send Advert"
                htmlFor="send-advert"
                description="Enable sending of router advertisement messages"
                horizontal
              >
                <Checkbox
                  id="send-advert"
                  checked={sendAdvert}
                  onCheckedChange={(checked) =>
                    setSendAdvert(checked as boolean)
                  }
                />
              </FormField>
            )}
          </Fieldset>

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
            {loading ? "Adding..." : "Add Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
