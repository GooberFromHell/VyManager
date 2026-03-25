"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { routeService, PolicyRoute } from "@/lib/api/route";
import { ApiError } from "@/lib/types/api";

interface EditRoutePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  policy: PolicyRoute;
}

export function EditRoutePolicyModal({
  open,
  onOpenChange,
  onSuccess,
  policy,
}: EditRoutePolicyModalProps) {
  const [description, setDescription] = useState("");
  const [defaultLog, setDefaultLog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && policy) {
      setDescription(policy.description || "");
      setDefaultLog(policy.default_log || false);
    }
  }, [open, policy]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await routeService.updatePolicy(
        policy.policy_type,
        policy.name,
        description.trim() || undefined,
        defaultLog
      );
      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update policy");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Policy: {policy.name}</DialogTitle>
          <DialogDescription>
            Update policy configuration
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          <Fieldset>
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
            {loading ? "Updating..." : "Update Policy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
