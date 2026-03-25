/**
 * TypeScript types for File Browser API
 */

export interface FileEntry {
  name: string;
  type: "file" | "directory" | "symlink" | "other";
  size: number;
  permissions: string; // e.g. "rwxr-xr-x"
  modified: string; // ISO datetime
  owner: string;
  group: string;
}

export interface DirectoryListResponse {
  path: string;
  entries: FileEntry[];
}

export interface FileReadResponse {
  path: string;
  content: string | null;
  size: number;
  truncated?: boolean;
  binary?: boolean;
  message?: string;
}

export interface FileOperationResponse {
  success: boolean;
  path: string;
  size?: number;
  old_path?: string;
  new_path?: string;
}
