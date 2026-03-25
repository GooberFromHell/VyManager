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
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import {
  IsisInterface,
  IsisInterfaceLfa,
  IsisInterfaceTiLfa,
  IsisInterfaceRemoteLfa,
  IsisCapabilities,
} from "@/lib/api/isis";
import { showService } from "@/lib/api/show";

interface IsisInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: IsisInterface) => Promise<void>;
  existingInterface: IsisInterface | null;
  capabilities: IsisCapabilities | null;
}

const emptyLfa = (): IsisInterfaceLfa => ({
  level1_enabled: false,
  level1_exclude_interfaces: [],
  level2_enabled: false,
  level2_exclude_interfaces: [],
});

const emptyTiLfa = (): IsisInterfaceTiLfa => ({
  enabled: false,
  level1_enabled: false,
  level1_node_protection: false,
  level1_link_fallback: false,
  level2_enabled: false,
  level2_node_protection: false,
  level2_link_fallback: false,
});

const emptyRemoteLfa = (): IsisInterfaceRemoteLfa => ({
  level1_enabled: false,
  level1_max_metric: null,
  level1_tunnel_mpls_ldp: false,
  level2_enabled: false,
  level2_max_metric: null,
  level2_tunnel_mpls_ldp: false,
});

export function IsisInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  capabilities,
}: IsisInterfaceModalProps) {
  const isEdit = !!existingInterface;
  const isV15 = capabilities?.version_info.is_1_5 ?? false;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interfaceNames, setInterfaceNames] = useState<string[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(false);

  // Basic fields
  const [name, setName] = useState("");
  const [circuitType, setCircuitType] = useState("");
  const [metric, setMetric] = useState("");
  const [priority, setPriority] = useState("");
  const [passive, setPassive] = useState(false);
  const [pointToPoint, setPointToPoint] = useState(false);
  const [bfd, setBfd] = useState(false);
  const [bfdProfile, setBfdProfile] = useState("");

  // Timers
  const [helloInterval, setHelloInterval] = useState("");
  const [helloMultiplier, setHelloMultiplier] = useState("");
  const [helloPadding, setHelloPadding] = useState(false);
  const [psnpInterval, setPsnpInterval] = useState("");
  const [noThreeWayHandshake, setNoThreeWayHandshake] = useState(false);
  const [ldpSyncHolddown, setLdpSyncHolddown] = useState("");
  const [ldpSyncDisable, setLdpSyncDisable] = useState(false);

  // Authentication
  const [passwordMd5, setPasswordMd5] = useState("");
  const [passwordPlaintext, setPasswordPlaintext] = useState("");

  // LFA
  const [lfaLevel1, setLfaLevel1] = useState(false);
  const [lfaLevel2, setLfaLevel2] = useState(false);

  // TI-LFA (v1.5+)
  const [tiLfaLevel1, setTiLfaLevel1] = useState(false);
  const [tiLfaLevel1NodeProtection, setTiLfaLevel1NodeProtection] = useState(false);
  const [tiLfaLevel1LinkFallback, setTiLfaLevel1LinkFallback] = useState(false);
  const [tiLfaLevel2, setTiLfaLevel2] = useState(false);
  const [tiLfaLevel2NodeProtection, setTiLfaLevel2NodeProtection] = useState(false);
  const [tiLfaLevel2LinkFallback, setTiLfaLevel2LinkFallback] = useState(false);

  // Remote LFA (v1.5+)
  const [remoteLfaLevel1, setRemoteLfaLevel1] = useState(false);
  const [remoteLfaLevel1MaxMetric, setRemoteLfaLevel1MaxMetric] = useState("");
  const [remoteLfaLevel1TunnelMplsLdp, setRemoteLfaLevel1TunnelMplsLdp] = useState(false);
  const [remoteLfaLevel2, setRemoteLfaLevel2] = useState(false);
  const [remoteLfaLevel2MaxMetric, setRemoteLfaLevel2MaxMetric] = useState("");
  const [remoteLfaLevel2TunnelMplsLdp, setRemoteLfaLevel2TunnelMplsLdp] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);

    // Fetch available interface names from the device
    setInterfacesLoading(true);
    showService
      .getAllInterfaces()
      .then((res) => setInterfaceNames(res.interfaces.map((i) => i.name).sort()))
      .catch(() => setInterfaceNames([]))
      .finally(() => setInterfacesLoading(false));

    if (existingInterface) {
      const i = existingInterface;
      setName(i.name);
      setCircuitType(i.circuit_type || "");
      setMetric(i.metric != null ? String(i.metric) : "");
      setPriority(i.priority != null ? String(i.priority) : "");
      setPassive(i.passive);
      setPointToPoint(i.point_to_point);
      setBfd(i.bfd);
      setBfdProfile(i.bfd_profile || "");
      setHelloInterval(i.hello_interval != null ? String(i.hello_interval) : "");
      setHelloMultiplier(i.hello_multiplier != null ? String(i.hello_multiplier) : "");
      setHelloPadding(i.hello_padding);
      setPsnpInterval(i.psnp_interval != null ? String(i.psnp_interval) : "");
      setNoThreeWayHandshake(i.no_three_way_handshake);
      setLdpSyncHolddown(i.ldp_sync_holddown != null ? String(i.ldp_sync_holddown) : "");
      setLdpSyncDisable(i.ldp_sync_disable);
      setPasswordMd5(i.password_md5 || "");
      setPasswordPlaintext(i.password_plaintext || "");
      setLfaLevel1(i.lfa.level1_enabled);
      setLfaLevel2(i.lfa.level2_enabled);
      setTiLfaLevel1(i.ti_lfa.level1_enabled);
      setTiLfaLevel1NodeProtection(i.ti_lfa.level1_node_protection);
      setTiLfaLevel1LinkFallback(i.ti_lfa.level1_link_fallback);
      setTiLfaLevel2(i.ti_lfa.level2_enabled);
      setTiLfaLevel2NodeProtection(i.ti_lfa.level2_node_protection);
      setTiLfaLevel2LinkFallback(i.ti_lfa.level2_link_fallback);
      setRemoteLfaLevel1(i.remote_lfa.level1_enabled);
      setRemoteLfaLevel1MaxMetric(i.remote_lfa.level1_max_metric != null ? String(i.remote_lfa.level1_max_metric) : "");
      setRemoteLfaLevel1TunnelMplsLdp(i.remote_lfa.level1_tunnel_mpls_ldp);
      setRemoteLfaLevel2(i.remote_lfa.level2_enabled);
      setRemoteLfaLevel2MaxMetric(i.remote_lfa.level2_max_metric != null ? String(i.remote_lfa.level2_max_metric) : "");
      setRemoteLfaLevel2TunnelMplsLdp(i.remote_lfa.level2_tunnel_mpls_ldp);
    } else {
      setName("");
      setCircuitType("");
      setMetric("");
      setPriority("");
      setPassive(false);
      setPointToPoint(false);
      setBfd(false);
      setBfdProfile("");
      setHelloInterval("");
      setHelloMultiplier("");
      setHelloPadding(false);
      setPsnpInterval("");
      setNoThreeWayHandshake(false);
      setLdpSyncHolddown("");
      setLdpSyncDisable(false);
      setPasswordMd5("");
      setPasswordPlaintext("");
      setLfaLevel1(false);
      setLfaLevel2(false);
      setTiLfaLevel1(false);
      setTiLfaLevel1NodeProtection(false);
      setTiLfaLevel1LinkFallback(false);
      setTiLfaLevel2(false);
      setTiLfaLevel2NodeProtection(false);
      setTiLfaLevel2LinkFallback(false);
      setRemoteLfaLevel1(false);
      setRemoteLfaLevel1MaxMetric("");
      setRemoteLfaLevel1TunnelMplsLdp(false);
      setRemoteLfaLevel2(false);
      setRemoteLfaLevel2MaxMetric("");
      setRemoteLfaLevel2TunnelMplsLdp(false);
    }
  }, [open, existingInterface]);

  const handleSubmit = async () => {
    if (!name) {
      setError("Please select an interface");
      return;
    }

    const iface: IsisInterface = {
      name,
      circuit_type: circuitType || null,
      metric: metric.trim() ? parseInt(metric.trim(), 10) : null,
      priority: priority.trim() ? parseInt(priority.trim(), 10) : null,
      passive,
      point_to_point: pointToPoint,
      bfd,
      bfd_profile: bfdProfile.trim() || null,
      hello_interval: helloInterval.trim() ? parseInt(helloInterval.trim(), 10) : null,
      hello_multiplier: helloMultiplier.trim() ? parseInt(helloMultiplier.trim(), 10) : null,
      hello_padding: helloPadding,
      psnp_interval: psnpInterval.trim() ? parseInt(psnpInterval.trim(), 10) : null,
      no_three_way_handshake: noThreeWayHandshake,
      ldp_sync_holddown: ldpSyncHolddown.trim() ? parseInt(ldpSyncHolddown.trim(), 10) : null,
      ldp_sync_disable: ldpSyncDisable,
      password_md5: passwordMd5.trim() || null,
      password_plaintext: passwordPlaintext.trim() || null,
      lfa: {
        level1_enabled: lfaLevel1,
        level1_exclude_interfaces: existingInterface?.lfa.level1_exclude_interfaces || [],
        level2_enabled: lfaLevel2,
        level2_exclude_interfaces: existingInterface?.lfa.level2_exclude_interfaces || [],
      },
      ti_lfa: {
        enabled: tiLfaLevel1 || tiLfaLevel2,
        level1_enabled: tiLfaLevel1,
        level1_node_protection: tiLfaLevel1NodeProtection,
        level1_link_fallback: tiLfaLevel1LinkFallback,
        level2_enabled: tiLfaLevel2,
        level2_node_protection: tiLfaLevel2NodeProtection,
        level2_link_fallback: tiLfaLevel2LinkFallback,
      },
      remote_lfa: {
        level1_enabled: remoteLfaLevel1,
        level1_max_metric: remoteLfaLevel1MaxMetric.trim() ? parseInt(remoteLfaLevel1MaxMetric.trim(), 10) : null,
        level1_tunnel_mpls_ldp: remoteLfaLevel1TunnelMplsLdp,
        level2_enabled: remoteLfaLevel2,
        level2_max_metric: remoteLfaLevel2MaxMetric.trim() ? parseInt(remoteLfaLevel2MaxMetric.trim(), 10) : null,
        level2_tunnel_mpls_ldp: remoteLfaLevel2TunnelMplsLdp,
      },
    };

    try {
      setSaving(true);
      setError(null);
      await onSubmit(iface);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save interface");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit IS-IS Interface" : "Add IS-IS Interface"}</DialogTitle>
          <DialogDescription>
            Configure IS-IS parameters for this interface.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <Tabs defaultValue="basic">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">Basic</TabsTrigger>
            <TabsTrigger value="timers" className="flex-1">Timers</TabsTrigger>
            <TabsTrigger value="auth" className="flex-1">Authentication</TabsTrigger>
            <TabsTrigger value="frr" className="flex-1">Fast Reroute</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <Fieldset>
              <FormField label="Interface" htmlFor="isis-iface-name" required={!isEdit}>
                {isEdit ? (
                  <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted text-sm font-mono">
                    {name}
                  </div>
                ) : (
                  <Select value={name} onValueChange={setName} disabled={interfacesLoading}>
                    <SelectTrigger id="isis-iface-name">
                      <SelectValue placeholder={interfacesLoading ? "Loading interfaces..." : "Select interface"} />
                    </SelectTrigger>
                    <SelectContent>
                      {interfaceNames.map((iface) => (
                        <SelectItem key={iface} value={iface} className="font-mono">
                          {iface}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField label="Circuit Type" htmlFor="isis-iface-circuit-type">
                <Select value={circuitType} onValueChange={setCircuitType}>
                  <SelectTrigger id="isis-iface-circuit-type">
                    <SelectValue placeholder="Inherit from level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="level-1">Level 1 Only</SelectItem>
                    <SelectItem value="level-2">Level 2 Only</SelectItem>
                    <SelectItem value="level-1-2">Level 1 and 2</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Metric" htmlFor="isis-iface-metric">
                  <Input
                    id="isis-iface-metric"
                    type="number"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    placeholder="Default"
                    min={1}
                    max={16777214}
                  />
                </FormField>
                <FormField label="Priority (DR election)" htmlFor="isis-iface-priority">
                  <Input
                    id="isis-iface-priority"
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="Default (64)"
                    min={0}
                    max={127}
                  />
                </FormField>
              </div>
            </Fieldset>

            <FieldsetDivider />

            <Fieldset label="Options">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Passive (suppress hellos)" htmlFor="isis-iface-passive" horizontal>
                  <Checkbox id="isis-iface-passive" checked={passive} onCheckedChange={(c) => setPassive(!!c)} />
                </FormField>
                <FormField label="Point-to-Point" htmlFor="isis-iface-p2p" horizontal>
                  <Checkbox id="isis-iface-p2p" checked={pointToPoint} onCheckedChange={(c) => setPointToPoint(!!c)} />
                </FormField>
                <FormField label="BFD" htmlFor="isis-iface-bfd" horizontal>
                  <Checkbox id="isis-iface-bfd" checked={bfd} onCheckedChange={(c) => setBfd(!!c)} />
                </FormField>
                <FormField label="Hello Padding" htmlFor="isis-iface-hello-padding" horizontal>
                  <Checkbox id="isis-iface-hello-padding" checked={helloPadding} onCheckedChange={(c) => setHelloPadding(!!c)} />
                </FormField>
              </div>

              {bfd && (
                <FormField label="BFD Profile" htmlFor="isis-iface-bfd-profile">
                  <Input
                    id="isis-iface-bfd-profile"
                    value={bfdProfile}
                    onChange={(e) => setBfdProfile(e.target.value)}
                    placeholder="Optional BFD profile name"
                  />
                </FormField>
              )}
            </Fieldset>
          </TabsContent>

          {/* Timers Tab */}
          <TabsContent value="timers" className="space-y-4 mt-4">
            <Fieldset label="Timers">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Hello Interval (s)" htmlFor="isis-timer-hello">
                  <Input
                    id="isis-timer-hello"
                    type="number"
                    value={helloInterval}
                    onChange={(e) => setHelloInterval(e.target.value)}
                    placeholder="Default (3)"
                    min={1}
                    max={600}
                  />
                </FormField>
                <FormField label="Hello Multiplier" htmlFor="isis-timer-hello-mult">
                  <Input
                    id="isis-timer-hello-mult"
                    type="number"
                    value={helloMultiplier}
                    onChange={(e) => setHelloMultiplier(e.target.value)}
                    placeholder="Default (10)"
                    min={2}
                    max={100}
                  />
                </FormField>
                <FormField label="PSNP Interval (ms)" htmlFor="isis-timer-psnp">
                  <Input
                    id="isis-timer-psnp"
                    type="number"
                    value={psnpInterval}
                    onChange={(e) => setPsnpInterval(e.target.value)}
                    placeholder="Default (2000)"
                    min={100}
                    max={60000}
                  />
                </FormField>
                <FormField label="LDP Sync Holddown (s)" htmlFor="isis-timer-ldp-holddown">
                  <Input
                    id="isis-timer-ldp-holddown"
                    type="number"
                    value={ldpSyncHolddown}
                    onChange={(e) => setLdpSyncHolddown(e.target.value)}
                    placeholder="Disabled"
                    min={1}
                    max={10000}
                  />
                </FormField>
              </div>
            </Fieldset>

            <FieldsetDivider />

            <Fieldset label="Options">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Disable 3-Way Handshake" htmlFor="isis-timer-no-3way" horizontal>
                  <Checkbox id="isis-timer-no-3way" checked={noThreeWayHandshake} onCheckedChange={(c) => setNoThreeWayHandshake(!!c)} />
                </FormField>
                <FormField label="Disable LDP Sync" htmlFor="isis-timer-ldp-sync-disable" horizontal>
                  <Checkbox id="isis-timer-ldp-sync-disable" checked={ldpSyncDisable} onCheckedChange={(c) => setLdpSyncDisable(!!c)} />
                </FormField>
              </div>
            </Fieldset>
          </TabsContent>

          {/* Authentication Tab */}
          <TabsContent value="auth" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Configure IS-IS authentication for this interface. Only one type can be active at a time.
            </p>
            <Fieldset>
              <FormField label="MD5 Password" htmlFor="isis-auth-md5">
                <Input
                  id="isis-auth-md5"
                  type="password"
                  value={passwordMd5}
                  onChange={(e) => setPasswordMd5(e.target.value)}
                  placeholder="MD5 authentication password"
                />
              </FormField>
              <FormField label="Plaintext Password" htmlFor="isis-auth-plaintext">
                <Input
                  id="isis-auth-plaintext"
                  type="password"
                  value={passwordPlaintext}
                  onChange={(e) => setPasswordPlaintext(e.target.value)}
                  placeholder="Plaintext authentication password"
                />
              </FormField>
            </Fieldset>
          </TabsContent>

          {/* Fast Reroute Tab */}
          <TabsContent value="frr" className="space-y-4 mt-4">
            {/* LFA */}
            <Fieldset label="LFA (Loop-Free Alternate)">
              <FormField label="Enable LFA — Level 1" htmlFor="lfa-l1" horizontal>
                <Checkbox id="lfa-l1" checked={lfaLevel1} onCheckedChange={(c) => setLfaLevel1(!!c)} />
              </FormField>
              <FormField label="Enable LFA — Level 2" htmlFor="lfa-l2" horizontal>
                <Checkbox id="lfa-l2" checked={lfaLevel2} onCheckedChange={(c) => setLfaLevel2(!!c)} />
              </FormField>
            </Fieldset>

            {/* TI-LFA (v1.5 only) */}
            {isV15 && (
              <>
                <FieldsetDivider />
                <Fieldset label="TI-LFA (Topology Independent LFA)">
                  <FormField label="Enable TI-LFA — Level 1" htmlFor="tilfa-l1" horizontal>
                    <Checkbox id="tilfa-l1" checked={tiLfaLevel1} onCheckedChange={(c) => setTiLfaLevel1(!!c)} />
                  </FormField>
                  {tiLfaLevel1 && (
                    <div className="pl-6 space-y-2">
                      <FormField label="Node Protection" htmlFor="tilfa-l1-np" horizontal>
                        <Checkbox id="tilfa-l1-np" checked={tiLfaLevel1NodeProtection} onCheckedChange={(c) => setTiLfaLevel1NodeProtection(!!c)} />
                      </FormField>
                      <FormField label="Link Fallback" htmlFor="tilfa-l1-lf" horizontal>
                        <Checkbox id="tilfa-l1-lf" checked={tiLfaLevel1LinkFallback} onCheckedChange={(c) => setTiLfaLevel1LinkFallback(!!c)} />
                      </FormField>
                    </div>
                  )}
                  <FormField label="Enable TI-LFA — Level 2" htmlFor="tilfa-l2" horizontal>
                    <Checkbox id="tilfa-l2" checked={tiLfaLevel2} onCheckedChange={(c) => setTiLfaLevel2(!!c)} />
                  </FormField>
                  {tiLfaLevel2 && (
                    <div className="pl-6 space-y-2">
                      <FormField label="Node Protection" htmlFor="tilfa-l2-np" horizontal>
                        <Checkbox id="tilfa-l2-np" checked={tiLfaLevel2NodeProtection} onCheckedChange={(c) => setTiLfaLevel2NodeProtection(!!c)} />
                      </FormField>
                      <FormField label="Link Fallback" htmlFor="tilfa-l2-lf" horizontal>
                        <Checkbox id="tilfa-l2-lf" checked={tiLfaLevel2LinkFallback} onCheckedChange={(c) => setTiLfaLevel2LinkFallback(!!c)} />
                      </FormField>
                    </div>
                  )}
                </Fieldset>

                <FieldsetDivider />

                {/* Remote LFA */}
                <Fieldset label="Remote LFA">
                  <FormField label="Enable Remote LFA — Level 1" htmlFor="rlfa-l1" horizontal>
                    <Checkbox id="rlfa-l1" checked={remoteLfaLevel1} onCheckedChange={(c) => setRemoteLfaLevel1(!!c)} />
                  </FormField>
                  {remoteLfaLevel1 && (
                    <div className="pl-6 grid grid-cols-2 gap-3">
                      <FormField label="Max Metric" htmlFor="rlfa-l1-max-metric">
                        <Input
                          id="rlfa-l1-max-metric"
                          type="number"
                          value={remoteLfaLevel1MaxMetric}
                          onChange={(e) => setRemoteLfaLevel1MaxMetric(e.target.value)}
                          placeholder="Unlimited"
                        />
                      </FormField>
                      <FormField label="MPLS LDP Tunnel" htmlFor="rlfa-l1-ldp" horizontal>
                        <Checkbox id="rlfa-l1-ldp" checked={remoteLfaLevel1TunnelMplsLdp} onCheckedChange={(c) => setRemoteLfaLevel1TunnelMplsLdp(!!c)} />
                      </FormField>
                    </div>
                  )}
                  <FormField label="Enable Remote LFA — Level 2" htmlFor="rlfa-l2" horizontal>
                    <Checkbox id="rlfa-l2" checked={remoteLfaLevel2} onCheckedChange={(c) => setRemoteLfaLevel2(!!c)} />
                  </FormField>
                  {remoteLfaLevel2 && (
                    <div className="pl-6 grid grid-cols-2 gap-3">
                      <FormField label="Max Metric" htmlFor="rlfa-l2-max-metric">
                        <Input
                          id="rlfa-l2-max-metric"
                          type="number"
                          value={remoteLfaLevel2MaxMetric}
                          onChange={(e) => setRemoteLfaLevel2MaxMetric(e.target.value)}
                          placeholder="Unlimited"
                        />
                      </FormField>
                      <FormField label="MPLS LDP Tunnel" htmlFor="rlfa-l2-ldp" horizontal>
                        <Checkbox id="rlfa-l2-ldp" checked={remoteLfaLevel2TunnelMplsLdp} onCheckedChange={(c) => setRemoteLfaLevel2TunnelMplsLdp(!!c)} />
                      </FormField>
                    </div>
                  )}
                </Fieldset>
              </>
            )}

            {!isV15 && (
              <p className="text-sm text-muted-foreground">
                TI-LFA and Remote LFA are not supported on this device.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
