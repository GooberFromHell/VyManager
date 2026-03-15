"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sshService } from "@/lib/api/ssh";
import type { SSHConfig, SSHCapabilities, SSHBatchOperation } from "@/lib/api/types/ssh";
import { Loader2, X, Plus } from "lucide-react";

interface EditSSHSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: SSHConfig;
  capabilities: SSHCapabilities | null;
}

const LOG_LEVELS = ["QUIET", "FATAL", "ERROR", "INFO", "VERBOSE", "DEBUG"];

export function EditSSHSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  config,
  capabilities,
}: EditSSHSettingsModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General tab
  const [port, setPort] = useState("");
  const [listenAddresses, setListenAddresses] = useState<string[]>([]);
  const [vrf, setVrf] = useState("");
  const [loglevel, setLoglevel] = useState("");
  const [keepaliveInterval, setKeepaliveInterval] = useState("");

  // Authentication tab
  const [disablePasswordAuth, setDisablePasswordAuth] = useState(false);
  const [disableHostValidation, setDisableHostValidation] = useState(false);
  const [allowUsers, setAllowUsers] = useState<string[]>([]);
  const [denyUsers, setDenyUsers] = useState<string[]>([]);
  const [allowGroups, setAllowGroups] = useState<string[]>([]);
  const [denyGroups, setDenyGroups] = useState<string[]>([]);

  // Cryptography tab
  const [ciphers, setCiphers] = useState<string[]>([]);
  const [keyExchange, setKeyExchange] = useState<string[]>([]);
  const [macs, setMacs] = useState<string[]>([]);

  // Dynamic Protection tab
  const [dynamicProtectionEnabled, setDynamicProtectionEnabled] = useState(false);
  const [dpAllowFrom, setDpAllowFrom] = useState<string[]>([]);
  const [dpBlockTime, setDpBlockTime] = useState("");
  const [dpDetectTime, setDpDetectTime] = useState("");
  const [dpThreshold, setDpThreshold] = useState("");

  // Initialize form from config
  useEffect(() => {
    if (config && open) {
      setPort(config.port || "");
      setListenAddresses(config.listen_addresses.length > 0 ? [...config.listen_addresses] : []);
      setVrf(config.vrf || "");
      setLoglevel(config.loglevel || "");
      setKeepaliveInterval(config.client_keepalive_interval || "");

      setDisablePasswordAuth(config.disable_password_authentication);
      setDisableHostValidation(config.disable_host_validation);
      setAllowUsers(config.access_control.allow_users.length > 0 ? [...config.access_control.allow_users] : []);
      setDenyUsers(config.access_control.deny_users.length > 0 ? [...config.access_control.deny_users] : []);
      setAllowGroups(config.access_control.allow_groups.length > 0 ? [...config.access_control.allow_groups] : []);
      setDenyGroups(config.access_control.deny_groups.length > 0 ? [...config.access_control.deny_groups] : []);

      setCiphers(config.ciphers.length > 0 ? [...config.ciphers] : []);
      setKeyExchange(config.key_exchange.length > 0 ? [...config.key_exchange] : []);
      setMacs(config.mac.length > 0 ? [...config.mac] : []);

      setDynamicProtectionEnabled(config.dynamic_protection.enabled);
      setDpAllowFrom(config.dynamic_protection.allow_from.length > 0 ? [...config.dynamic_protection.allow_from] : []);
      setDpBlockTime(config.dynamic_protection.block_time || "");
      setDpDetectTime(config.dynamic_protection.detect_time || "");
      setDpThreshold(config.dynamic_protection.threshold || "");

      setError(null);
    }
  }, [config, open]);

  // Multi-value list helpers
  const addToList = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, ""]);
  };

  const removeFromList = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInList = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const buildOperations = (): SSHBatchOperation[] => {
    const ops: SSHBatchOperation[] = [];

    // Port
    const newPort = port.trim();
    const oldPort = config.port || "";
    if (newPort !== oldPort) {
      if (newPort) {
        ops.push({ op: "set_port", value: newPort });
      } else {
        ops.push({ op: "delete_port" });
      }
    }

    // Listen addresses
    const oldAddrs = new Set(config.listen_addresses);
    const newAddrs = new Set(listenAddresses.filter((a) => a.trim()));
    for (const addr of newAddrs) {
      if (!oldAddrs.has(addr)) {
        ops.push({ op: "set_listen_address", value: addr });
      }
    }
    for (const addr of oldAddrs) {
      if (!newAddrs.has(addr)) {
        ops.push({ op: "delete_listen_address", value: addr });
      }
    }

    // VRF
    const newVrf = vrf.trim();
    const oldVrf = config.vrf || "";
    if (newVrf !== oldVrf) {
      if (newVrf) {
        ops.push({ op: "set_vrf", value: newVrf });
      } else {
        ops.push({ op: "delete_vrf" });
      }
    }

    // Log level
    const newLogLevel = loglevel;
    const oldLogLevel = config.loglevel || "";
    if (newLogLevel !== oldLogLevel) {
      if (newLogLevel) {
        ops.push({ op: "set_loglevel", value: newLogLevel });
      } else {
        ops.push({ op: "delete_loglevel" });
      }
    }

    // Keepalive interval
    const newKeepalive = keepaliveInterval.trim();
    const oldKeepalive = config.client_keepalive_interval || "";
    if (newKeepalive !== oldKeepalive) {
      if (newKeepalive) {
        ops.push({ op: "set_client_keepalive_interval", value: newKeepalive });
      } else {
        ops.push({ op: "delete_client_keepalive_interval" });
      }
    }

    // Disable password auth
    if (disablePasswordAuth !== config.disable_password_authentication) {
      ops.push({
        op: disablePasswordAuth
          ? "set_disable_password_authentication"
          : "delete_disable_password_authentication",
      });
    }

    // Disable host validation
    if (disableHostValidation !== config.disable_host_validation) {
      ops.push({
        op: disableHostValidation
          ? "set_disable_host_validation"
          : "delete_disable_host_validation",
      });
    }

    // Access control - allow users
    const oldAllowUsers = new Set(config.access_control.allow_users);
    const newAllowUsers = new Set(allowUsers.filter((u) => u.trim()));
    for (const user of newAllowUsers) {
      if (!oldAllowUsers.has(user)) {
        ops.push({ op: "set_access_control_allow_user", value: user });
      }
    }
    for (const user of oldAllowUsers) {
      if (!newAllowUsers.has(user)) {
        ops.push({ op: "delete_access_control_allow_user", value: user });
      }
    }

    // Access control - deny users
    const oldDenyUsers = new Set(config.access_control.deny_users);
    const newDenyUsers = new Set(denyUsers.filter((u) => u.trim()));
    for (const user of newDenyUsers) {
      if (!oldDenyUsers.has(user)) {
        ops.push({ op: "set_access_control_deny_user", value: user });
      }
    }
    for (const user of oldDenyUsers) {
      if (!newDenyUsers.has(user)) {
        ops.push({ op: "delete_access_control_deny_user", value: user });
      }
    }

    // Access control - allow groups
    const oldAllowGroups = new Set(config.access_control.allow_groups);
    const newAllowGroups = new Set(allowGroups.filter((g) => g.trim()));
    for (const group of newAllowGroups) {
      if (!oldAllowGroups.has(group)) {
        ops.push({ op: "set_access_control_allow_group", value: group });
      }
    }
    for (const group of oldAllowGroups) {
      if (!newAllowGroups.has(group)) {
        ops.push({ op: "delete_access_control_allow_group", value: group });
      }
    }

    // Access control - deny groups
    const oldDenyGroups = new Set(config.access_control.deny_groups);
    const newDenyGroups = new Set(denyGroups.filter((g) => g.trim()));
    for (const group of newDenyGroups) {
      if (!oldDenyGroups.has(group)) {
        ops.push({ op: "set_access_control_deny_group", value: group });
      }
    }
    for (const group of oldDenyGroups) {
      if (!newDenyGroups.has(group)) {
        ops.push({ op: "delete_access_control_deny_group", value: group });
      }
    }

    // Ciphers
    const oldCiphers = new Set(config.ciphers);
    const newCiphers = new Set(ciphers.filter((c) => c.trim()));
    for (const cipher of newCiphers) {
      if (!oldCiphers.has(cipher)) {
        ops.push({ op: "set_cipher", value: cipher });
      }
    }
    for (const cipher of oldCiphers) {
      if (!newCiphers.has(cipher)) {
        ops.push({ op: "delete_cipher", value: cipher });
      }
    }

    // Key exchange
    const oldKex = new Set(config.key_exchange);
    const newKex = new Set(keyExchange.filter((k) => k.trim()));
    for (const kex of newKex) {
      if (!oldKex.has(kex)) {
        ops.push({ op: "set_key_exchange", value: kex });
      }
    }
    for (const kex of oldKex) {
      if (!newKex.has(kex)) {
        ops.push({ op: "delete_key_exchange", value: kex });
      }
    }

    // MAC algorithms
    const oldMacs = new Set(config.mac);
    const newMacs = new Set(macs.filter((m) => m.trim()));
    for (const mac of newMacs) {
      if (!oldMacs.has(mac)) {
        ops.push({ op: "set_mac", value: mac });
      }
    }
    for (const mac of oldMacs) {
      if (!newMacs.has(mac)) {
        ops.push({ op: "delete_mac", value: mac });
      }
    }

    // Dynamic protection
    if (dynamicProtectionEnabled !== config.dynamic_protection.enabled) {
      ops.push({
        op: dynamicProtectionEnabled ? "set_dynamic_protection" : "delete_dynamic_protection",
      });
    }

    if (dynamicProtectionEnabled) {
      // Allow-from addresses
      const oldDpAllowFrom = new Set(config.dynamic_protection.allow_from);
      const newDpAllowFrom = new Set(dpAllowFrom.filter((a) => a.trim()));
      for (const addr of newDpAllowFrom) {
        if (!oldDpAllowFrom.has(addr)) {
          ops.push({ op: "set_dynamic_protection_allow_from", value: addr });
        }
      }
      for (const addr of oldDpAllowFrom) {
        if (!newDpAllowFrom.has(addr)) {
          ops.push({ op: "delete_dynamic_protection_allow_from", value: addr });
        }
      }

      // Block time
      const newBlockTime = dpBlockTime.trim();
      const oldBlockTime = config.dynamic_protection.block_time || "";
      if (newBlockTime !== oldBlockTime) {
        if (newBlockTime) {
          ops.push({ op: "set_dynamic_protection_block_time", value: newBlockTime });
        } else {
          ops.push({ op: "delete_dynamic_protection_block_time" });
        }
      }

      // Detect time
      const newDetectTime = dpDetectTime.trim();
      const oldDetectTime = config.dynamic_protection.detect_time || "";
      if (newDetectTime !== oldDetectTime) {
        if (newDetectTime) {
          ops.push({ op: "set_dynamic_protection_detect_time", value: newDetectTime });
        } else {
          ops.push({ op: "delete_dynamic_protection_detect_time" });
        }
      }

      // Threshold
      const newThreshold = dpThreshold.trim();
      const oldThreshold = config.dynamic_protection.threshold || "";
      if (newThreshold !== oldThreshold) {
        if (newThreshold) {
          ops.push({ op: "set_dynamic_protection_threshold", value: newThreshold });
        } else {
          ops.push({ op: "delete_dynamic_protection_threshold" });
        }
      }
    }

    return ops;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate port
      if (port.trim()) {
        const portNum = parseInt(port.trim(), 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
          throw new Error("Port must be between 1 and 65535");
        }
      }

      const operations = buildOperations();

      if (operations.length === 0) {
        setError("No changes detected");
        setSubmitting(false);
        return;
      }

      await sshService.updateSettings(operations);
      await sshService.refreshConfig();

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update SSH settings"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderMultiValueField = (
    label: string,
    values: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.length === 0 && (
        <p className="text-sm text-zinc-500">None configured.</p>
      )}
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => updateInList(setter, index, e.target.value)}
            placeholder={placeholder}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeFromList(setter, index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => addToList(setter)}
      >
        <Plus className="h-4 w-4 mr-1" /> Add
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit SSH Settings</DialogTitle>
          <DialogDescription>
            Modify the SSH service configuration on this VyOS instance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="crypto">Cryptography</TabsTrigger>
              <TabsTrigger value="protection">Protection</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ssh-port">Port</Label>
                  <Input
                    id="ssh-port"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder="22"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">Default: 22</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssh-loglevel">Log Level</Label>
                  <Select
                    value={loglevel || "placeholder"}
                    onValueChange={(v) => setLoglevel(v === "placeholder" ? "" : v)}
                  >
                    <SelectTrigger id="ssh-loglevel">
                      <SelectValue placeholder="Select log level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder" disabled>
                        Select log level
                      </SelectItem>
                      {LOG_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ssh-keepalive">Client Keepalive Interval (seconds)</Label>
                  <Input
                    id="ssh-keepalive"
                    type="number"
                    min={0}
                    placeholder="e.g. 60"
                    value={keepaliveInterval}
                    onChange={(e) => setKeepaliveInterval(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssh-vrf">VRF</Label>
                  <Input
                    id="ssh-vrf"
                    placeholder="e.g. MGMT"
                    value={vrf}
                    onChange={(e) => setVrf(e.target.value)}
                  />
                </div>
              </div>

              {renderMultiValueField(
                "Listen Addresses",
                listenAddresses,
                setListenAddresses,
                "e.g. 0.0.0.0 or 2001:db8::1"
              )}
            </TabsContent>

            {/* Authentication Tab */}
            <TabsContent value="auth" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ssh-disable-password"
                    checked={disablePasswordAuth}
                    onCheckedChange={(checked) =>
                      setDisablePasswordAuth(checked as boolean)
                    }
                  />
                  <Label htmlFor="ssh-disable-password" className="cursor-pointer">
                    Disable password authentication (require key-based auth)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ssh-disable-host-validation"
                    checked={disableHostValidation}
                    onCheckedChange={(checked) =>
                      setDisableHostValidation(checked as boolean)
                    }
                  />
                  <Label htmlFor="ssh-disable-host-validation" className="cursor-pointer">
                    Disable host validation
                  </Label>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold">Access Control</h3>

                {renderMultiValueField(
                  "Allowed Users",
                  allowUsers,
                  setAllowUsers,
                  "e.g. vyos"
                )}

                {renderMultiValueField(
                  "Denied Users",
                  denyUsers,
                  setDenyUsers,
                  "e.g. root"
                )}

                {renderMultiValueField(
                  "Allowed Groups",
                  allowGroups,
                  setAllowGroups,
                  "e.g. sudo"
                )}

                {renderMultiValueField(
                  "Denied Groups",
                  denyGroups,
                  setDenyGroups,
                  "e.g. nogroup"
                )}
              </div>
            </TabsContent>

            {/* Cryptography Tab */}
            <TabsContent value="crypto" className="space-y-4">
              {renderMultiValueField(
                "Ciphers",
                ciphers,
                setCiphers,
                "e.g. aes256-gcm@openssh.com"
              )}

              {renderMultiValueField(
                "Key Exchange Algorithms",
                keyExchange,
                setKeyExchange,
                "e.g. curve25519-sha256"
              )}

              {renderMultiValueField(
                "MAC Algorithms",
                macs,
                setMacs,
                "e.g. hmac-sha2-256-etm@openssh.com"
              )}
            </TabsContent>

            {/* Dynamic Protection Tab */}
            <TabsContent value="protection" className="space-y-4">
              {capabilities?.fields.dynamic_protection.supported && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ssh-dynamic-protection"
                      checked={dynamicProtectionEnabled}
                      onCheckedChange={(checked) =>
                        setDynamicProtectionEnabled(checked as boolean)
                      }
                    />
                    <Label htmlFor="ssh-dynamic-protection" className="cursor-pointer">
                      Enable dynamic protection (brute-force defense)
                    </Label>
                  </div>

                  {dynamicProtectionEnabled && (
                    <div className="space-y-4 pl-6 border-l-2 border-zinc-700">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dp-block-time">Block Time (seconds)</Label>
                          <Input
                            id="dp-block-time"
                            type="number"
                            min={0}
                            placeholder="e.g. 120"
                            value={dpBlockTime}
                            onChange={(e) => setDpBlockTime(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dp-detect-time">Detect Time (seconds)</Label>
                          <Input
                            id="dp-detect-time"
                            type="number"
                            min={0}
                            placeholder="e.g. 1800"
                            value={dpDetectTime}
                            onChange={(e) => setDpDetectTime(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dp-threshold">Threshold</Label>
                          <Input
                            id="dp-threshold"
                            type="number"
                            min={0}
                            placeholder="e.g. 30"
                            value={dpThreshold}
                            onChange={(e) => setDpThreshold(e.target.value)}
                          />
                        </div>
                      </div>

                      {renderMultiValueField(
                        "Allow From (bypass addresses)",
                        dpAllowFrom,
                        setDpAllowFrom,
                        "e.g. 10.0.0.0/8"
                      )}
                    </div>
                  )}
                </>
              )}

              {!capabilities?.fields.dynamic_protection.supported && (
                <p className="text-sm text-zinc-500">
                  Dynamic protection is not supported on this VyOS version.
                </p>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
