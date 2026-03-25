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
import { Textarea } from "@/components/ui/textarea";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Building2, Network } from "lucide-react";
import { sessionService, Site, Instance } from "@/lib/api/session";
import { ApiError } from "@/lib/types/api";

interface EditSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  site: Site | null;
}

export function EditSiteModal({
  open,
  onOpenChange,
  onSuccess,
  site,
}: EditSiteModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [proxyHostId, setProxyHostId] = useState<string | null>(null);
  const [siteInstances, setSiteInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (site && open) {
      setName(site.name);
      setDescription(site.description || "");
      setProxyHostId(site.proxy_host_id ?? null);
    }
  }, [site, open]);

  useEffect(() => {
    if (open && site) {
      sessionService
        .listInstances(site.id)
        .then(setSiteInstances)
        .catch(() => setSiteInstances([]));
    }
  }, [open, site]);

  const handleClose = () => {
    setName("");
    setDescription("");
    setProxyHostId(null);
    setSiteInstances([]);
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!site) return;

    if (!name.trim()) {
      setError("Site name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sessionService.updateSite(site.id, {
        name: name.trim(),
        description: description.trim() || null,
        proxy_host_id: proxyHostId,
      });

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update site");
    } finally {
      setLoading(false);
    }
  };

  if (!site) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit Site</DialogTitle>
              <DialogDescription>
                Update site information
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Error Display */}
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            )}

            <Fieldset>
              <FormField
                label="Site Name"
                htmlFor="name"
                required
              >
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Main Office, Data Center 1"
                  disabled={loading}
                  required
                />
              </FormField>

              <FormField
                label="Description (Optional)"
                htmlFor="description"
              >
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional information about this site..."
                  rows={3}
                  disabled={loading}
                />
              </FormField>
            </Fieldset>

            <FieldsetDivider />

            <Fieldset
              label="Advanced"
              description="Optional network topology settings for this site"
            >
              <FormField
                label="Proxy Host"
                htmlFor="proxy-host"
                description="Designate a router as a jump host for connecting to other instances at this site"
              >
                <Select
                  value={proxyHostId ?? "__none__"}
                  onValueChange={(value) =>
                    setProxyHostId(value === "__none__" ? null : value)
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="proxy-host" className="w-full">
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="None" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">None</span>
                    </SelectItem>
                    {siteInstances.map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {instance.name}
                        <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                          ({instance.host})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </Fieldset>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
