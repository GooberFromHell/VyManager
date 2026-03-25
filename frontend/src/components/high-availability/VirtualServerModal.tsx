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
import { FormField } from "@/components/ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Plus, Server, Trash2 } from "lucide-react";
import type { VirtualServer, RealServer } from "@/lib/api/high-availability";

interface VirtualServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingServer?: VirtualServer | null;
  onSubmit: (vs: VirtualServer) => Promise<void>;
}

interface RealServerEntry {
  address: string;
  port: string;
  connection_timeout: string;
  health_check_script: string;
}

interface FormState {
  name: string;
  address: string;
  port: string;
  protocol: string;
  algorithm: string;
  forward_method: string;
  delay_loop: string;
  persistence_timeout: string;
  fwmark: string;
  real_servers: RealServerEntry[];
}

const emptyForm = (): FormState => ({
  name: "",
  address: "",
  port: "",
  protocol: "",
  algorithm: "",
  forward_method: "",
  delay_loop: "",
  persistence_timeout: "",
  fwmark: "",
  real_servers: [],
});

function serverToForm(vs: VirtualServer): FormState {
  return {
    name: vs.name,
    address: vs.address ?? "",
    port: vs.port ?? "",
    protocol: vs.protocol ?? "",
    algorithm: vs.algorithm ?? "",
    forward_method: vs.forward_method ?? "",
    delay_loop: vs.delay_loop ?? "",
    persistence_timeout: vs.persistence_timeout ?? "",
    fwmark: vs.fwmark ?? "",
    real_servers: vs.real_servers.map((rs) => ({
      address: rs.address,
      port: rs.port ?? "",
      connection_timeout: rs.connection_timeout ?? "",
      health_check_script: rs.health_check_script ?? "",
    })),
  };
}

function formToServer(f: FormState): VirtualServer {
  const real_servers: RealServer[] = f.real_servers
    .filter((rs) => rs.address.trim())
    .map((rs) => ({
      address: rs.address.trim(),
      port: rs.port.trim() || null,
      connection_timeout: rs.connection_timeout.trim() || null,
      health_check_script: rs.health_check_script.trim() || null,
    }));

  return {
    name: f.name.trim(),
    address: f.address.trim() || null,
    port: f.port.trim() || null,
    protocol: f.protocol || null,
    algorithm: f.algorithm || null,
    forward_method: f.forward_method || null,
    delay_loop: f.delay_loop.trim() || null,
    persistence_timeout: f.persistence_timeout.trim() || null,
    fwmark: f.fwmark.trim() || null,
    real_servers,
  };
}

const emptyRealServer = (): RealServerEntry => ({
  address: "",
  port: "",
  connection_timeout: "",
  health_check_script: "",
});

export function VirtualServerModal({
  open,
  onOpenChange,
  existingServer,
  onSubmit,
}: VirtualServerModalProps) {
  const isEdit = !!existingServer;
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(existingServer ? serverToForm(existingServer) : emptyForm());
      setError(null);
    }
  }, [open, existingServer]);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setRealServer = (idx: number, field: keyof RealServerEntry, value: string) => {
    setForm((prev) => {
      const real_servers = [...prev.real_servers];
      real_servers[idx] = { ...real_servers[idx], [field]: value };
      return { ...prev, real_servers };
    });
  };

  const addRealServer = () =>
    setForm((prev) => ({ ...prev, real_servers: [...prev.real_servers, emptyRealServer()] }));

  const removeRealServer = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      real_servers: prev.real_servers.filter((_, i) => i !== idx),
    }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.name.trim()) { setError("Virtual server name is required"); return; }
    setLoading(true);
    try {
      await onSubmit(formToServer(form));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? "Edit Virtual Server" : "Add Virtual Server"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Editing virtual server "${existingServer!.name}"`
              : "Configure a keepalived virtual server for load balancing"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-5 py-2">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap font-mono leading-relaxed">{error}</p>
              </div>
            )}

            {/* Name */}
            <FormField
              label="Server Name"
              htmlFor="vs-name"
              required
              description={isEdit ? "Name cannot be changed" : undefined}
            >
              <Input
                id="vs-name"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                disabled={isEdit}
                placeholder="e.g. web-lb"
                className={isEdit ? "opacity-60" : ""}
              />
            </FormField>

            {/* Address & Port */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <FormField label="Virtual IP Address" htmlFor="vs-address">
                  <Input
                    id="vs-address"
                    value={form.address}
                    onChange={(e) => set("address")(e.target.value)}
                    placeholder="10.0.0.100"
                    className="font-mono"
                  />
                </FormField>
              </div>
              <FormField label="Port" htmlFor="vs-port">
                <Input
                  id="vs-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => set("port")(e.target.value)}
                  placeholder="80"
                />
              </FormField>
            </div>

            {/* Protocol, Algorithm, Forward Method */}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Protocol" htmlFor="vs-proto">
                <Select value={form.protocol} onValueChange={(v) => set("protocol")(v === "none" ? "" : v)}>
                  <SelectTrigger id="vs-proto">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Algorithm" htmlFor="vs-algo">
                <Select value={form.algorithm} onValueChange={(v) => set("algorithm")(v === "none" ? "" : v)}>
                  <SelectTrigger id="vs-algo">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default</SelectItem>
                    <SelectItem value="round-robin">Round Robin</SelectItem>
                    <SelectItem value="weighted-round-robin">Weighted Round Robin</SelectItem>
                    <SelectItem value="least-connection">Least Connection</SelectItem>
                    <SelectItem value="weighted-least-connection">Weighted Least Connection</SelectItem>
                    <SelectItem value="source-hashing">Source Hashing</SelectItem>
                    <SelectItem value="destination-hashing">Destination Hashing</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Forward Method" htmlFor="vs-fwd">
                <Select value={form.forward_method} onValueChange={(v) => set("forward_method")(v === "none" ? "" : v)}>
                  <SelectTrigger id="vs-fwd">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default</SelectItem>
                    <SelectItem value="dr">Direct Routing (DR)</SelectItem>
                    <SelectItem value="nat">NAT</SelectItem>
                    <SelectItem value="tunnel">Tunnel</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            {/* Delay Loop, Persistence, FWMark */}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Delay Loop (s)" htmlFor="vs-delay">
                <Input
                  id="vs-delay"
                  type="number"
                  min={1}
                  value={form.delay_loop}
                  onChange={(e) => set("delay_loop")(e.target.value)}
                  placeholder="10"
                />
              </FormField>
              <FormField label="Persistence Timeout (s)" htmlFor="vs-persist">
                <Input
                  id="vs-persist"
                  type="number"
                  min={1}
                  value={form.persistence_timeout}
                  onChange={(e) => set("persistence_timeout")(e.target.value)}
                  placeholder="360"
                />
              </FormField>
              <FormField label="FW Mark" htmlFor="vs-fwmark">
                <Input
                  id="vs-fwmark"
                  value={form.fwmark}
                  onChange={(e) => set("fwmark")(e.target.value)}
                  placeholder="Optional"
                />
              </FormField>
            </div>

            {/* Real Servers */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Real Servers</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Backend servers that receive traffic</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addRealServer}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Server
                </Button>
              </div>

              {form.real_servers.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 flex flex-col items-center gap-2 text-center">
                  <Server className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No real servers configured</p>
                  <p className="text-xs text-muted-foreground">Click &quot;Add Server&quot; to add backend servers</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.real_servers.map((rs, idx) => (
                    <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                      {/* Card header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Server {idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeRealServer(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      </div>

                      {/* Address row */}
                      <FormField label="IP Address" htmlFor={`rs-addr-${idx}`} required>
                        <Input
                          id={`rs-addr-${idx}`}
                          value={rs.address}
                          onChange={(e) => setRealServer(idx, "address", e.target.value)}
                          placeholder="192.168.1.10"
                          className="font-mono"
                        />
                      </FormField>

                      {/* Port + Timeout row */}
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Port" htmlFor={`rs-port-${idx}`}>
                          <Input
                            id={`rs-port-${idx}`}
                            type="number"
                            min={1}
                            max={65535}
                            value={rs.port}
                            onChange={(e) => setRealServer(idx, "port", e.target.value)}
                            placeholder="e.g. 80"
                          />
                        </FormField>
                        <FormField label="Connection Timeout (s)" htmlFor={`rs-timeout-${idx}`}>
                          <Input
                            id={`rs-timeout-${idx}`}
                            type="number"
                            min={1}
                            value={rs.connection_timeout}
                            onChange={(e) => setRealServer(idx, "connection_timeout", e.target.value)}
                            placeholder="e.g. 5"
                          />
                        </FormField>
                      </div>

                      {/* Health check script */}
                      <FormField label="Health Check Script" htmlFor={`rs-script-${idx}`}>
                        <Input
                          id={`rs-script-${idx}`}
                          value={rs.health_check_script}
                          onChange={(e) => setRealServer(idx, "health_check_script", e.target.value)}
                          placeholder="/etc/keepalived/check.sh"
                          className="font-mono"
                        />
                      </FormField>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
