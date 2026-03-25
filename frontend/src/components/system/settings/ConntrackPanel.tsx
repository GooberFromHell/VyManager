"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/fieldset";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Edit2 } from "lucide-react";
import {
  systemSettingsService,
  type SystemConfig,
  type SystemCapabilities,
} from "@/lib/api/system-settings";
import { useToast } from "@/hooks/useToast";

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

export function ConntrackPanel({ config, capabilities, isReadOnly, onRefresh }: Props) {
  const { toast } = useToast();
  const availableModules = capabilities.conntrack.available_modules;

  // Module toggle
  const [togglingModule, setTogglingModule] = useState<string | null>(null);

  // Table sizes editing
  const [editingSizes, setEditingSizes] = useState(false);
  const [tableSize, setTableSize] = useState(
    config.conntrack.table_size ? String(config.conntrack.table_size) : ""
  );
  const [hashSize, setHashSize] = useState(
    config.conntrack.hash_size ? String(config.conntrack.hash_size) : ""
  );
  const [expectSize, setExpectSize] = useState(
    config.conntrack.expect_table_size ? String(config.conntrack.expect_table_size) : ""
  );
  const [sizesSaving, setSizesSaving] = useState(false);
  const [sizesError, setSizesError] = useState<string | null>(null);

  // TCP settings editing
  const [editingTcp, setEditingTcp] = useState(false);
  const [tcpLoose, setTcpLoose] = useState(config.conntrack.tcp_loose ?? "");
  const [tcpHalfOpen, setTcpHalfOpen] = useState(
    config.conntrack.tcp_half_open_connections ? String(config.conntrack.tcp_half_open_connections) : ""
  );
  const [tcpMaxRetrans, setTcpMaxRetrans] = useState(
    config.conntrack.tcp_max_retrans ? String(config.conntrack.tcp_max_retrans) : ""
  );
  const [tcpSaving, setTcpSaving] = useState(false);
  const [tcpError, setTcpError] = useState<string | null>(null);

  const handleModuleToggle = async (module: string, enabled: boolean) => {
    if (isReadOnly) return;
    setTogglingModule(module);
    try {
      const result = enabled
        ? await systemSettingsService.addConntrackModule(module)
        : await systemSettingsService.deleteConntrackModule(module);
      if (!result.success) {
        toast.error("Failed", result.error ?? "Could not update module");
      } else {
        toast.success(enabled ? `${module} enabled` : `${module} disabled`);
        onRefresh();
      }
    } catch {
      toast.error("Error", "Something went wrong. Please try again.");
    } finally {
      setTogglingModule(null);
    }
  };

  const handleSaveSizes = async () => {
    setSizesSaving(true);
    setSizesError(null);
    try {
      const result = await systemSettingsService.updateConntrackSizes(
        tableSize ? parseInt(tableSize, 10) : null,
        hashSize ? parseInt(hashSize, 10) : null,
        expectSize ? parseInt(expectSize, 10) : null,
      );
      if (!result.success) {
        setSizesError(result.error ?? "Failed to save sizes");
      } else {
        toast.success("Table sizes saved");
        setEditingSizes(false);
        onRefresh();
      }
    } catch {
      setSizesError("Something went wrong. Please try again.");
    } finally {
      setSizesSaving(false);
    }
  };

  const handleSaveTcp = async () => {
    setTcpSaving(true);
    setTcpError(null);
    try {
      const result = await systemSettingsService.updateConntrackTcp(
        tcpLoose || null,
        tcpHalfOpen ? parseInt(tcpHalfOpen, 10) : null,
        tcpMaxRetrans ? parseInt(tcpMaxRetrans, 10) : null,
      );
      if (!result.success) {
        setTcpError(result.error ?? "Failed to save TCP settings");
      } else {
        toast.success("TCP settings saved");
        setEditingTcp(false);
        onRefresh();
      }
    } catch {
      setTcpError("Something went wrong. Please try again.");
    } finally {
      setTcpSaving(false);
    }
  };

  const enabledModules = new Set(config.conntrack.modules);

  return (
    <div className="space-y-6">
      {/* Conntrack Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Tracking Modules</CardTitle>
          <CardDescription>
            Enable or disable protocol-specific connection tracking helpers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {availableModules.map((module) => {
              const checked = enabledModules.has(module);
              const loading = togglingModule === module;
              return (
                <div key={module} className="flex items-center gap-2">
                  <Checkbox
                    id={`module-${module}`}
                    checked={checked}
                    disabled={isReadOnly || loading}
                    onCheckedChange={(val) => handleModuleToggle(module, !!val)}
                  />
                  <label
                    htmlFor={`module-${module}`}
                    className="text-sm font-medium cursor-pointer select-none"
                  >
                    {module}
                    {loading && <span className="text-muted-foreground text-xs ml-1">…</span>}
                  </label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Table Sizes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Table Sizes</CardTitle>
              <CardDescription>
                Configure conntrack table and hash sizes. Higher values require more memory.
              </CardDescription>
            </div>
            {!isReadOnly && !editingSizes && (
              <Button variant="outline" size="sm" onClick={() => {
                setTableSize(config.conntrack.table_size ? String(config.conntrack.table_size) : "");
                setHashSize(config.conntrack.hash_size ? String(config.conntrack.hash_size) : "");
                setExpectSize(config.conntrack.expect_table_size ? String(config.conntrack.expect_table_size) : "");
                setSizesError(null);
                setEditingSizes(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {editingSizes && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingSizes(false); setSizesError(null); }} disabled={sizesSaving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveSizes} disabled={sizesSaving}>
                  {sizesSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sizesError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{sizesError}</pre>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Table Size" htmlFor="ct-table-size">
              {editingSizes ? (
                <Input id="ct-table-size" type="number" min="0" value={tableSize} onChange={(e) => setTableSize(e.target.value)} placeholder="262144" />
              ) : (
                <p className="text-sm font-medium">
                  {config.conntrack.table_size?.toLocaleString() ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </FormField>
            <FormField label="Hash Size" htmlFor="ct-hash-size">
              {editingSizes ? (
                <Input id="ct-hash-size" type="number" min="0" value={hashSize} onChange={(e) => setHashSize(e.target.value)} placeholder="32768" />
              ) : (
                <p className="text-sm font-medium">
                  {config.conntrack.hash_size?.toLocaleString() ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </FormField>
            <FormField label="Expect Table Size" htmlFor="ct-expect-size">
              {editingSizes ? (
                <Input id="ct-expect-size" type="number" min="0" value={expectSize} onChange={(e) => setExpectSize(e.target.value)} placeholder="2048" />
              ) : (
                <p className="text-sm font-medium">
                  {config.conntrack.expect_table_size?.toLocaleString() ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* TCP Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>TCP Settings</CardTitle>
              <CardDescription>
                Fine-tune TCP connection tracking behavior.
              </CardDescription>
            </div>
            {!isReadOnly && !editingTcp && (
              <Button variant="outline" size="sm" onClick={() => {
                setTcpLoose(config.conntrack.tcp_loose ?? "");
                setTcpHalfOpen(config.conntrack.tcp_half_open_connections ? String(config.conntrack.tcp_half_open_connections) : "");
                setTcpMaxRetrans(config.conntrack.tcp_max_retrans ? String(config.conntrack.tcp_max_retrans) : "");
                setTcpError(null);
                setEditingTcp(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {editingTcp && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingTcp(false); setTcpError(null); }} disabled={tcpSaving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveTcp} disabled={tcpSaving}>
                  {tcpSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tcpError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{tcpError}</pre>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Loose Mode" htmlFor="tcp-loose">
              {editingTcp ? (
                <Select value={tcpLoose || "unset"} onValueChange={(v) => setTcpLoose(v === "unset" ? "" : v)}>
                  <SelectTrigger id="tcp-loose"><SelectValue placeholder="Not set" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    <SelectItem value="enable">Enable</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium capitalize">
                  {config.conntrack.tcp_loose ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </FormField>
            <FormField label="Half-Open Connections" htmlFor="tcp-half-open">
              {editingTcp ? (
                <Input id="tcp-half-open" type="number" min="0" value={tcpHalfOpen} onChange={(e) => setTcpHalfOpen(e.target.value)} placeholder="512" />
              ) : (
                <p className="text-sm font-medium">
                  {config.conntrack.tcp_half_open_connections ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </FormField>
            <FormField label="Max Retransmits" htmlFor="tcp-max-retrans">
              {editingTcp ? (
                <Input id="tcp-max-retrans" type="number" min="0" value={tcpMaxRetrans} onChange={(e) => setTcpMaxRetrans(e.target.value)} placeholder="3" />
              ) : (
                <p className="text-sm font-medium">
                  {config.conntrack.tcp_max_retrans ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </FormField>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
