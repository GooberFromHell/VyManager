"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Pencil, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorAlert } from "@/components/ui/error-alert";
import { EmptyState } from "@/components/ui/empty-state";
import { tftpServerService } from "@/lib/api/tftp-server";
import type {
  TFTPServerConfig,
  TFTPServerCapabilities,
} from "@/lib/api/types/tftp-server";
import { EditTFTPServerModal } from "@/components/services/tftp-server/EditTFTPServerModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { Loader2 } from "lucide-react";

export default function TFTPServerPage() {
  const { canWrite } = usePermissions();
  const [config, setConfig] = useState<TFTPServerConfig | null>(null);
  const [capabilities, setCapabilities] =
    useState<TFTPServerCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [configData, capData] = await Promise.all([
        tftpServerService.getConfig(),
        tftpServerService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load TFTP server configuration"
      );
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

  const handleSuccess = () => {
    loadData();
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Loading TFTP server configuration...</span>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex items-center justify-center h-96">
        <ErrorAlert
          title="Error Loading TFTP Server"
          message={error}
          onRetry={handleRefresh}
          className="max-w-md"
        />
      </div>
    );
  }

  const isNotConfigured =
    !config?.directory &&
    (config?.listen_addresses || []).length === 0 &&
    !config?.port &&
    config?.allow_upload == null;

  if (isNotConfigured) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="TFTP Server"
          description="Trivial File Transfer Protocol server configuration"
          actions={
            <>
              {canWrite(FeatureGroup.TFTP_SERVER) && (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </>
          }
        />

        <Card>
          <CardContent>
            <EmptyState
              icon={FolderOpen}
              title="TFTP Server is not configured"
              description="Configure a directory and listen address to start serving files via TFTP"
              action={canWrite(FeatureGroup.TFTP_SERVER) ? { label: "Configure TFTP Server", onClick: () => setEditOpen(true), icon: Pencil } : undefined}
            />
          </CardContent>
        </Card>

        <EditTFTPServerModal
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={handleSuccess}
          config={config}
          capabilities={capabilities}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">TFTP Server</h1>
          <p className="text-muted-foreground mt-1">
            Trivial File Transfer Protocol server configuration
          </p>
        </div>
        <div className="flex gap-2">
          {canWrite(FeatureGroup.TFTP_SERVER) && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">TFTP Server</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Directory</span>
              {config?.directory ? (
                <span className="font-mono">{config.directory}</span>
              ) : (
                <span className="text-muted-foreground italic">
                  Not configured
                </span>
              )}
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Port</span>
              <Badge variant="secondary">
                {config?.port ? config.port : "69 (default)"}
              </Badge>
            </div>

            <div>
              <span className="text-muted-foreground">Listen Addresses</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {(config?.listen_addresses || []).length > 0 ? (
                  config!.listen_addresses.map((addr) => (
                    <Badge key={addr} variant="secondary">
                      {addr}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground italic">
                    All interfaces
                  </span>
                )}
              </div>
            </div>

            {capabilities?.has_allow_upload && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Allow Upload</span>
                <Badge
                  variant={
                    config?.allow_upload ? "default" : "outline"
                  }
                >
                  {config?.allow_upload ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EditTFTPServerModal
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={handleSuccess}
        config={config}
        capabilities={capabilities}
      />
    </div>
  );
}
