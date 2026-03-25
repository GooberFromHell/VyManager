"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Download,
  File,
  FileSymlink,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  LayoutList,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { fileBrowserService } from "@/lib/api/file-browser";
import type { FileEntry } from "@/lib/api/types/file-browser";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { FilePreviewModal } from "./FilePreviewModal";
import { UploadFileModal } from "./UploadFileModal";
import { CreateDirectoryModal } from "./CreateDirectoryModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { RenameModal } from "./RenameModal";
import { FileGridView } from "./FileGridView";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "\u2014";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function FileIcon({ type }: { type: FileEntry["type"] }) {
  switch (type) {
    case "directory":
      return <Folder className="h-4 w-4 text-blue-400 shrink-0" />;
    case "symlink":
      return <FileSymlink className="h-4 w-4 text-yellow-400 shrink-0" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function buildPathSegments(path: string): { label: string; href: string }[] {
  if (path === "/") return [{ label: "/", href: "/" }];
  const parts = path.split("/").filter(Boolean);
  const segments: { label: string; href: string }[] = [
    { label: "/", href: "/" },
  ];
  let accumulated = "";
  for (const part of parts) {
    accumulated += "/" + part;
    segments.push({ label: part, href: accumulated });
  }
  return segments;
}

function navigateToParent(currentPath: string): string {
  if (currentPath === "/") return "/";
  const parts = currentPath.split("/").filter(Boolean);
  parts.pop();
  return parts.length === 0 ? "/" : "/" + parts.join("/");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FileBrowserContent() {
  const { canWrite } = usePermissions();

  const [currentPath, setCurrentPath] = useState("/");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<FileEntry | null>(null);
  const [renameItem, setRenameItem] = useState<FileEntry | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [layout, setLayout] = useState<"table" | "grid">("table");

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fileBrowserService.listDirectory(path);
      setEntries(result.entries);
      setCurrentPath(result.path || path);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load directory"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory("/");
  }, [loadDirectory]);

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.type === "directory") {
      const next =
        currentPath === "/" ? "/" + entry.name : currentPath + "/" + entry.name;
      handleNavigate(next);
    } else {
      const filePath =
        currentPath === "/" ? "/" + entry.name : currentPath + "/" + entry.name;
      setPreviewPath(filePath);
    }
  };

  const handleDownload = async (entry: FileEntry) => {
    const filePath =
      currentPath === "/" ? "/" + entry.name : currentPath + "/" + entry.name;
    try {
      const { blob, filename } = await fileBrowserService.downloadFile(filePath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const afterMutation = () => {
    loadDirectory(currentPath);
  };

  const segments = buildPathSegments(currentPath);
  const isRoot = currentPath === "/";
  const writeAllowed = canWrite(FeatureGroup.FILE_BROWSER);
  const colSpan = writeAllowed ? 5 : 4;

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <ErrorAlert
          title="Error Loading Directory"
          message={error}
          onRetry={() => loadDirectory(currentPath)}
          className="max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="File Browser"
        description="Browse and manage files on the VyOS device"
        actions={
          writeAllowed ? (
            <div className="flex gap-2">
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
              <Button variant="outline" onClick={() => setMkdirOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Breadcrumb navigation */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm" aria-label="Directory path">
          {segments.map((seg, idx) => {
            const isLast = idx === segments.length - 1;
            return (
              <span key={seg.href} className="flex items-center gap-1">
                {(isLast && idx >= 1) && <span className="text-muted-foreground select-none">/</span>}
                {isLast ? (
                  <span className="font-mono font-medium text-foreground">
                    {seg.label}
                  </span>
                ) : (
                  <button
                    onClick={() => handleNavigate(seg.href)}
                    className="font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {seg.label}
                  </button>
                )}
              </span>
            );
          })}
          {loading && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-2" />
          )}
        </nav>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout("table")}
            className={layout === "table" ? "bg-accent" : ""}
            title="Table view"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLayout("grid")}
            className={layout === "grid" ? "bg-accent" : ""}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error banner (for errors after initial load) */}
      {error && entries.length > 0 && (
        <ErrorAlert
          message={error}
          onRetry={() => loadDirectory(currentPath)}
        />
      )}

      {/* File table / grid */}
      {layout === "table" ? (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[100px]">Size</TableHead>
                <TableHead className="w-[130px]">Permissions</TableHead>
                <TableHead className="w-[180px]">Modified</TableHead>
                {writeAllowed && (
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Parent directory row */}
              {!isRoot && (
                <TableRow
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => handleNavigate(navigateToParent(currentPath))}
                >
                  <TableCell className="flex items-center gap-2 font-mono">
                    <Folder className="h-4 w-4 text-blue-400 shrink-0" />
                    ..
                  </TableCell>
                  <TableCell className="text-muted-foreground">\u2014</TableCell>
                  <TableCell className="text-muted-foreground">\u2014</TableCell>
                  <TableCell className="text-muted-foreground">\u2014</TableCell>
                  {writeAllowed && <TableCell />}
                </TableRow>
              )}

              {/* Empty state */}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colSpan}>
                    <EmptyState
                      icon={FolderOpen}
                      title="This directory is empty"
                      description={
                        writeAllowed
                          ? "Upload a file or create a new folder to get started"
                          : undefined
                      }
                      action={
                        writeAllowed
                          ? { label: "Upload File", onClick: () => setUploadOpen(true), icon: Upload }
                          : undefined
                      }
                      compact
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Entries */}
              {entries.map((entry) => {
                const isDir = entry.type === "directory";
                return (
                  <TableRow
                    key={entry.name}
                    className={
                      isDir || entry.type === "file"
                        ? "cursor-pointer hover:bg-accent/50"
                        : ""
                    }
                    onClick={() => handleEntryClick(entry)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono">
                        <FileIcon type={entry.type} />
                        <span className={isDir ? "text-blue-400 font-medium" : ""}>
                          {entry.name}
                        </span>
                        {entry.type === "symlink" && (
                          <span className="text-xs text-muted-foreground">(symlink)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {isDir ? "\u2014" : formatFileSize(entry.size)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {entry.permissions || "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.modified
                        ? new Date(entry.modified).toLocaleString()
                        : "\u2014"}
                    </TableCell>
                    {writeAllowed && (
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {entry.type === "file" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Download"
                              onClick={() => handleDownload(entry)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Rename"
                            onClick={() => setRenameItem(entry)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            onClick={() => setDeleteItem(entry)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <FileGridView
          entries={entries}
          currentPath={currentPath}
          isRoot={isRoot}
          writeAllowed={writeAllowed}
          onNavigate={handleNavigate}
          onEntryClick={handleEntryClick}
          onDownload={handleDownload}
          onRename={setRenameItem}
          onDelete={setDeleteItem}
          onUpload={() => setUploadOpen(true)}
        />
      )}

      {/* Modals */}
      <FilePreviewModal
        open={previewPath !== null}
        onOpenChange={(open) => { if (!open) setPreviewPath(null); }}
        filePath={previewPath}
      />

      <UploadFileModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        currentPath={currentPath}
        onSuccess={afterMutation}
      />

      <CreateDirectoryModal
        open={mkdirOpen}
        onOpenChange={setMkdirOpen}
        currentPath={currentPath}
        onSuccess={afterMutation}
      />

      <DeleteConfirmModal
        open={deleteItem !== null}
        onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
        entry={deleteItem}
        currentPath={currentPath}
        onSuccess={afterMutation}
      />

      <RenameModal
        open={renameItem !== null}
        onOpenChange={(open) => { if (!open) setRenameItem(null); }}
        entry={renameItem}
        currentPath={currentPath}
        onSuccess={afterMutation}
      />
    </div>
  );
}
