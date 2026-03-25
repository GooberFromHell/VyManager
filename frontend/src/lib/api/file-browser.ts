/**
 * File Browser Service API
 */

import { apiClient } from "./client";
import type {
  DirectoryListResponse,
  FileReadResponse,
  FileOperationResponse,
} from "./types/file-browser";

class FileBrowserService {
  /**
   * List contents of a directory
   */
  async listDirectory(path: string = "/"): Promise<DirectoryListResponse> {
    return apiClient.get<DirectoryListResponse>("/vyos/file-browser/list", {
      path,
    });
  }

  /**
   * Read a text file for preview
   */
  async readFile(
    path: string,
    maxSize: number = 1048576
  ): Promise<FileReadResponse> {
    return apiClient.get<FileReadResponse>("/vyos/file-browser/read", {
      path,
      max_size: String(maxSize),
    });
  }

  /**
   * Download a file (returns a Blob)
   *
   * Uses raw fetch instead of apiClient because the response is a binary
   * blob, not JSON.
   */
  async downloadFile(path: string): Promise<{ blob: Blob; filename: string }> {
    const params = new URLSearchParams({ path });
    const response = await fetch(`/api/vyos/file-browser/download?${params}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Download failed" }));
      throw new Error(error.error || error.detail || "Download failed");
    }

    const disposition = response.headers.get("Content-Disposition");
    let filename = path.split("/").pop() || "download";
    if (disposition) {
      const match = disposition.match(/filename="?([^";\n]+)"?/);
      if (match) filename = match[1];
    }

    const blob = await response.blob();
    return { blob, filename };
  }

  /**
   * Upload a file to a directory
   *
   * Uses raw fetch instead of apiClient because the request body is
   * multipart form data, not JSON.
   */
  async uploadFile(
    directoryPath: string,
    file: File
  ): Promise<FileOperationResponse> {
    const formData = new FormData();
    formData.append("path", directoryPath);
    formData.append("file", file);

    const response = await fetch("/api/vyos/file-browser/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || error.detail || "Upload failed");
    }

    return response.json();
  }

  /**
   * Create a new directory
   */
  async createDirectory(path: string): Promise<FileOperationResponse> {
    return apiClient.post<FileOperationResponse>("/vyos/file-browser/mkdir", {
      path,
    });
  }

  /**
   * Rename or move a file/directory
   */
  async rename(
    oldPath: string,
    newPath: string
  ): Promise<FileOperationResponse> {
    return apiClient.post<FileOperationResponse>("/vyos/file-browser/rename", {
      old_path: oldPath,
      new_path: newPath,
    });
  }

  /**
   * Delete a file or empty directory
   */
  async deleteItem(path: string): Promise<FileOperationResponse> {
    return apiClient.delete<FileOperationResponse>(
      `/vyos/file-browser/delete?path=${encodeURIComponent(path)}`
    );
  }
}

export const fileBrowserService = new FileBrowserService();
