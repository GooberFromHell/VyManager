"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { routeService } from "@/lib/api/route";
import { ApiError } from "@/lib/types/api";

interface CreateRoutePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  policyType: string;
}

export function CreateRoutePolicyModal({
  open,
  onOpenChange,
  onSuccess,
  policyType,
}: CreateRoutePolicyModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultLog, setDefaultLog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Policy name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await routeService.createPolicy(
        policyType,
        name.trim(),
        description.trim() || undefined,
        defaultLog
      );
      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create policy");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setDefaultLog(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {policyType === "route" ? "IPv4" : "IPv6"} Policy</DialogTitle>
          <DialogDescription>
            Create a new policy {policyType} for {policyType === "route" ? "IPv4" : "IPv6"} traffic routing
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          <Fieldset label="Basic Info">
            <FormField label="Policy Name" htmlFor="name" required>
              <Input
                id="name"
                placeholder="MY-POLICY"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </FormField>

            <FormField label="Description" htmlFor="description">
              <Input
                id="description"
                placeholder="Policy description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </FormField>
          </Fieldset>

          <FieldsetDivider />

          <Fieldset label="Options">
            <FormField
              label="Enable default logging for unmatched packets"
              htmlFor="defaultLog"
              horizontal
            >
              <Checkbox
                id="defaultLog"
                checked={defaultLog}
                onCheckedChange={(checked) => setDefaultLog(checked as boolean)}
                disabled={loading}
              />
            </FormField>
          </Fieldset>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Policy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
