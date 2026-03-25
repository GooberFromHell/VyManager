"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fieldset, FormField } from "@/components/ui/fieldset";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2 } from "lucide-react";
import type { VrrpSyncGroup, VrrpGroup } from "@/lib/api/high-availability";

interface SyncGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingGroup?: VrrpSyncGroup | null;
  vrrpGroups: VrrpGroup[];
  onSubmit: (group: VrrpSyncGroup) => Promise<void>;
}

interface FormState {
  name: string;
  members: string[];
  hc_failure_count: string;
  hc_interval: string;
  hc_ping: string;
  hc_script: string;
}

const emptyForm = (): FormState => ({
  name: "",
  members: [],
  hc_failure_count: "",
  hc_interval: "",
  hc_ping: "",
  hc_script: "",
});

function groupToForm(g: VrrpSyncGroup): FormState {
  return {
    name: g.name,
    members: [...g.members],
    hc_failure_count: g.health_check.failure_count ?? "",
    hc_interval: g.health_check.interval ?? "",
    hc_ping: g.health_check.ping ?? "",
    hc_script: g.health_check.script ?? "",
  };
}

export function SyncGroupModal({
  open,
  onOpenChange,
  existingGroup,
  vrrpGroups,
  onSubmit,
}: SyncGroupModalProps) {
  const isEdit = !!existingGroup;
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(existingGroup ? groupToForm(existingGroup) : emptyForm());
      setError(null);
    }
  }, [open, existingGroup]);

  const toggleMember = (name: string) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.includes(name)
        ? prev.members.filter((m) => m !== name)
        : [...prev.members, name],
    }));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.name.trim()) { setError("Sync group name is required"); return; }
    if (form.members.length === 0) { setError("At least one VRRP group member is required"); return; }

    setLoading(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        members: form.members,
        health_check: {
          failure_count: form.hc_failure_count.trim() || null,
          interval: form.hc_interval.trim() || null,
          ping: form.hc_ping.trim() || null,
          script: form.hc_script.trim() || null,
        },
        transition_script: existingGroup?.transition_script ?? {
          backup: null, fault: null, master: null, stop: null,
        },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? "Edit Sync Group" : "Add Sync Group"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Editing sync group "${existingGroup!.name}"`
              : "Synchronize VRRP state across multiple groups"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-5 py-2">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap font-mono leading-relaxed">{error}</p>
              </div>
            )}

            <FormField
              label="Sync Group Name"
              htmlFor="sg-name"
              required
              description={isEdit ? "Name cannot be changed" : undefined}
            >
              <Input
                id="sg-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                disabled={isEdit}
                placeholder="e.g. SYNC-GROUP-1"
                className={isEdit ? "opacity-60" : ""}
              />
            </FormField>

            <Separator />

            {/* Members */}
            <div className="space-y-3">
              <FormField
                label="VRRP Group Members"
                required
                description="Select which VRRP groups to synchronize together"
              >

              {vrrpGroups.length === 0 ? (
                <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                  No VRRP groups configured. Create VRRP groups first.
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {vrrpGroups.map((g) => (
                    <div
                      key={g.name}
                      className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer"
                      onClick={() => toggleMember(g.name)}
                    >
                      <Checkbox
                        id={`member-${g.name}`}
                        checked={form.members.includes(g.name)}
                        onCheckedChange={() => toggleMember(g.name)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          VRID {g.vrid ?? "?"} — {g.interface ?? "?"} — {g.addresses.length} IP(s)
                        </p>
                      </div>
                      {g.disabled && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
                    </div>
                  ))}
                </div>
              )}

              {form.members.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {form.members.length} member{form.members.length !== 1 ? "s" : ""} selected
                </p>
              )}
              </FormField>
            </div>

            <Separator />

            {/* Health Check */}
            <Fieldset label="Health Check (optional)">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Ping Target" htmlFor="hc-ping">
                  <Input
                    id="hc-ping"
                    value={form.hc_ping}
                    onChange={(e) => setForm((p) => ({ ...p, hc_ping: e.target.value }))}
                    placeholder="IP to ping"
                    className="font-mono"
                  />
                </FormField>
                <FormField label="Interval (s)" htmlFor="hc-interval">
                  <Input
                    id="hc-interval"
                    type="number"
                    min={1}
                    value={form.hc_interval}
                    onChange={(e) => setForm((p) => ({ ...p, hc_interval: e.target.value }))}
                    placeholder="10"
                  />
                </FormField>
                <FormField label="Failure Count" htmlFor="hc-fail-count">
                  <Input
                    id="hc-fail-count"
                    type="number"
                    min={1}
                    value={form.hc_failure_count}
                    onChange={(e) => setForm((p) => ({ ...p, hc_failure_count: e.target.value }))}
                    placeholder="3"
                  />
                </FormField>
                <FormField label="Script Path" htmlFor="hc-script">
                  <Input
                    id="hc-script"
                    value={form.hc_script}
                    onChange={(e) => setForm((p) => ({ ...p, hc_script: e.target.value }))}
                    placeholder="/path/to/script.sh"
                    className="font-mono"
                  />
                </FormField>
              </div>
            </Fieldset>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Sync Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
