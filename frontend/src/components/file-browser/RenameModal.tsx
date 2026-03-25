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
import { Fieldset, FormField } from "@/components/ui/fieldset";
import { AlertCircle } from "lucide-react";
import { fileBrowserService } from "@/lib/api/file-browser";
import type { FileEntry } from "@/lib/api/types/file-browser";
import { useToast } from "@/hooks/useToast";

interface RenameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FileEntry | null;
  currentPath: string;
  onSuccess: () => void;
}

export function RenameModal({
  open,
  onOpenChange,
  entry,
  currentPath,
  onSuccess,
}: RenameModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (open && entry) {
      setNewName(entry.name);
      setError(null);
    }
  }, [open, entry]);

  const resetForm = () => {
    setNewName("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!entry) return;

    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    if (trimmed.includes("/")) {
      setError("Name cannot contain slashes");
      return;
    }
    if (trimmed === entry.name) {
      setError("New name must be different from the current name");
      return;
    }

    const oldPath =
      currentPath === "/"
        ? "/" + entry.name
        : currentPath + "/" + entry.name;
    const newPath =
      currentPath === "/"
        ? "/" + trimmed
        : currentPath + "/" + trimmed;

    setLoading(true);
    setError(null);

    try {
      await fileBrowserService.rename(oldPath, newPath);
      toast.success(`Renamed "${entry.name}" to "${trimmed}"`);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
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
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription>
            Enter a new name for{" "}
            <span className="font-mono text-xs">{entry?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Fieldset>
            <FormField
              label="New Name"
              htmlFor="rename-input"
              required
            >
              <Input
                id="rename-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
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
            {loading ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
