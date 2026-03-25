"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex items-center justify-center h-96">
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
    <div className="space-y-6 p-6">
      <PageHeader
        title="SSH"
        description="Secure Shell access configuration"
        actions={
          <>
            {canWrite(FeatureGroup.SSH) && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">General</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Port</span>
                <span className="font-mono">{config?.port || 22}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Listen Addresses</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(config?.listen_addresses || []).length > 0
                    ? config!.listen_addresses.map((addr) => <Badge key={addr} variant="secondary">{addr}</Badge>)
                    : <span className="text-muted-foreground italic">All interfaces</span>}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Log Level</span>
                <Badge variant="outline">{config?.loglevel || "INFO"}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Keepalive Interval</span>
                <span>{config?.client_keepalive_interval || "—"}s</span>
              </div>
              {config?.vrf && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VRF</span>
                  <span>{config.vrf}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Authentication</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Password Auth</span>
                <Badge variant={config?.disable_password_authentication ? "destructive" : "default"}>
                  {config?.disable_password_authentication ? "Disabled" : "Enabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host Validation</span>
                <Badge variant={config?.disable_host_validation ? "destructive" : "default"}>
                  {config?.disable_host_validation ? "Disabled" : "Enabled"}
                </Badge>
              </div>
              {config?.access_control && (
                <>
                  <div>
                    <span className="text-muted-foreground">Allowed Users</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(config.access_control.allow_users || []).length > 0
                        ? config.access_control.allow_users.map((u) => <Badge key={u} variant="secondary">{u}</Badge>)
                        : <span className="text-muted-foreground italic">All users</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Denied Users</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(config.access_control.deny_users || []).length > 0
                        ? config.access_control.deny_users.map((u) => <Badge key={u} variant="destructive">{u}</Badge>)
                        : <span className="text-muted-foreground italic">None</span>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Cryptography</h3>
            </div>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Ciphers</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(config?.ciphers || []).length > 0
                    ? config!.ciphers.map((c) => <Badge key={c} variant="outline" className="font-mono text-xs">{c}</Badge>)
                    : <span className="text-muted-foreground italic">Default</span>}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Key Exchange</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(config?.key_exchange || []).length > 0
                    ? config!.key_exchange.map((k) => <Badge key={k} variant="outline" className="font-mono text-xs">{k}</Badge>)
                    : <span className="text-muted-foreground italic">Default</span>}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">MACs</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(config?.mac || []).length > 0
                    ? config!.mac.map((m) => <Badge key={m} variant="outline" className="font-mono text-xs">{m}</Badge>)
                    : <span className="text-muted-foreground italic">Default</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
