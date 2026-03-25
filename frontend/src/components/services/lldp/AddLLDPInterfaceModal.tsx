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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { lldpService } from "@/lib/api/lldp";
import { ApiError } from "@/lib/types/api";

interface AddLLDPInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingInterfaces: string[];
}

export function AddLLDPInterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
}: AddLLDPInterfaceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [locationElin, setLocationElin] = useState("");

  const resetForm = () => {
    setName("");
    setDisabled(false);
    setLocationElin("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Interface name is required");
      return false;
    }

    if (existingInterfaces.includes(trimmed)) {
      setError("This interface already exists in the LLDP configuration");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const operations: { op: string; value?: string }[] = [{ op: "set_interface" }];

      if (disabled) {
        operations.push({ op: "set_disable" });
      }

      const trimmedElin = locationElin.trim();
      if (trimmedElin) {
        operations.push({ op: "set_location_elin", value: trimmedElin });
      }

      await lldpService.addInterface(name.trim(), operations);
      await lldpService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to add LLDP interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add LLDP Interface</DialogTitle>
          <DialogDescription>
            Add a new interface to the LLDP configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            label="Interface Name"
            htmlFor="iface-name"
            required
            description="Name of the network interface to enable LLDP on"
          >
            <Input
              id="iface-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., eth0"
            />
          </FormField>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="iface-disabled"
              checked={disabled}
              onCheckedChange={(checked) => setDisabled(checked as boolean)}
            />
            <div className="space-y-1">
              <label htmlFor="iface-disabled" className="text-sm font-medium cursor-pointer">
                Disabled
              </label>
              <p className="text-xs text-muted-foreground">
                Add interface in a disabled state
              </p>
            </div>
          </div>

          <FormField
            label="Location ELIN"
            htmlFor="location-elin"
            description="Emergency Location Identification Number (optional)"
          >
            <Input
              id="location-elin"
              value={locationElin}
              onChange={(e) => setLocationElin(e.target.value)}
              placeholder="e.g., 5558675309"
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
            {loading ? "Adding..." : "Add Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
