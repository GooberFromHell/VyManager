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
import { Textarea } from "@/components/ui/textarea";
import { Fieldset, FormField } from "@/components/ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, X, Plus } from "lucide-react";
import { flowtablesService, type Flowtable } from "@/lib/api/firewall-flowtables";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface } from "@/lib/api/types/ethernet";

interface EditFlowtableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  flowtable: Flowtable | null;
}

export function EditFlowtableModal({
  open,
  onOpenChange,
  onSuccess,
  flowtable,
}: EditFlowtableModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [description, setDescription] = useState("");
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [offload, setOffload] = useState<string>("software");

  // Available interfaces
  const [availableInterfaces, setAvailableInterfaces] = useState<EthernetInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>("");

  // Reset and populate form when modal opens or flowtable changes
  useEffect(() => {
    if (open && flowtable) {
      resetForm();
      populateForm(flowtable);
      loadInterfaces();
    }
  }, [open, flowtable]);

  const resetForm = () => {
    setDescription("");
    setInterfaces([]);
    setOffload("software");
    setSelectedInterface("");
    setError(null);
  };

  const populateForm = (ft: Flowtable) => {
    setDescription(ft.description || "");
    setInterfaces(ft.interfaces || []);
    setOffload(ft.offload || "software");
  };

  const loadInterfaces = async () => {
    try {
      const config = await ethernetService.getConfig();
      setAvailableInterfaces(config.interfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const handleAddInterface = () => {
    if (selectedInterface && !interfaces.includes(selectedInterface)) {
      setInterfaces([...interfaces, selectedInterface]);
      setSelectedInterface("");
    }
  };

  const handleRemoveInterface = (iface: string) => {
    setInterfaces(interfaces.filter((i) => i !== iface));
  };

  const handleSubmit = async () => {
    if (!flowtable) return;

    if (interfaces.length === 0) {
      setError("At least one interface is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await flowtablesService.updateFlowtable(
        flowtable.name,
        {
          description: description.trim() || undefined,
          interfaces,
          offload,
        },
        flowtable
      );

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update flowtable");
    } finally {
      setLoading(false);
    }
  };

  if (!flowtable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Flowtable: {flowtable.name}</DialogTitle>
          <DialogDescription>
            Modify the flowtable configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Fieldset>
            <FormField
              label="Name"
              htmlFor="name"
              description="Flowtable name cannot be changed. Delete and recreate to rename."
            >
              <Input
                id="name"
                value={flowtable.name}
                disabled
                className="font-mono bg-muted"
              />
            </FormField>

            <FormField
              label="Description"
              htmlFor="description"
            >
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </FormField>
          </Fieldset>

          <Fieldset label="Interfaces">
            <FormField
              label="Add Interface"
              htmlFor="selectedInterface"
              description="Select the network interfaces to include in this flowtable."
              required
            >
              <div className="flex gap-2">
                <Select value={selectedInterface} onValueChange={setSelectedInterface}>
                  <SelectTrigger id="selectedInterface" className="flex-1">
                    <SelectValue placeholder="Select interface" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInterfaces
                      .filter((iface) => !interfaces.includes(iface.name))
                      .map((iface) => (
                        <SelectItem key={iface.name} value={iface.name}>
                          {iface.name}
                          {iface.description && (
                            <span className="text-muted-foreground ml-2">
                              - {iface.description}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddInterface}
                  disabled={!selectedInterface}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </FormField>
            {interfaces.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {interfaces.map((iface) => (
                  <Badge key={iface} variant="secondary" className="gap-1">
                    {iface}
                    <button
                      type="button"
                      onClick={() => handleRemoveInterface(iface)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <FormField
              label="Offload Type"
              htmlFor="offload"
              description="Software offload uses the kernel for processing. Hardware offload uses the NIC (requires compatible hardware)."
            >
              <Select value={offload} onValueChange={setOffload}>
                <SelectTrigger id="offload">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="software">Software (kernel-based)</SelectItem>
                  <SelectItem value="hardware">Hardware (NIC-based)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </Fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
