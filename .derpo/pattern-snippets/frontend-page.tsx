// Canonical Frontend Page Pattern
// Source: frontend/src/app/(default)/(app)/system/services/ntp/page.tsx
// Used by DERPO agents as the reference implementation for new feature pages.

"use client";

import { useState, useCallback, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { ntpService } from "@/lib/api/ntp";
import type { NTPConfig, NTPCapabilities } from "@/lib/api/types/ntp";
// ... UI imports (PageHeader, Card, Table, Button, etc.)

export default function NTPPage() {
  const { canWrite } = usePermissions();

  // --- State Pattern ---
  const [config, setConfig] = useState<NTPConfig | null>(null);
  const [capabilities, setCapabilities] = useState<NTPCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state (one per action)
  const [createOpen, setCreateOpen] = useState(false);
  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [deletingServer, setDeletingServer] = useState<string | null>(null);

  // --- Data Loading Pattern ---
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capData] = await Promise.all([
        ntpService.getConfig(),
        ntpService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NTP configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Render Pattern ---

  // Loading state
  if (loading) {
    return (/* centered Loader2 spinner with animate-spin */);
  }

  // Error state
  if (error) {
    return (/* destructive Alert with AlertCircle, retry button */);
  }

  return (
    <div className="space-y-6">
      {/* PageHeader with title, description, action buttons */}
      <PageHeader
        title="NTP"
        description="Configure NTP servers and settings"
      >
        {canWrite(FeatureGroup.NTP) && (
          <>
            <Button onClick={() => setEditSettingsOpen(true)}>Edit Settings</Button>
            <Button onClick={loadData} variant="outline">Refresh</Button>
          </>
        )}
      </PageHeader>

      {/* Settings card with key-value display */}
      <Card>{/* Listen addresses, allowed clients, VRF */}</Card>

      {/* Data table with action buttons */}
      <Card>
        <Table>
          <TableHeader>{/* Column headers */}</TableHeader>
          <TableBody>
            {config?.servers.length ? (
              config.servers.map((server) => (
                <TableRow key={server.address}>{/* Row data + Edit/Delete buttons */}</TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5}><EmptyState /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modals — all receive onSuccess={loadData} for post-operation refresh */}
      <CreateNTPServerModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={loadData}
        capabilities={capabilities}
        existingServers={config?.servers.map(s => s.address) ?? []}
      />
      <EditNTPSettingsModal
        open={editSettingsOpen}
        onOpenChange={setEditSettingsOpen}
        onSuccess={loadData}
        capabilities={capabilities}
        config={config}
      />
    </div>
  );
}
