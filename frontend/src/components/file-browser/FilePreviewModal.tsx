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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { fileBrowserService } from "@/lib/api/file-browser";
import type { FileReadResponse } from "@/lib/api/types/file-browser";

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string | null;
}

export function FilePreviewModal({
  open,
  onOpenChange,
  filePath,
}: FilePreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<FileReadResponse | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open || !filePath) {
      setFileData(null);
      setError(null);
      return;
    }

    const fetchFile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fileBrowserService.readFile(filePath);
        setFileData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read file");
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [open, filePath]);

  const handleDownload = async () => {
    if (!filePath) return;
    setDownloading(true);
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
    } finally {
      setDownloading(false);
    }
  };

  const filename = filePath ? filePath.split("/").pop() || filePath : "";
  const isBinaryOrTruncated = fileData?.binary || fileData?.truncated;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{filename}</DialogTitle>
          <DialogDescription className="font-mono text-xs truncate">
            {filePath}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[200px]">
          {loading && (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && fileData && (
            <>
              {isBinaryOrTruncated ? (
                <div className="rounded-lg border border-border bg-muted/30 p-6 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {fileData.binary
                      ? "This file appears to be binary and cannot be previewed as text."
                      : `File is too large to preview (${fileData.size.toLocaleString()} bytes). Only the first portion is shown.`}
                  </p>
                  {fileData.truncated && fileData.content && (
                    <ScrollArea className="h-[300px] text-left">
                      <pre className="text-sm font-mono whitespace-pre-wrap p-4">
                        {fileData.content}
                      </pre>
                    </ScrollArea>
                  )}
                  <Button variant="outline" onClick={handleDownload} disabled={downloading}>
                    <Download className="mr-2 h-4 w-4" />
                    {downloading ? "Downloading..." : "Download File"}
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px] rounded-lg border border-border">
                  <pre className="text-sm font-mono whitespace-pre-wrap p-4">
                    {fileData.content || ""}
                  </pre>
                </ScrollArea>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!loading && !error && fileData && !isBinaryOrTruncated && (
            <Button onClick={handleDownload} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Downloading..." : "Download"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
