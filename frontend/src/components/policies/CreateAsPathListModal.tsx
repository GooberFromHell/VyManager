"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { asPathListService } from "@/lib/api/as-path-list";

interface CreateAsPathListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAsPathListModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateAsPathListModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleNumber, setRuleNumber] = useState("100");
  const [ruleDescription, setRuleDescription] = useState("");
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [regex, setRegex] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setRuleNumber("100");
    setRuleDescription("");
    setAction("permit");
    setRegex("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("AS path list name is required");
      return;
    }

    if (!ruleNumber || isNaN(Number(ruleNumber))) {
      setError("Valid rule number is required");
      return;
    }

    if (!regex.trim()) {
      setError("Regex pattern is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await asPathListService.createAsPathList(
        name.trim(),
        description.trim() || null,
        {
          rule_number: Number(ruleNumber),
          description: ruleDescription.trim() || null,
          action,
          regex: regex.trim(),
        }
      );

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create AS path list");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create AS Path List</DialogTitle>
          <DialogDescription>
            Create a new BGP AS path list with an initial rule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <Fieldset label="AS Path List">
            <FormField label="AS Path List Name" htmlFor="name" required>
              <Input
                id="name"
                placeholder="e.g., ALLOW_AS65000"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </FormField>

            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </FormField>
          </Fieldset>

          <FieldsetDivider />

          <Fieldset label="Initial Rule">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Rule Number" htmlFor="ruleNumber" required>
                <Input
                  id="ruleNumber"
                  type="number"
                  placeholder="100"
                  value={ruleNumber}
                  onChange={(e) => setRuleNumber(e.target.value)}
                  disabled={loading}
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

            <FormField
              label="Regex Pattern"
              htmlFor="regex"
              description='Regular expression to match AS paths (e.g., "64501 64502")'
              required
            >
              <Input
                id="regex"
                placeholder="e.g., ^65000_"
                value={regex}
                onChange={(e) => setRegex(e.target.value)}
                disabled={loading}
              />
            </FormField>

            <FormField label="Rule Description" htmlFor="ruleDescription">
              <Input
                id="ruleDescription"
                placeholder="Optional rule description"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                disabled={loading}
              />
            </FormField>
          </Fieldset>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Creating..." : "Create AS Path List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
