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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { AlertCircle, ChevronDown, Loader2, Server } from "lucide-react";
import { sessionService, Instance, Site } from "@/lib/api/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SSHKeySetup } from "@/components/monitoring/SSHKeySetup";

interface EditInstanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  instance: Instance | null;
  sites: Site[];
}

export function EditInstanceModal({
  open,
  onOpenChange,
  onSuccess,
  instance,
  sites,
}: EditInstanceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("443");
  const [apiKey, setApiKey] = useState("");
  const [vyosVersion, setVyosVersion] = useState("1.5");
  const [protocol, setProtocol] = useState("https");
  const [verifySsl, setVerifySsl] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [siteId, setSiteId] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [sshUsername, setSshUsername] = useState("");
  const [commitConfirmEnabled, setCommitConfirmEnabled] = useState(false);
  const [commitConfirmMinutes, setCommitConfirmMinutes] = useState("5");
  const [prometheusEnabled, setPrometheusEnabled] = useState(false);
  const [prometheusPort, setPrometheusPort] = useState("9273");
  const [prometheusAuth, setPrometheusAuth] = useState(false);
  const [prometheusUsername, setPrometheusUsername] = useState("");
  const [prometheusPassword, setPrometheusPassword] = useState("");
  const [timeout, setTimeout] = useState("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (instance && open) {
      setName(instance.name);
      setDescription(instance.description || "");
      setHost(instance.host);
      setPort(instance.port.toString());
      setVyosVersion(instance.vyos_version || "1.5");
      setIsActive(instance.is_active);
      setSiteId(instance.site_id);
      setSshPort((instance.ssh_port ?? 22).toString());
      setSshUsername(instance.ssh_username || "");
      setCommitConfirmEnabled(instance.commit_confirm_enabled ?? false);
      setCommitConfirmMinutes((instance.commit_confirm_minutes ?? 5).toString());
      setPrometheusEnabled(instance.prometheus_enabled ?? false);
      setPrometheusPort((instance.prometheus_port ?? 9273).toString());
      setPrometheusAuth(instance.prometheus_auth ?? false);
      setPrometheusUsername(instance.prometheus_username || "");
      setPrometheusPassword("");
      setTimeout((instance.timeout ?? 10).toString());
      // Don't populate API key for security
      setApiKey("");
      setProtocol(instance.protocol || "https");
      setVerifySsl(instance.verify_ssl ?? false);
    }
  }, [instance, open]);

  const handleClose = () => {
    setName("");
    setDescription("");
    setHost("");
    setPort("443");
    setApiKey("");
    setVyosVersion("1.5");
    setProtocol("https");
    setVerifySsl(false);
    setIsActive(true);
    setSiteId("");
    setSshPort("22");
    setSshUsername("");
    setCommitConfirmEnabled(false);
    setCommitConfirmMinutes("5");
    setPrometheusEnabled(false);
    setPrometheusPort("9273");
    setPrometheusAuth(false);
    setPrometheusUsername("");
    setPrometheusPassword("");
    setTimeout("10");
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!instance) return;

    if (!name.trim()) {
      setError("Instance name is required");
      return;
    }
    if (!host.trim()) {
      setError("Host is required");
      return;
    }

    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError("Port must be between 1 and 65535");
      return;
    }

    const sshPortNum = parseInt(sshPort);
    if (isNaN(sshPortNum) || sshPortNum < 1 || sshPortNum > 65535) {
      setError("SSH port must be between 1 and 65535");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        host: host.trim(),
        port: portNum,
        protocol: protocol,
        vyos_version: vyosVersion,
        is_active: isActive,
        ssh_port: sshPortNum,
        ssh_username: sshUsername.trim() || null,
        verify_ssl: verifySsl,
        commit_confirm_enabled: commitConfirmEnabled,
        commit_confirm_minutes: parseInt(commitConfirmMinutes) || 5,
        prometheus_enabled: prometheusEnabled,
        prometheus_port: parseInt(prometheusPort) || 9273,
        prometheus_auth: prometheusAuth,
        prometheus_username: prometheusAuth ? prometheusUsername.trim() || undefined : undefined,
        ...(prometheusAuth && prometheusPassword ? { prometheus_password: prometheusPassword } : {}),
        timeout: parseInt(timeout) || 10,
      };

      if (apiKey.trim()) {
        updateData.api_key = apiKey.trim();
      }

      if (siteId !== instance.site_id) {
        updateData.site_id = siteId;
      }

      await sessionService.updateInstance(instance.id, updateData);

      handleClose();
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update instance";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!instance) return null;

  const canMoveSite = sites.length > 1;
  const isAdmin = sites.find((s) => s.id === instance.site_id)?.role === "ADMIN";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit Instance</DialogTitle>
              <DialogDescription>
                Update instance configuration
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="ssh">SSH</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit}>
            <TabsContent value="basic" className="space-y-4 mt-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              <Fieldset>
                <FormField label="Instance Name" htmlFor="name" required>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., vyos-router-01"
                    disabled={loading}
                    required
                  />
                </FormField>

                <FormField label="Description (Optional)" htmlFor="description">
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional information..."
                    rows={2}
                    disabled={loading}
                  />
                </FormField>

                {canMoveSite && (
                  <FormField label="Site" htmlFor="siteId">
                    <Select
                      value={siteId}
                      onValueChange={setSiteId}
                      disabled={loading}
                    >
                      <SelectTrigger id="siteId">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sites
                          .filter((s) => s.role === "ADMIN")
                          .map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                              {site.id === instance.site_id ? " (Current)" : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {siteId !== instance.site_id && (
                      <p className="text-xs text-warning">
                        Moving to a different site
                      </p>
                    )}
                  </FormField>
                )}

                <FormField label="VyOS Version" htmlFor="vyosVersion">
                  <Select
                    value={vyosVersion}
                    onValueChange={setVyosVersion}
                    disabled={loading}
                  >
                    <SelectTrigger id="vyosVersion">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.4">VyOS 1.4</SelectItem>
                      <SelectItem value="1.5">VyOS 1.5</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Instance is active" htmlFor="isActive" horizontal>
                  <Checkbox
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(checked as boolean)}
                    disabled={loading}
                  />
                </FormField>
              </Fieldset>

              <FieldsetDivider />

              <Fieldset label="Commit-Confirm">
                <FormField
                  label="Enable Commit-Confirm"
                  htmlFor="editCommitConfirmEnabled"
                  description={
                    vyosVersion === "1.4"
                      ? "Not supported on VyOS 1.4"
                      : "All changes will require confirmation or VyOS will auto-revert"
                  }
                  horizontal
                >
                  <Checkbox
                    id="editCommitConfirmEnabled"
                    checked={commitConfirmEnabled}
                    onCheckedChange={(checked) => setCommitConfirmEnabled(checked as boolean)}
                    disabled={loading || vyosVersion === "1.4"}
                  />
                </FormField>
                {commitConfirmEnabled && (
                  <div className="flex items-center gap-3 pl-8">
                    <FormField label="Confirm window" htmlFor="editCommitConfirmMinutes">
                      <div className="flex items-center gap-2">
                        <Input
                          id="editCommitConfirmMinutes"
                          type="number"
                          min={1}
                          max={60}
                          value={commitConfirmMinutes}
                          onChange={(e) => setCommitConfirmMinutes(e.target.value)}
                          disabled={loading}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">minutes</span>
                      </div>
                    </FormField>
                  </div>
                )}
              </Fieldset>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="connection" className="space-y-4 mt-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              <Fieldset>
                <FormField label="Host" htmlFor="host" required>
                  <Input
                    id="host"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.1 or vyos.example.com"
                    disabled={loading}
                    required
                  />
                </FormField>

                <FormField label="API Port" htmlFor="port">
                  <Input
                    id="port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="443"
                    min="1"
                    max="65535"
                    disabled={loading}
                  />
                </FormField>
              </Fieldset>

              <FieldsetDivider />

              <Fieldset
                label="Update API Credentials (Optional)"
                description="Leave blank to keep existing credentials"
              >
                <FormField label="Protocol" htmlFor="protocol">
                  <Select
                    value={protocol}
                    onValueChange={setProtocol}
                    disabled={loading}
                  >
                    <SelectTrigger id="protocol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="https">HTTPS</SelectItem>
                      <SelectItem value="http">HTTP</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="New API Key" htmlFor="apiKey">
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Leave blank to keep existing"
                    disabled={loading}
                  />
                </FormField>

                <FormField label="Verify SSL certificate" htmlFor="verifySsl" horizontal>
                  <Checkbox
                    id="verifySsl"
                    checked={verifySsl}
                    onCheckedChange={(checked) =>
                      setVerifySsl(checked as boolean)
                    }
                    disabled={loading}
                  />
                </FormField>
              </Fieldset>

              <Fieldset>
                <FormField
                  label="API Timeout (seconds)"
                  htmlFor="editTimeout"
                  description="Timeout for API requests to the VyOS device (1-300 seconds)"
                >
                  <Input
                    id="editTimeout"
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeout(e.target.value)}
                    placeholder="10"
                    min="1"
                    max="300"
                    disabled={loading}
                  />
                </FormField>
              </Fieldset>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="ssh" className="space-y-4 mt-4">
              {/* SSH connection fields — saved with the form */}
              <Fieldset>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="SSH Username" htmlFor="sshUsername">
                    <Input
                      id="sshUsername"
                      value={sshUsername}
                      onChange={(e) => setSshUsername(e.target.value)}
                      placeholder="vyos"
                      disabled={loading}
                    />
                  </FormField>
                  <FormField label="SSH Port" htmlFor="sshPort">
                    <Input
                      id="sshPort"
                      type="number"
                      value={sshPort}
                      onChange={(e) => setSshPort(e.target.value)}
                      placeholder="22"
                      min="1"
                      max="65535"
                      disabled={loading}
                    />
                  </FormField>
                </div>
              </Fieldset>

              <Collapsible open={prometheusEnabled} onOpenChange={setPrometheusEnabled}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between px-0 font-normal text-muted-foreground hover:text-foreground">
                    <span className="text-sm">Prometheus Monitoring</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${prometheusEnabled ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Connect to a Prometheus node_exporter running on the VyOS device for hardware and system metrics.
                  </p>
                  <Fieldset label="Prometheus Port">
                    <Input
                      type="number"
                      value={prometheusPort}
                      onChange={(e) => setPrometheusPort(e.target.value)}
                      placeholder="9273"
                      min="1"
                      max="65535"
                      disabled={loading}
                    />
                  </Fieldset>
                  <Fieldset>
                    <FormField label="Require authentication" htmlFor="editPrometheusAuth" horizontal>
                      <Checkbox
                        id="editPrometheusAuth"
                        checked={prometheusAuth}
                        onCheckedChange={(checked) => setPrometheusAuth(checked as boolean)}
                        disabled={loading}
                      />
                    </FormField>
                  </Fieldset>
                  {prometheusAuth && (
                    <Fieldset>
                      <FormField label="Username" htmlFor="editPrometheusUsername">
                        <Input
                          id="editPrometheusUsername"
                          value={prometheusUsername}
                          onChange={(e) => setPrometheusUsername(e.target.value)}
                          placeholder="prometheus"
                          disabled={loading}
                        />
                      </FormField>
                      <FormField label="Password" htmlFor="editPrometheusPassword">
                        <Input
                          id="editPrometheusPassword"
                          type="password"
                          value={prometheusPassword}
                          onChange={(e) => setPrometheusPassword(e.target.value)}
                          placeholder="Leave blank to keep existing"
                          disabled={loading}
                        />
                      </FormField>
                    </Fieldset>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-end gap-2 pb-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>

              {/* SSH key management — only for site admins */}
              {isAdmin ? (
                <>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-1">SSH Key</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Generate an SSH keypair and install the public key on your VyOS device to enable real-time monitoring.
                    </p>
                    <SSHKeySetup
                      instanceId={instance.id}
                      sshUsername={sshUsername || instance.ssh_username}
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-lg border bg-muted/50 p-3 border-t mt-2">
                  <p className="text-sm text-muted-foreground">
                    SSH key management requires site Admin access.
                  </p>
                </div>
              )}
            </TabsContent>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
