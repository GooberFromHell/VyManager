"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Pencil, Trash2, Radio, Settings, Network } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { lldpService } from "@/lib/api/lldp";
import type { LLDPConfig, LLDPCapabilities } from "@/lib/api/types/lldp";
import { EditLLDPSettingsModal } from "@/components/services/lldp/EditLLDPSettingsModal";
import { AddLLDPInterfaceModal } from "@/components/services/lldp/AddLLDPInterfaceModal";
import { DeleteLLDPInterfaceModal } from "@/components/services/lldp/DeleteLLDPInterfaceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { Loader2 } from "lucide-react";

export default function LLDPPage() {
  const { canWrite } = usePermissions();
  const [config, setConfig] = useState<LLDPConfig | null>(null);
  const [capabilities, setCapabilities] = useState<LLDPCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [addInterfaceOpen, setAddInterfaceOpen] = useState(false);
  const [deletingInterface, setDeletingInterface] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capData] = await Promise.all([
        lldpService.getConfig(),
        lldpService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load LLDP configuration");
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
          title="Error Loading LLDP"
          message={error}
          onRetry={handleRefresh}
          className="max-w-md"
        />
      </div>
    );
  }

  const interfaces = config?.interfaces || [];
  const legacyProtocols = config?.legacy_protocols || [];
  const managementAddresses = config?.management_addresses || [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="LLDP"
        description="Link Layer Discovery Protocol configuration"
        actions={
          <>
            {canWrite(FeatureGroup.LLDP) && (
              <Button variant="outline" onClick={() => setEditSettingsOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Settings
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
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Settings</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SNMP</span>
                <Badge variant={config?.snmp_enabled ? "default" : "secondary"}>
                  {config?.snmp_enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {capabilities?.has_management_address && (
                <div>
                  <span className="text-muted-foreground">Management Addresses</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {managementAddresses.length > 0
                      ? managementAddresses.map((addr) => (
                          <Badge key={addr} variant="secondary" className="font-mono">{addr}</Badge>
                        ))
                      : <span className="text-muted-foreground italic">Not configured</span>}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {capabilities?.has_legacy_protocols && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Legacy Protocols</h3>
              </div>
              <div className="space-y-3 text-sm">
                {legacyProtocols.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {legacyProtocols.map((proto) => (
                      <Badge key={proto} variant="outline">{proto}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">No legacy protocols enabled</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Interfaces</h2>
        {canWrite(FeatureGroup.LLDP) && (
          <Button onClick={() => setAddInterfaceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Interface
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Interface</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location ELIN</TableHead>
              {canWrite(FeatureGroup.LLDP) && (
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {interfaces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canWrite(FeatureGroup.LLDP) ? 4 : 3} className="h-32">
                  <div className="flex flex-col items-center justify-center">
                    <Network className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">No LLDP interfaces configured</p>
                    <p className="text-xs text-muted-foreground mt-1">Add an interface to enable LLDP on it</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              interfaces.map((iface) => (
                <TableRow key={iface.name}>
                  <TableCell className="font-mono">{iface.name}</TableCell>
                  <TableCell>
                    {iface.disabled ? (
                      <Badge variant="destructive">Disabled</Badge>
                    ) : (
                      <Badge variant="default">Enabled</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {iface.location_elin ? (
                      <span className="font-mono">{iface.location_elin}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Not set</span>
                    )}
                  </TableCell>
                  {canWrite(FeatureGroup.LLDP) && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingInterface(iface.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddLLDPInterfaceModal
        open={addInterfaceOpen}
        onOpenChange={setAddInterfaceOpen}
        onSuccess={loadData}
        existingInterfaces={interfaces.map((i) => i.name)}
      />
      {config && (
        <EditLLDPSettingsModal
          open={editSettingsOpen}
          onOpenChange={setEditSettingsOpen}
          onSuccess={loadData}
          config={config}
          capabilities={capabilities}
        />
      )}
      <DeleteLLDPInterfaceModal
        open={!!deletingInterface}
        onOpenChange={(open: boolean) => !open && setDeletingInterface(null)}
        onSuccess={loadData}
        interfaceName={deletingInterface || ""}
      />
    </div>
  );
}
