"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Pencil, Server, Network, Settings, Radio } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { dhcpRelayService } from "@/lib/api/dhcp-relay";
import type { DHCPRelayConfig, DHCPRelayCapabilities } from "@/lib/api/types/dhcp-relay";
import { EditDHCPRelayModal } from "@/components/services/dhcp-relay/EditDHCPRelayModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { Loader2 } from "lucide-react";

export default function DHCPRelayPage() {
  const { canWrite } = usePermissions();
  const [config, setConfig] = useState<DHCPRelayConfig | null>(null);
  const [capabilities, setCapabilities] = useState<DHCPRelayCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capData] = await Promise.all([
        dhcpRelayService.getConfig(),
        dhcpRelayService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DHCP Relay configuration");
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
          title="Error Loading DHCP Relay"
          message={error}
          onRetry={handleRefresh}
          className="max-w-md"
        />
      </div>
    );
  }

  const servers = config?.servers || [];
  const interfaces = config?.interfaces || [];
  const relayOptions = config?.relay_options || {};
  const listenAddresses = config?.listen_addresses || [];

  const hasNoConfig =
    servers.length === 0 &&
    interfaces.length === 0 &&
    !relayOptions.hop_count &&
    !relayOptions.max_size &&
    !relayOptions.relay_agents_packets &&
    listenAddresses.length === 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="DHCP Relay"
        description="DHCP relay agent configuration"
        actions={
          <>
            {canWrite(FeatureGroup.DHCP_RELAY) && (
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

      {hasNoConfig ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <Radio className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">No DHCP relay configured</p>
              <p className="text-xs text-muted-foreground mt-1">Configure DHCP relay to forward DHCP requests to upstream servers</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Server className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Relay Servers</h3>
              </div>
              <div className="space-y-3 text-sm">
                {servers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {servers.map((server) => (
                      <Badge key={server} variant="secondary" className="font-mono">
                        {server}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">No servers configured</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Network className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Relay Interfaces</h3>
              </div>
              <div className="space-y-3 text-sm">
                {interfaces.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {interfaces.map((iface) => (
                      <Badge key={iface} variant="secondary" className="font-mono">
                        {iface}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">No interfaces configured</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Relay Options</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hop Count</span>
                  <span>{relayOptions.hop_count ?? <span className="text-muted-foreground italic">Default</span>}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Size</span>
                  <span>{relayOptions.max_size ?? <span className="text-muted-foreground italic">Default</span>}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Relay Agents Packets</span>
                  <span>
                    {relayOptions.relay_agents_packets ? (
                      <Badge variant="outline">{relayOptions.relay_agents_packets}</Badge>
                    ) : (
                      <span className="text-muted-foreground italic">Default</span>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {capabilities?.has_listen_address && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Radio className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Listen Addresses</h3>
                </div>
                <div className="space-y-3 text-sm">
                  {listenAddresses.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {listenAddresses.map((addr) => (
                        <Badge key={addr} variant="secondary" className="font-mono">
                          {addr}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">No listen addresses configured</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {config && (
        <EditDHCPRelayModal
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
