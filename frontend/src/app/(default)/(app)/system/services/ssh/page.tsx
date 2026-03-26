"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Pencil, Terminal, Shield, Key } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { sshService } from "@/lib/api/ssh";
import type { SSHConfig, SSHCapabilities } from "@/lib/api/types/ssh";
import { EditSSHSettingsModal } from "@/components/services/ssh/EditSSHSettingsModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { Loader2 } from "lucide-react";

export default function SSHPage() {
  const { canWrite } = usePermissions();
  const [config, setConfig] = useState<SSHConfig | null>(null);
  const [capabilities, setCapabilities] = useState<SSHCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capData] = await Promise.all([
        sshService.getConfig(),
        sshService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SSH configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex items-center justify-center h-48">
        <ErrorAlert
          title="Error Loading SSH"
          message={error}
          onRetry={handleRefresh}
          className="max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="page-compact">
      <PageHeader
        title="SSH"
        description="Secure Shell access configuration"
        actions={
          <>
            {canWrite(FeatureGroup.SSH) && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </>
        }
      />

      {/* General + Auth — compact side-by-side sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border card-accent p-3">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">General</h3>
          </div>
          <div className="text-sm space-y-0">
            <div className="kv-row">
              <span className="text-muted-foreground text-xs">Port</span>
              <span className="font-mono text-xs">{config?.port || 22}</span>
            </div>
            <div className="kv-row">
              <span className="text-muted-foreground text-xs">Listen Addresses</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {(config?.listen_addresses || []).length > 0
                  ? config!.listen_addresses.map((addr) => <Badge key={addr} variant="secondary" className="text-xs">{addr}</Badge>)
                  : <span className="text-muted-foreground italic text-xs">All interfaces</span>}
              </div>
            </div>
            <div className="kv-row">
              <span className="text-muted-foreground text-xs">Log Level</span>
              <Badge variant="outline" className="text-xs">{config?.loglevel || "INFO"}</Badge>
            </div>
            <div className="kv-row">
              <span className="text-muted-foreground text-xs">Keepalive</span>
              <span className="text-xs">{config?.client_keepalive_interval || "—"}s</span>
            </div>
            {config?.vrf && (
              <div className="kv-row">
                <span className="text-muted-foreground text-xs">VRF</span>
                <span className="text-xs font-mono">{config.vrf}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border card-accent p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Authentication</h3>
          </div>
          <div className="text-sm space-y-0">
            <div className="kv-row">
              <span className="text-muted-foreground text-xs">Password Auth</span>
              <Badge variant={config?.disable_password_authentication ? "destructive" : "default"} className="text-xs">
                {config?.disable_password_authentication ? "Disabled" : "Enabled"}
              </Badge>
            </div>
            <div className="kv-row">
              <span className="text-muted-foreground text-xs">Host Validation</span>
              <Badge variant={config?.disable_host_validation ? "destructive" : "default"} className="text-xs">
                {config?.disable_host_validation ? "Disabled" : "Enabled"}
              </Badge>
            </div>
            {config?.access_control && (
              <>
                <div className="kv-row flex-col items-start gap-1">
                  <span className="text-muted-foreground text-xs">Allowed Users</span>
                  <div className="flex flex-wrap gap-1">
                    {(config.access_control.allow_users || []).length > 0
                      ? config.access_control.allow_users.map((u) => <Badge key={u} variant="secondary" className="text-xs">{u}</Badge>)
                      : <span className="text-muted-foreground italic text-xs">All users</span>}
                  </div>
                </div>
                <div className="kv-row flex-col items-start gap-1">
                  <span className="text-muted-foreground text-xs">Denied Users</span>
                  <div className="flex flex-wrap gap-1">
                    {(config.access_control.deny_users || []).length > 0
                      ? config.access_control.deny_users.map((u) => <Badge key={u} variant="destructive" className="text-xs">{u}</Badge>)
                      : <span className="text-muted-foreground italic text-xs">None</span>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cryptography — full width, dense badge layout */}
      <div className="rounded-lg border border-border card-accent p-3">
        <div className="flex items-center gap-2 mb-2">
          <Key className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Cryptography</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground text-[0.6875rem] uppercase tracking-wide">Ciphers</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {(config?.ciphers || []).length > 0
                ? config!.ciphers.map((c) => <Badge key={c} variant="outline" className="font-mono text-[0.6875rem]">{c}</Badge>)
                : <span className="text-muted-foreground italic">Default</span>}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-[0.6875rem] uppercase tracking-wide">Key Exchange</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {(config?.key_exchange || []).length > 0
                ? config!.key_exchange.map((k) => <Badge key={k} variant="outline" className="font-mono text-[0.6875rem]">{k}</Badge>)
                : <span className="text-muted-foreground italic">Default</span>}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-[0.6875rem] uppercase tracking-wide">MACs</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {(config?.mac || []).length > 0
                ? config!.mac.map((m) => <Badge key={m} variant="outline" className="font-mono text-[0.6875rem]">{m}</Badge>)
                : <span className="text-muted-foreground italic">Default</span>}
            </div>
          </div>
        </div>
      </div>

      {config && (
        <EditSSHSettingsModal
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={loadData}
          config={config}
          capabilities={capabilities}
        />
      )}
    </div>
  );
}
