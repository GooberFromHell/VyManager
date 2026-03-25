"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { AlertCircle, Plus, X } from "lucide-react";
import { routerAdvertService } from "@/lib/api/router-advert";
import type {
  RouterAdvertInterface,
  RouterAdvertCapabilities,
  RouterAdvertBatchOperation,
  RouterAdvertPrefix,
  RouterAdvertRoute,
} from "@/lib/api/types/router-advert";
import { ApiError } from "@/lib/types/api";

interface PrefixFormEntry {
  prefix: string;
  autonomous_flag: boolean;
  on_link_flag: boolean;
  preferred_lifetime: string;
  valid_lifetime: string;
}

interface RouteFormEntry {
  prefix: string;
  lifetime: string;
  preference: string;
}

function prefixToForm(p: RouterAdvertPrefix): PrefixFormEntry {
  return {
    prefix: p.prefix,
    autonomous_flag: p.autonomous_flag ?? false,
    on_link_flag: p.on_link_flag ?? false,
    preferred_lifetime: p.preferred_lifetime ?? "",
    valid_lifetime: p.valid_lifetime ?? "",
  };
}

function routeToForm(r: RouterAdvertRoute): RouteFormEntry {
  return {
    prefix: r.prefix,
    lifetime: r.lifetime ?? "",
    preference: r.preference ?? "medium",
  };
}

interface EditRouterAdvertInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interface: RouterAdvertInterface | null;
  capabilities: RouterAdvertCapabilities | null;
}

export function EditRouterAdvertInterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  interface: iface,
  capabilities,
}: EditRouterAdvertInterfaceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General Settings
  const [curHopLimit, setCurHopLimit] = useState("");
  const [defaultLifetime, setDefaultLifetime] = useState("");
  const [defaultPreference, setDefaultPreference] = useState("medium");
  const [linkMtu, setLinkMtu] = useState("");

  // Flags
  const [managedFlag, setManagedFlag] = useState(false);
  const [otherConfigFlag, setOtherConfigFlag] = useState(false);
  const [sendAdvert, setSendAdvert] = useState(false);

  // Interval
  const [intervalMax, setIntervalMax] = useState("");
  const [intervalMin, setIntervalMin] = useState("");

  // Timing
  const [reachableTime, setReachableTime] = useState("");
  const [retransTimer, setRetransTimer] = useState("");

  // Prefixes
  const [prefixes, setPrefixes] = useState<PrefixFormEntry[]>([]);

  // Name Servers
  const [nameServers, setNameServers] = useState<string[]>([""]);

  // DNSSL
  const [dnssl, setDnssl] = useState<string[]>([""]);

  // Routes
  const [routes, setRoutes] = useState<RouteFormEntry[]>([]);

  useEffect(() => {
    if (open && iface) {
      setCurHopLimit(iface.cur_hop_limit ?? "");
      setDefaultLifetime(iface.default_lifetime ?? "");
      setDefaultPreference(iface.default_preference ?? "medium");
      setLinkMtu(iface.link_mtu ?? "");
      setManagedFlag(iface.managed_flag);
      setOtherConfigFlag(iface.other_config_flag);
      setSendAdvert(iface.send_advert ?? false);
      setIntervalMax(iface.interval_max ?? "");
      setIntervalMin(iface.interval_min ?? "");
      setReachableTime(iface.reachable_time ?? "");
      setRetransTimer(iface.retrans_timer ?? "");
      setPrefixes(
        iface.prefixes.length > 0 ? iface.prefixes.map(prefixToForm) : []
      );
      setNameServers(
        iface.name_servers.length > 0 ? [...iface.name_servers] : [""]
      );
      setDnssl(iface.dnssl.length > 0 ? [...iface.dnssl] : [""]);
      setRoutes(iface.routes.length > 0 ? iface.routes.map(routeToForm) : []);
      setError(null);
    }
  }, [open, iface]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!iface) return;

    setLoading(true);
    setError(null);

    try {
      const operations: RouterAdvertBatchOperation[] = [];

      // General settings — emit set op only when value differs from original
      if (curHopLimit !== (iface.cur_hop_limit ?? "")) {
        if (curHopLimit.trim()) {
          operations.push({ op: "set_cur_hop_limit", value: curHopLimit.trim() });
        } else {
          operations.push({ op: "delete_cur_hop_limit" });
        }
      }

      if (defaultLifetime !== (iface.default_lifetime ?? "")) {
        if (defaultLifetime.trim()) {
          operations.push({ op: "set_default_lifetime", value: defaultLifetime.trim() });
        } else {
          operations.push({ op: "delete_default_lifetime" });
        }
      }

      if (defaultPreference !== (iface.default_preference ?? "medium")) {
        operations.push({ op: "set_default_preference", value: defaultPreference });
      }

      if (linkMtu !== (iface.link_mtu ?? "")) {
        if (linkMtu.trim()) {
          operations.push({ op: "set_link_mtu", value: linkMtu.trim() });
        } else {
          operations.push({ op: "delete_link_mtu" });
        }
      }

      // Flags
      if (managedFlag !== iface.managed_flag) {
        operations.push({
          op: managedFlag ? "set_managed_flag" : "delete_managed_flag",
        });
      }

      if (otherConfigFlag !== iface.other_config_flag) {
        operations.push({
          op: otherConfigFlag ? "set_other_config_flag" : "delete_other_config_flag",
        });
      }

      if (capabilities?.has_send_advert_bool && sendAdvert !== (iface.send_advert ?? false)) {
        operations.push({
          op: sendAdvert ? "set_send_advert" : "delete_send_advert",
        });
      }

      // Interval
      if (intervalMax !== (iface.interval_max ?? "")) {
        if (intervalMax.trim()) {
          operations.push({ op: "set_interval_max", value: intervalMax.trim() });
        } else {
          operations.push({ op: "delete_interval_max" });
        }
      }

      if (intervalMin !== (iface.interval_min ?? "")) {
        if (intervalMin.trim()) {
          operations.push({ op: "set_interval_min", value: intervalMin.trim() });
        } else {
          operations.push({ op: "delete_interval_min" });
        }
      }

      // Timing
      if (reachableTime !== (iface.reachable_time ?? "")) {
        if (reachableTime.trim()) {
          operations.push({ op: "set_reachable_time", value: reachableTime.trim() });
        } else {
          operations.push({ op: "delete_reachable_time" });
        }
      }

      if (retransTimer !== (iface.retrans_timer ?? "")) {
        if (retransTimer.trim()) {
          operations.push({ op: "set_retrans_timer", value: retransTimer.trim() });
        } else {
          operations.push({ op: "delete_retrans_timer" });
        }
      }

      // Prefixes — delete removed, add new, update changed
      const originalPrefixMap = new Map(
        iface.prefixes.map((p) => [p.prefix, p])
      );
      const newPrefixKeys = new Set(prefixes.map((p) => p.prefix.trim()).filter(Boolean));

      // Delete prefixes that were removed
      for (const orig of iface.prefixes) {
        if (!newPrefixKeys.has(orig.prefix)) {
          operations.push({ op: "delete_prefix", value: orig.prefix });
        }
      }

      // Set all current prefixes (backend handles idempotent sets)
      for (const p of prefixes) {
        const key = p.prefix.trim();
        if (!key) continue;
        const orig = originalPrefixMap.get(key);

        operations.push({ op: "set_prefix", value: key });

        const origAutoFlag = orig?.autonomous_flag ?? false;
        if (p.autonomous_flag !== origAutoFlag) {
          operations.push({
            op: p.autonomous_flag
              ? "set_prefix_autonomous_flag"
              : "delete_prefix_autonomous_flag",
            value: key,
          });
        }

        const origOnLink = orig?.on_link_flag ?? false;
        if (p.on_link_flag !== origOnLink) {
          operations.push({
            op: p.on_link_flag
              ? "set_prefix_on_link_flag"
              : "delete_prefix_on_link_flag",
            value: key,
          });
        }

        if (p.preferred_lifetime !== (orig?.preferred_lifetime ?? "")) {
          if (p.preferred_lifetime.trim()) {
            operations.push({
              op: "set_prefix_preferred_lifetime",
              value: `${key} ${p.preferred_lifetime.trim()}`,
            });
          } else if (orig?.preferred_lifetime) {
            operations.push({ op: "delete_prefix_preferred_lifetime", value: key });
          }
        }

        if (p.valid_lifetime !== (orig?.valid_lifetime ?? "")) {
          if (p.valid_lifetime.trim()) {
            operations.push({
              op: "set_prefix_valid_lifetime",
              value: `${key} ${p.valid_lifetime.trim()}`,
            });
          } else if (orig?.valid_lifetime) {
            operations.push({ op: "delete_prefix_valid_lifetime", value: key });
          }
        }
      }

      // Name Servers — compute delta
      const newNS = nameServers.map((s) => s.trim()).filter(Boolean);
      const origNS = iface.name_servers;
      for (const ns of origNS) {
        if (!newNS.includes(ns)) {
          operations.push({ op: "delete_name_server", value: ns });
        }
      }
      for (const ns of newNS) {
        if (!origNS.includes(ns)) {
          operations.push({ op: "set_name_server", value: ns });
        }
      }

      // DNSSL — compute delta
      if (capabilities?.has_dnssl) {
        const newDnssl = dnssl.map((d) => d.trim()).filter(Boolean);
        const origDnssl = iface.dnssl;
        for (const d of origDnssl) {
          if (!newDnssl.includes(d)) {
            operations.push({ op: "delete_dnssl", value: d });
          }
        }
        for (const d of newDnssl) {
          if (!origDnssl.includes(d)) {
            operations.push({ op: "set_dnssl", value: d });
          }
        }
      }

      // Routes — delete removed, add new
      if (capabilities?.has_route) {
        const origRouteMap = new Map(iface.routes.map((r) => [r.prefix, r]));
        const newRouteKeys = new Set(
          routes.map((r) => r.prefix.trim()).filter(Boolean)
        );

        for (const orig of iface.routes) {
          if (!newRouteKeys.has(orig.prefix)) {
            operations.push({ op: "delete_route", value: orig.prefix });
          }
        }

        for (const r of routes) {
          const key = r.prefix.trim();
          if (!key) continue;
          const orig = origRouteMap.get(key);

          if (!orig) {
            operations.push({ op: "set_route", value: key });
          }

          if (r.lifetime !== (orig?.lifetime ?? "")) {
            if (r.lifetime.trim()) {
              operations.push({
                op: "set_route_lifetime",
                value: `${key} ${r.lifetime.trim()}`,
              });
            } else if (orig?.lifetime) {
              operations.push({ op: "delete_route_lifetime", value: key });
            }
          }

          if (r.preference !== (orig?.preference ?? "medium")) {
            operations.push({
              op: "set_route_preference",
              value: `${key} ${r.preference}`,
            });
          }
        }
      }

      if (operations.length === 0) {
        handleClose();
        return;
      }

      await routerAdvertService.updateInterface(iface.name, operations);
      await routerAdvertService.refreshConfig();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        (err as ApiError).message || "Failed to update router advertisement configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  // Prefix helpers
  const addPrefix = () =>
    setPrefixes([
      ...prefixes,
      { prefix: "", autonomous_flag: false, on_link_flag: false, preferred_lifetime: "", valid_lifetime: "" },
    ]);
  const updatePrefix = (index: number, field: keyof PrefixFormEntry, value: string | boolean) => {
    const updated = [...prefixes];
    updated[index] = { ...updated[index], [field]: value };
    setPrefixes(updated);
  };
  const removePrefix = (index: number) => setPrefixes(prefixes.filter((_, i) => i !== index));

  // Name Server helpers
  const addNameServer = () => setNameServers([...nameServers, ""]);
  const updateNameServer = (index: number, value: string) => {
    const updated = [...nameServers];
    updated[index] = value;
    setNameServers(updated);
  };
  const removeNameServer = (index: number) =>
    setNameServers(nameServers.filter((_, i) => i !== index));

  // DNSSL helpers
  const addDnssl = () => setDnssl([...dnssl, ""]);
  const updateDnssl = (index: number, value: string) => {
    const updated = [...dnssl];
    updated[index] = value;
    setDnssl(updated);
  };
  const removeDnssl = (index: number) => setDnssl(dnssl.filter((_, i) => i !== index));

  // Route helpers
  const addRoute = () =>
    setRoutes([...routes, { prefix: "", lifetime: "", preference: "medium" }]);
  const updateRoute = (index: number, field: keyof RouteFormEntry, value: string) => {
    const updated = [...routes];
    updated[index] = { ...updated[index], [field]: value };
    setRoutes(updated);
  };
  const removeRoute = (index: number) => setRoutes(routes.filter((_, i) => i !== index));

  if (!iface) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Router Advertisement — {iface.name}</DialogTitle>
          <DialogDescription>
            Update router advertisement settings for interface {iface.name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 min-h-0">
          <div className="space-y-6 pb-4">
            {/* General Settings */}
            <Fieldset label="General Settings">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Current Hop Limit"
                  htmlFor="cur-hop-limit"
                >
                  <Input
                    id="cur-hop-limit"
                    value={curHopLimit}
                    onChange={(e) => setCurHopLimit(e.target.value)}
                    placeholder="e.g., 64"
                  />
                </FormField>

                <FormField
                  label="Default Lifetime (s)"
                  htmlFor="default-lifetime"
                >
                  <Input
                    id="default-lifetime"
                    value={defaultLifetime}
                    onChange={(e) => setDefaultLifetime(e.target.value)}
                    placeholder="e.g., 1800"
                  />
                </FormField>

                <FormField
                  label="Default Preference"
                  htmlFor="edit-default-preference"
                >
                  <Select
                    value={defaultPreference}
                    onValueChange={setDefaultPreference}
                  >
                    <SelectTrigger id="edit-default-preference" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  label="Link MTU"
                  htmlFor="link-mtu"
                >
                  <Input
                    id="link-mtu"
                    value={linkMtu}
                    onChange={(e) => setLinkMtu(e.target.value)}
                    placeholder="e.g., 1500"
                  />
                </FormField>
              </div>
            </Fieldset>

            <FieldsetDivider />

            {/* Flags */}
            <Fieldset label="Flags">
              <FormField
                label="Managed Flag"
                htmlFor="edit-managed-flag"
                description="Indicate that addresses are managed via DHCPv6"
                horizontal
              >
                <Checkbox
                  id="edit-managed-flag"
                  checked={managedFlag}
                  onCheckedChange={(checked) => setManagedFlag(checked as boolean)}
                />
              </FormField>

              <FormField
                label="Other Config Flag"
                htmlFor="edit-other-config-flag"
                description="Indicate that other configuration is available via DHCPv6"
                horizontal
              >
                <Checkbox
                  id="edit-other-config-flag"
                  checked={otherConfigFlag}
                  onCheckedChange={(checked) =>
                    setOtherConfigFlag(checked as boolean)
                  }
                />
              </FormField>

              {capabilities?.has_send_advert_bool && (
                <FormField
                  label="Send Advert"
                  htmlFor="edit-send-advert"
                  description="Enable sending of router advertisement messages"
                  horizontal
                >
                  <Checkbox
                    id="edit-send-advert"
                    checked={sendAdvert}
                    onCheckedChange={(checked) =>
                      setSendAdvert(checked as boolean)
                    }
                  />
                </FormField>
              )}
            </Fieldset>

            <FieldsetDivider />

            {/* Interval */}
            <Fieldset label="Advertisement Interval">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Max Interval (s)"
                  htmlFor="interval-max"
                >
                  <Input
                    id="interval-max"
                    value={intervalMax}
                    onChange={(e) => setIntervalMax(e.target.value)}
                    placeholder="e.g., 600"
                  />
                </FormField>

                <FormField
                  label="Min Interval (s)"
                  htmlFor="interval-min"
                >
                  <Input
                    id="interval-min"
                    value={intervalMin}
                    onChange={(e) => setIntervalMin(e.target.value)}
                    placeholder="e.g., 198"
                  />
                </FormField>
              </div>
            </Fieldset>

            <FieldsetDivider />

            {/* Timing */}
            <Fieldset label="Timing">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Reachable Time (ms)"
                  htmlFor="reachable-time"
                >
                  <Input
                    id="reachable-time"
                    value={reachableTime}
                    onChange={(e) => setReachableTime(e.target.value)}
                    placeholder="e.g., 0"
                  />
                </FormField>

                <FormField
                  label="Retrans Timer (ms)"
                  htmlFor="retrans-timer"
                >
                  <Input
                    id="retrans-timer"
                    value={retransTimer}
                    onChange={(e) => setRetransTimer(e.target.value)}
                    placeholder="e.g., 0"
                  />
                </FormField>
              </div>
            </Fieldset>

            <FieldsetDivider />

            {/* Prefixes */}
            <Fieldset label="Prefixes">
              <div className="flex justify-end -mt-2 mb-1">
                <Button type="button" variant="outline" size="sm" onClick={addPrefix}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prefix
                </Button>
              </div>
              {prefixes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No prefixes configured
                </p>
              ) : (
                <div className="space-y-4">
                  {prefixes.map((p, index) => (
                    <div
                      key={index}
                      className="border border-border rounded-lg p-4 space-y-3 relative"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => removePrefix(index)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>

                      <FormField label="Prefix">
                        <Input
                          value={p.prefix}
                          onChange={(e) => updatePrefix(index, "prefix", e.target.value)}
                          placeholder="e.g., 2001:db8::/64"
                        />
                      </FormField>

                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Preferred Lifetime">
                          <Input
                            value={p.preferred_lifetime}
                            onChange={(e) =>
                              updatePrefix(index, "preferred_lifetime", e.target.value)
                            }
                            placeholder="e.g., 14400"
                          />
                        </FormField>
                        <FormField label="Valid Lifetime">
                          <Input
                            value={p.valid_lifetime}
                            onChange={(e) =>
                              updatePrefix(index, "valid_lifetime", e.target.value)
                            }
                            placeholder="e.g., 2592000"
                          />
                        </FormField>
                      </div>

                      <div className="flex gap-6">
                        <FormField
                          label="Autonomous Flag"
                          htmlFor={`prefix-autonomous-${index}`}
                          horizontal
                        >
                          <Checkbox
                            id={`prefix-autonomous-${index}`}
                            checked={p.autonomous_flag}
                            onCheckedChange={(checked) =>
                              updatePrefix(index, "autonomous_flag", checked as boolean)
                            }
                          />
                        </FormField>
                        <FormField
                          label="On-Link Flag"
                          htmlFor={`prefix-on-link-${index}`}
                          horizontal
                        >
                          <Checkbox
                            id={`prefix-on-link-${index}`}
                            checked={p.on_link_flag}
                            onCheckedChange={(checked) =>
                              updatePrefix(index, "on_link_flag", checked as boolean)
                            }
                          />
                        </FormField>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Fieldset>

            <FieldsetDivider />

            {/* Name Servers */}
            <Fieldset label="Name Servers">
              <div className="space-y-2">
                {nameServers.map((ns, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={ns}
                      onChange={(e) => updateNameServer(index, e.target.value)}
                      placeholder="e.g., 2001:4860:4860::8888"
                    />
                    {nameServers.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeNameServer(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNameServer}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Name Server
                </Button>
              </div>
            </Fieldset>

            {/* DNSSL */}
            {capabilities?.has_dnssl && (
              <>
                <FieldsetDivider />
                <Fieldset label="DNS Search List (DNSSL)">
                  <div className="space-y-2">
                    {dnssl.map((domain, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={domain}
                          onChange={(e) => updateDnssl(index, e.target.value)}
                          placeholder="e.g., example.com"
                        />
                        {dnssl.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeDnssl(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDnssl}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Domain
                    </Button>
                  </div>
                </Fieldset>
              </>
            )}

            {/* Routes */}
            {capabilities?.has_route && (
              <>
                <FieldsetDivider />
                <Fieldset label="Routes">
                  <div className="flex justify-end -mt-2 mb-1">
                    <Button type="button" variant="outline" size="sm" onClick={addRoute}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Route
                    </Button>
                  </div>
                  {routes.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No routes configured
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {routes.map((r, index) => (
                        <div
                          key={index}
                          className="border border-border rounded-lg p-4 space-y-3 relative"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7"
                            onClick={() => removeRoute(index)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>

                          <FormField label="Route Prefix">
                            <Input
                              value={r.prefix}
                              onChange={(e) => updateRoute(index, "prefix", e.target.value)}
                              placeholder="e.g., ::/0"
                            />
                          </FormField>

                          <div className="grid grid-cols-2 gap-3">
                            <FormField label="Lifetime (s)">
                              <Input
                                value={r.lifetime}
                                onChange={(e) =>
                                  updateRoute(index, "lifetime", e.target.value)
                                }
                                placeholder="e.g., 1800"
                              />
                            </FormField>
                            <FormField label="Preference">
                              <Select
                                value={r.preference}
                                onValueChange={(val) =>
                                  updateRoute(index, "preference", val)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormField>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Fieldset>
              </>
            )}
          </div>
        </ScrollArea>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
