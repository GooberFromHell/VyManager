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
import { FormField } from "@/components/ui/fieldset";
import { AlertCircle, Plus, X } from "lucide-react";
import { snmpService } from "@/lib/api/snmp";
import type { SNMPConfig, SNMPCapabilities } from "@/lib/api/types/snmp";
import { ApiError } from "@/lib/types/api";

const isValidIPv4 = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  if (!match) return false;
  return match.slice(1).every((octet) => {
    const num = parseInt(octet);
    return num >= 0 && num <= 255;
  });
};

const isValidIPv6 = (ip: string): boolean => {
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip) || ip === "::";
};

const isValidIP = (ip: string): boolean => {
  return isValidIPv4(ip) || isValidIPv6(ip);
};

interface ListenEntry {
  address: string;
  port: string;
}

interface EditSNMPSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: SNMPConfig;
  capabilities: SNMPCapabilities | null;
}

export function EditSNMPSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  config,
  capabilities,
}: EditSNMPSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [trapSource, setTrapSource] = useState("");
  const [listenAddresses, setListenAddresses] = useState<ListenEntry[]>([]);

  useEffect(() => {
    if (open && config) {
      setContact(config.contact || "");
      setDescription(config.description || "");
      setLocation(config.location || "");
      setTrapSource(config.trap_source || "");
      setListenAddresses(
        config.listen_addresses.length > 0
          ? config.listen_addresses.map((la) => ({
              address: la.address,
              port: la.port ? String(la.port) : "",
            }))
          : []
      );
      setError(null);
    }
  }, [open, config]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    for (const entry of listenAddresses.filter((e) => e.address.trim())) {
      if (!isValidIP(entry.address.trim())) {
        setError(`Invalid listen address: ${entry.address}`);
        return false;
      }
      if (entry.port.trim()) {
        const portNum = parseInt(entry.port.trim());
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
          setError(`Invalid port number: ${entry.port}`);
          return false;
        }
      }
    }

    if (trapSource.trim() && !isValidIP(trapSource.trim())) {
      setError(`Invalid trap source address: ${trapSource}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const operations: { op: string; value?: string }[] = [];

      // Contact
      const newContact = contact.trim();
      if (newContact !== (config.contact || "")) {
        if (newContact) {
          operations.push({ op: "set_contact", value: newContact });
        } else {
          operations.push({ op: "delete_contact" });
        }
      }

      // Description
      const newDescription = description.trim();
      if (newDescription !== (config.description || "")) {
        if (newDescription) {
          operations.push({ op: "set_description", value: newDescription });
        } else {
          operations.push({ op: "delete_description" });
        }
      }

      // Location
      const newLocation = location.trim();
      if (newLocation !== (config.location || "")) {
        if (newLocation) {
          operations.push({ op: "set_location", value: newLocation });
        } else {
          operations.push({ op: "delete_location" });
        }
      }

      // Trap Source
      const newTrapSource = trapSource.trim();
      if (newTrapSource !== (config.trap_source || "")) {
        if (newTrapSource) {
          operations.push({ op: "set_trap_source", value: newTrapSource });
        } else {
          operations.push({ op: "delete_trap_source" });
        }
      }

      // Listen Addresses
      const currentListenAddrs = config.listen_addresses.map(
        (la) => `${la.address}:${la.port || ""}`
      );
      const newListenAddrs = listenAddresses
        .filter((e) => e.address.trim())
        .map((e) => ({
          address: e.address.trim(),
          port: e.port.trim(),
        }));
      const newListenKeys = newListenAddrs.map(
        (la) => `${la.address}:${la.port}`
      );

      // Delete removed listen addresses
      for (const la of config.listen_addresses) {
        const key = `${la.address}:${la.port || ""}`;
        if (!newListenKeys.includes(key)) {
          operations.push({ op: "delete_listen_address", value: la.address });
        }
      }
      // Add new listen addresses
      for (const la of newListenAddrs) {
        const key = `${la.address}:${la.port}`;
        if (!currentListenAddrs.includes(key)) {
          const value = la.port
            ? `${la.address}|${la.port}`
            : la.address;
          operations.push({ op: "set_listen_address", value });
        }
      }

      if (operations.length > 0) {
        await snmpService.updateSettings(operations);
        await snmpService.refreshConfig();
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to update SNMP settings"
      );
    } finally {
      setLoading(false);
    }
  };

  const addListenAddress = () =>
    setListenAddresses([...listenAddresses, { address: "", port: "" }]);
  const updateListenAddress = (
    index: number,
    field: keyof ListenEntry,
    value: string
  ) => {
    const updated = [...listenAddresses];
    updated[index] = { ...updated[index], [field]: value };
    setListenAddresses(updated);
  };
  const removeListenAddress = (index: number) => {
    setListenAddresses(listenAddresses.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit SNMP Settings</DialogTitle>
          <DialogDescription>
            Configure SNMP general settings and listen addresses
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            label="Contact"
            htmlFor="contact"
            description="System contact information"
          >
            <Input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g., admin@example.com"
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="description"
            description="System description string"
          >
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., VyOS Router"
            />
          </FormField>

          <FormField
            label="Location"
            htmlFor="location"
            description="Physical location of the device"
          >
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Server Room A"
            />
          </FormField>

          <FormField
            label="Trap Source"
            htmlFor="trapSource"
            description="Source address for SNMP trap notifications"
          >
            <Input
              id="trapSource"
              value={trapSource}
              onChange={(e) => setTrapSource(e.target.value)}
              placeholder="e.g., 10.0.0.1"
            />
          </FormField>

          <FormField
            label="Listen Addresses"
            description="IP addresses and optional ports the SNMP service listens on"
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
                  {listenAddresses.map((entry, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={entry.address}
                        onChange={(e) =>
                          updateListenAddress(index, "address", e.target.value)
                        }
                        placeholder="Address (e.g., 0.0.0.0)"
                        className="flex-1"
                      />
                      <Input
                        value={entry.port}
                        onChange={(e) =>
                          updateListenAddress(index, "port", e.target.value)
                        }
                        placeholder="Port"
                        className="w-24"
                        type="number"
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
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
