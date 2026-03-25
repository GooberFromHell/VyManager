"use client";

import {
  Download,
  File,
  FileSymlink,
  Folder,
  FolderOpen,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { FileEntry } from "@/lib/api/types/file-browser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "\u2014";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function navigateToParent(currentPath: string): string {
  if (currentPath === "/") return "/";
  const parts = currentPath.split("/").filter(Boolean);
  parts.pop();
  return parts.length === 0 ? "/" : "/" + parts.join("/");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FileGridViewProps {
  entries: FileEntry[];
  currentPath: string;
  isRoot: boolean;
  writeAllowed: boolean;
  onNavigate: (path: string) => void;
  onEntryClick: (entry: FileEntry) => void;
  onDownload: (entry: FileEntry) => void;
  onRename: (entry: FileEntry) => void;
  onDelete: (entry: FileEntry) => void;
  onUpload: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileGridView({
  entries,
  currentPath,
  isRoot,
  writeAllowed,
  onNavigate,
  onEntryClick,
  onDownload,
  onRename,
  onDelete,
  onUpload,
}: FileGridViewProps) {
  // Empty state — shown when there are no entries and no parent tile to display
  if (entries.length === 0 && isRoot) {
    return (
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
            ? { label: "Upload File", onClick: onUpload, icon: Upload }
            : undefined
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {/* Parent directory tile */}
      {!isRoot && (
        <div
          className="group relative rounded-lg border border-border p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors hover:bg-accent/50 hover:border-blue-500/30"
          onClick={() => onNavigate(navigateToParent(currentPath))}
        >
          <Folder className="h-10 w-10 text-blue-400" />
          <span className="font-mono text-sm">..</span>
        </div>
      )}

      {/* Empty state inside the grid when not at root but entries list is empty */}
      {entries.length === 0 && !isRoot && (
        <div className="col-span-full">
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
                ? { label: "Upload File", onClick: onUpload, icon: Upload }
                : undefined
            }
          />
        </div>
      )}

      {/* Entry tiles */}
      {entries.map((entry) => {
        const isDir = entry.type === "directory";

        return (
          <div
            key={entry.name}
            className={[
              "group relative rounded-lg border border-border p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors hover:bg-accent/50",
              isDir ? "hover:border-blue-500/30" : "",
            ]
              .join(" ")
              .trim()}
            onClick={() => onEntryClick(entry)}
          >
            {/* Large icon */}
            {isDir ? (
              <Folder className="h-10 w-10 text-blue-400" />
            ) : entry.type === "symlink" ? (
              <FileSymlink className="h-10 w-10 text-yellow-400" />
            ) : (
              <File className="h-10 w-10 text-muted-foreground" />
            )}

            {/* Filename */}
            <span
              className="text-sm font-mono truncate w-full text-center"
              title={entry.name}
            >
              {entry.name}
            </span>

            {/* Size label */}
            <span className="text-xs text-muted-foreground">
              {isDir ? "\u2014" : formatFileSize(entry.size)}
            </span>

            {/* Hover action overlay */}
            {writeAllowed && (
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-background/80 backdrop-blur-sm rounded-md p-0.5 flex gap-0.5">
                  {entry.type === "file" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Download"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(entry);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename(entry);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(entry);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
