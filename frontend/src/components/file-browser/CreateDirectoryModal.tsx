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
import { Fieldset, FormField } from "@/components/ui/fieldset";
import { AlertCircle } from "lucide-react";
import { fileBrowserService } from "@/lib/api/file-browser";
import { useToast } from "@/hooks/useToast";

interface CreateDirectoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  onSuccess: () => void;
}

export function CreateDirectoryModal({
  open,
  onOpenChange,
  currentPath,
  onSuccess,
}: CreateDirectoryModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  const resetForm = () => {
    setName("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Directory name is required");
      return;
    }
    if (trimmed.includes("/")) {
      setError("Directory name cannot contain slashes");
      return;
    }

    const fullPath =
      currentPath === "/" ? "/" + trimmed : currentPath + "/" + trimmed;

    setLoading(true);
    setError(null);

    try {
      await fileBrowserService.createDirectory(fullPath);
      toast.success(`Directory "${trimmed}" created`);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create directory");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
          <DialogDescription>
            Create a new directory in{" "}
            <span className="font-mono text-xs">{currentPath}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Fieldset>
            <FormField
              label="Directory Name"
              htmlFor="dir-name"
              required
            >
              <Input
                id="dir-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., backups"
                autoFocus
              />
            </FormField>
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
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
