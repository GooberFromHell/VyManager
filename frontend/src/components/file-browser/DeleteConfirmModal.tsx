"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";
import { fileBrowserService } from "@/lib/api/file-browser";
import type { FileEntry } from "@/lib/api/types/file-browser";
import { useToast } from "@/hooks/useToast";

interface DeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FileEntry | null;
  currentPath: string;
  onSuccess: () => void;
}

export function DeleteConfirmModal({
  open,
  onOpenChange,
  entry,
  currentPath,
  onSuccess,
}: DeleteConfirmModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!entry) return;

    const fullPath =
      currentPath === "/"
        ? "/" + entry.name
        : currentPath + "/" + entry.name;

    setLoading(true);
    setError(null);

    try {
      await fileBrowserService.deleteItem(fullPath);
      toast.success(`"${entry.name}" deleted`);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const isDirectory = entry?.type === "directory";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {isDirectory ? "Directory" : "File"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block mb-2">
              Are you sure you want to delete{" "}
              <span className="font-mono font-semibold text-foreground">
                {entry?.name}
              </span>
              ?
            </span>
            {isDirectory && (
              <span className="block text-amber-400 text-xs">
                The directory must be empty before it can be deleted.
              </span>
            )}
            <span className="block mt-1 text-xs">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
