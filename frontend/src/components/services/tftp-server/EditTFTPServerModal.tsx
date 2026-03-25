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
import { Checkbox } from "@/components/ui/checkbox";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Plus, X, Loader2 } from "lucide-react";
import { tftpServerService } from "@/lib/api/tftp-server";
import type {
  TFTPServerConfig,
  TFTPServerCapabilities,
} from "@/lib/api/types/tftp-server";
import { ApiError } from "@/lib/types/api";

interface EditTFTPServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: TFTPServerConfig | null;
  capabilities: TFTPServerCapabilities | null;
}

export function EditTFTPServerModal({
  open,
  onOpenChange,
  onSuccess,
  config,
  capabilities,
}: EditTFTPServerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [directory, setDirectory] = useState("");
  const [port, setPort] = useState("");
  const [listenAddresses, setListenAddresses] = useState<string[]>([]);
  const [allowUpload, setAllowUpload] = useState(false);

  useEffect(() => {
    if (open && config) {
      setDirectory(config.directory || "");
      setPort(config.port || "");
      setListenAddresses(
        config.listen_addresses.length > 0 ? [...config.listen_addresses] : []
      );
      setAllowUpload(config.allow_upload ?? false);
      setError(null);
    }
  }, [open, config]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    if (port.trim()) {
      const portNum = parseInt(port.trim(), 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        setError("Port must be a number between 1 and 65535");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const operations: { op: string; value?: string }[] = [];

      // Handle directory
      const newDirectory = directory.trim();
      const oldDirectory = config?.directory || "";
      if (newDirectory && newDirectory !== oldDirectory) {
        operations.push({ op: "set_directory", value: newDirectory });
      } else if (!newDirectory && oldDirectory) {
        operations.push({ op: "delete_directory" });
      }

      // Handle port
      const newPort = port.trim();
      const oldPort = config?.port || "";
      if (newPort && newPort !== oldPort) {
        operations.push({ op: "set_port", value: newPort });
      } else if (!newPort && oldPort) {
        operations.push({ op: "delete_port" });
      }

      // Handle listen addresses
      const currentListenAddrs = config?.listen_addresses || [];
      const newListenAddrs = listenAddresses
        .map((a) => a.trim())
        .filter(Boolean);

      for (const addr of currentListenAddrs) {
        if (!newListenAddrs.includes(addr)) {
          operations.push({ op: "delete_listen_address", value: addr });
        }
      }
      for (const addr of newListenAddrs) {
        if (!currentListenAddrs.includes(addr)) {
          operations.push({ op: "set_listen_address", value: addr });
        }
      }

      // Handle allow_upload (only if capability is supported)
      if (capabilities?.has_allow_upload) {
        const oldAllowUpload = config?.allow_upload ?? false;
        if (allowUpload && !oldAllowUpload) {
          operations.push({ op: "set_allow_upload" });
        } else if (!allowUpload && oldAllowUpload) {
          operations.push({ op: "delete_allow_upload" });
        }
      }

      if (operations.length > 0) {
        await tftpServerService.batchConfigure({ operations });
        await tftpServerService.refreshConfig();
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to update TFTP server settings"
      );
    } finally {
      setLoading(false);
    }
  };

  // Listen address list management helpers
  const addListenAddress = () =>
    setListenAddresses([...listenAddresses, ""]);
  const updateListenAddress = (index: number, value: string) => {
    const updated = [...listenAddresses];
    updated[index] = value;
    setListenAddresses(updated);
  };
  const removeListenAddress = (index: number) => {
    setListenAddresses(listenAddresses.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit TFTP Server Settings</DialogTitle>
          <DialogDescription>
            Configure the TFTP server directory, port, listen addresses, and
            upload permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {(capabilities?.fields?.directory?.supported ||
            capabilities?.fields?.port?.supported) && (
            <Fieldset label="Basic Settings">
              {capabilities?.fields?.directory?.supported && (
                <FormField
                  label="Directory"
                  htmlFor="directory"
                  description="Root directory served by the TFTP server"
                >
                  <Input
                    id="directory"
                    value={directory}
                    onChange={(e) => setDirectory(e.target.value)}
                    placeholder="e.g., /config/tftpboot"
                  />
                </FormField>
              )}

              {capabilities?.fields?.port?.supported && (
                <FormField
                  label="Port"
                  htmlFor="port"
                  description="UDP port the TFTP server listens on (1–65535)"
                >
                  <Input
                    id="port"
                    type="number"
                    min={1}
                    max={65535}
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="69 (default)"
                  />
                </FormField>
              )}
            </Fieldset>
          )}

          {capabilities?.fields?.listen_address?.supported && (
            <>
              <FieldsetDivider />
              <Fieldset label="Listen Addresses">
                <FormField
                  label="Addresses"
                  description="IP addresses the TFTP server listens on"
                >
                  <div className="space-y-2">
                    {listenAddresses.length === 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addListenAddress}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Listen Address
                      </Button>
                    ) : (
                      <>
                        {listenAddresses.map((addr, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={addr}
                              onChange={(e) =>
                                updateListenAddress(index, e.target.value)
                              }
                              placeholder="e.g., 0.0.0.0"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeListenAddress(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addListenAddress}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Listen Address
                        </Button>
                      </>
                    )}
                  </div>
                </FormField>
              </Fieldset>
            </>
          )}

          {capabilities?.has_allow_upload &&
            capabilities?.fields?.allow_upload?.supported && (
              <>
                <FieldsetDivider />
                <Fieldset label="Options">
                  <FormField
                    label="Allow Upload"
                    htmlFor="allow-upload"
                    description="Permit clients to upload files to the TFTP server"
                    horizontal
                  >
                    <Checkbox
                      id="allow-upload"
                      checked={allowUpload}
                      onCheckedChange={(checked) =>
                        setAllowUpload(checked === true)
                      }
                    />
                  </FormField>
                </Fieldset>
              </>
            )}

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
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
