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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type {
  BgpNeighbor,
  BgpNeighborAddressFamilyConfig,
  BgpCapabilities,
} from "@/lib/api/bgp";

// ============================================================================
// Types
// ============================================================================

interface BgpNeighborModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (neighbor: BgpNeighbor) => Promise<void>;
  existingNeighbor?: BgpNeighbor | null;
  peerGroups: string[];
  routeMapNames: string[];
  bfdProfileNames: string[];
  capabilities?: BgpCapabilities | null;
}

// ============================================================================
// Helpers
// ============================================================================

const emptyAfConfig = (): BgpNeighborAddressFamilyConfig => ({
  route_map_export: null,
  route_map_import: null,
  prefix_list_export: null,
  prefix_list_import: null,
  filter_list_export: null,
  filter_list_import: null,
  distribute_list_export: null,
  distribute_list_import: null,
  soft_reconfiguration_inbound: false,
  route_reflector_client: false,
  route_server_client: false,
  nexthop_self: false,
  nexthop_self_force: false,
  addpath_tx_all: false,
  addpath_tx_per_as: false,
  allowas_in_number: null,
  as_override: false,
  attribute_unchanged_as_path: false,
  attribute_unchanged_med: false,
  attribute_unchanged_next_hop: false,
  default_originate: false,
  default_originate_route_map: null,
  maximum_prefix: null,
  maximum_prefix_out: null,
  remove_private_as: false,
  remove_private_as_all: false,
  disable_send_community_extended: false,
  disable_send_community_standard: false,
  weight: null,
  unsuppress_map: null,
});

// ============================================================================
// Component
// ============================================================================

export function BgpNeighborModal({
  open,
  onOpenChange,
  onSubmit,
  existingNeighbor,
  peerGroups,
  routeMapNames,
  bfdProfileNames,
  capabilities,
}: BgpNeighborModalProps) {
  const isEditMode = !!existingNeighbor;

  // --------------------------------------------------------------------------
  // Basic fields
  // --------------------------------------------------------------------------
  const [address, setAddress] = useState("");
  const [remoteAs, setRemoteAs] = useState("");
  const [description, setDescription] = useState("");
  const [peerGroup, setPeerGroup] = useState("");
  const [updateSource, setUpdateSource] = useState("");

  // --------------------------------------------------------------------------
  // Status & Options (boolean flags)
  // --------------------------------------------------------------------------
  const [shutdown, setShutdown] = useState(false);
  const [passive, setPassive] = useState(false);
  const [solo, setSolo] = useState(false);
  const [enforceFirstAs, setEnforceFirstAs] = useState(false);
  const [overrideCapability, setOverrideCapability] = useState(false);
  const [disableCapabilityNegotiation, setDisableCapabilityNegotiation] =
    useState(false);
  const [disableConnectedCheck, setDisableConnectedCheck] = useState(false);

  // --------------------------------------------------------------------------
  // BFD
  // --------------------------------------------------------------------------
  const [bfdEnabled, setBfdEnabled] = useState(false);
  const [bfdCheckControlPlane, setBfdCheckControlPlane] = useState(false);
  const [bfdProfile, setBfdProfile] = useState("");

  // --------------------------------------------------------------------------
  // Capability
  // --------------------------------------------------------------------------
  const [capDynamic, setCapDynamic] = useState(false);
  const [capExtendedNexthop, setCapExtendedNexthop] = useState(false);
  const [capSoftwareVersion, setCapSoftwareVersion] = useState(false);

  // --------------------------------------------------------------------------
  // Timers
  // --------------------------------------------------------------------------
  const [timerConnect, setTimerConnect] = useState("");
  const [timerKeepalive, setTimerKeepalive] = useState("");
  const [timerHoldtime, setTimerHoldtime] = useState("");

  // --------------------------------------------------------------------------
  // Advanced
  // --------------------------------------------------------------------------
  const [ebgpMultihop, setEbgpMultihop] = useState("");
  const [advertisementInterval, setAdvertisementInterval] = useState("");
  const [ttlSecurityHops, setTtlSecurityHops] = useState("");
  const [password, setPassword] = useState("");
  const [port, setPort] = useState("");
  const [gracefulRestart, setGracefulRestart] = useState("");
  const [localAsAsn, setLocalAsAsn] = useState("");
  const [localAsNoPrependReplaceAs, setLocalAsNoPrependReplaceAs] =
    useState(false);
  const [localRole, setLocalRole] = useState("");
  const [localRoleStrict, setLocalRoleStrict] = useState(false);

  // --------------------------------------------------------------------------
  // Address Families
  // --------------------------------------------------------------------------
  const [addressFamilies, setAddressFamilies] = useState<
    Record<string, BgpNeighborAddressFamilyConfig>
  >({});

  // --------------------------------------------------------------------------
  // UI state
  // --------------------------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Available AFI list from capabilities
  // --------------------------------------------------------------------------
  const availableAFIs: string[] =
    capabilities?.address_family_types?.neighbor ?? [];

  // --------------------------------------------------------------------------
  // Populate / reset form
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (open) {
      if (existingNeighbor) {
        setAddress(existingNeighbor.address);
        setRemoteAs(existingNeighbor.remote_as || "");
        setDescription(existingNeighbor.description || "");
        setPeerGroup(existingNeighbor.peer_group || "");
        setUpdateSource(existingNeighbor.update_source || "");

        setShutdown(existingNeighbor.shutdown);
        setPassive(existingNeighbor.passive);
        setSolo(existingNeighbor.solo);
        setEnforceFirstAs(existingNeighbor.enforce_first_as);
        setOverrideCapability(existingNeighbor.override_capability);
        setDisableCapabilityNegotiation(
          existingNeighbor.disable_capability_negotiation
        );
        setDisableConnectedCheck(existingNeighbor.disable_connected_check);

        setBfdEnabled(existingNeighbor.bfd.enabled);
        setBfdCheckControlPlane(
          existingNeighbor.bfd.check_control_plane_failure
        );
        setBfdProfile(existingNeighbor.bfd.profile || "");

        setCapDynamic(existingNeighbor.capability.dynamic);
        setCapExtendedNexthop(existingNeighbor.capability.extended_nexthop);
        setCapSoftwareVersion(existingNeighbor.capability.software_version);

        setTimerConnect(
          existingNeighbor.timers.connect != null
            ? String(existingNeighbor.timers.connect)
            : ""
        );
        setTimerKeepalive(
          existingNeighbor.timers.keepalive != null
            ? String(existingNeighbor.timers.keepalive)
            : ""
        );
        setTimerHoldtime(
          existingNeighbor.timers.holdtime != null
            ? String(existingNeighbor.timers.holdtime)
            : ""
        );

        setEbgpMultihop(
          existingNeighbor.ebgp_multihop != null
            ? String(existingNeighbor.ebgp_multihop)
            : ""
        );
        setAdvertisementInterval(
          existingNeighbor.advertisement_interval != null
            ? String(existingNeighbor.advertisement_interval)
            : ""
        );
        setTtlSecurityHops(
          existingNeighbor.ttl_security_hops != null
            ? String(existingNeighbor.ttl_security_hops)
            : ""
        );
        setPassword(existingNeighbor.password || "");
        setPort(
          existingNeighbor.port != null ? String(existingNeighbor.port) : ""
        );
        setGracefulRestart(existingNeighbor.graceful_restart || "");
        setLocalAsAsn(existingNeighbor.local_as.asn || "");
        setLocalAsNoPrependReplaceAs(
          existingNeighbor.local_as.no_prepend_replace_as
        );
        setLocalRole(existingNeighbor.local_role || "");
        setLocalRoleStrict(existingNeighbor.local_role_strict);

        setAddressFamilies({ ...existingNeighbor.address_families });
        setError(null);
      } else {
        resetForm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingNeighbor]);

  const resetForm = () => {
    setAddress("");
    setRemoteAs("");
    setDescription("");
    setPeerGroup("");
    setUpdateSource("");

    setShutdown(false);
    setPassive(false);
    setSolo(false);
    setEnforceFirstAs(false);
    setOverrideCapability(false);
    setDisableCapabilityNegotiation(false);
    setDisableConnectedCheck(false);

    setBfdEnabled(false);
    setBfdCheckControlPlane(false);
    setBfdProfile("");

    setCapDynamic(false);
    setCapExtendedNexthop(false);
    setCapSoftwareVersion(false);

    setTimerConnect("");
    setTimerKeepalive("");
    setTimerHoldtime("");

    setEbgpMultihop("");
    setAdvertisementInterval("");
    setTtlSecurityHops("");
    setPassword("");
    setPort("");
    setGracefulRestart("");
    setLocalAsAsn("");
    setLocalAsNoPrependReplaceAs(false);
    setLocalRole("");
    setLocalRoleStrict(false);

    setAddressFamilies({});
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // --------------------------------------------------------------------------
  // Address family helpers
  // --------------------------------------------------------------------------
  const toggleAF = (afi: string) => {
    setAddressFamilies((prev) => {
      const next = { ...prev };
      if (next[afi]) {
        delete next[afi];
      } else {
        next[afi] = emptyAfConfig();
      }
      return next;
    });
  };

  const updateAfField = (
    afi: string,
    field: keyof BgpNeighborAddressFamilyConfig,
    value: string | number | boolean | null
  ) => {
    setAddressFamilies((prev) => ({
      ...prev,
      [afi]: {
        ...(prev[afi] || emptyAfConfig()),
        [field]: value,
      },
    }));
  };

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------
  const validateForm = (): string | null => {
    if (!address.trim()) {
      return "Neighbor address is required.";
    }
    if (!address.includes(".") && !address.includes(":")) {
      return "Neighbor address must be a valid IPv4 or IPv6 address.";
    }
    return null;
  };

  // --------------------------------------------------------------------------
  // Submit
  // --------------------------------------------------------------------------
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const neighbor: BgpNeighbor = {
        address: address.trim(),
        remote_as: remoteAs.trim() || null,
        description: description.trim() || null,
        peer_group:
          peerGroup && peerGroup !== "__none__" ? peerGroup : null,
        update_source: updateSource.trim() || null,
        password: password.trim() || null,
        port: port.trim() ? parseInt(port.trim(), 10) : null,
        shutdown,
        passive,
        solo,
        enforce_first_as: enforceFirstAs,
        override_capability: overrideCapability,
        strict_capability_match: false,
        disable_capability_negotiation: disableCapabilityNegotiation,
        disable_connected_check: disableConnectedCheck,
        ebgp_multihop: ebgpMultihop.trim()
          ? parseInt(ebgpMultihop.trim(), 10)
          : null,
        advertisement_interval: advertisementInterval.trim()
          ? parseInt(advertisementInterval.trim(), 10)
          : null,
        graceful_restart:
          gracefulRestart && gracefulRestart !== "__none__"
            ? gracefulRestart
            : null,
        local_as: {
          asn: localAsAsn.trim() || null,
          no_prepend_replace_as: localAsNoPrependReplaceAs,
        },
        local_role:
          localRole && localRole !== "__none__" ? localRole : null,
        local_role_strict: localRoleStrict,
        bfd: {
          enabled: bfdEnabled,
          check_control_plane_failure: bfdCheckControlPlane,
          profile: bfdProfile.trim() || null,
        },
        capability: {
          dynamic: capDynamic,
          extended_nexthop: capExtendedNexthop,
          software_version: capSoftwareVersion,
        },
        timers: {
          connect: timerConnect.trim()
            ? parseInt(timerConnect.trim(), 10)
            : null,
          keepalive: timerKeepalive.trim()
            ? parseInt(timerKeepalive.trim(), 10)
            : null,
          holdtime: timerHoldtime.trim()
            ? parseInt(timerHoldtime.trim(), 10)
            : null,
        },
        ttl_security_hops: ttlSecurityHops.trim()
          ? parseInt(ttlSecurityHops.trim(), 10)
          : null,
        address_families: addressFamilies,
      };

      await onSubmit(neighbor);
      handleClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit BGP Neighbor" : "Add BGP Neighbor"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify the BGP neighbor configuration for ${existingNeighbor?.address}.`
              : "Configure a new BGP neighbor session."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* ============================================================ */}
            {/* SECTION 1 - BASIC SETTINGS                                   */}
            {/* ============================================================ */}
            <Fieldset label="Basic Settings">
              <FormField
                label="Address"
                htmlFor="bgp-neighbor-address"
                description="IPv4 or IPv6 address of the BGP neighbor."
                required={!isEditMode}
              >
                <Input
                  id="bgp-neighbor-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 192.0.2.1 or 2001:db8::1"
                  disabled={isEditMode}
                  className={isEditMode ? "bg-muted" : ""}
                />
              </FormField>

              <FormField
                label="Remote AS"
                htmlFor="bgp-neighbor-remote-as"
                description={'Autonomous System number, or "internal" / "external".'}
              >
                <Input
                  id="bgp-neighbor-remote-as"
                  value={remoteAs}
                  onChange={(e) => setRemoteAs(e.target.value)}
                  placeholder='e.g. 65001, "internal", or "external"'
                />
              </FormField>

              <FormField
                label="Description"
                htmlFor="bgp-neighbor-description"
              >
                <Input
                  id="bgp-neighbor-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </FormField>

              <FormField
                label="Peer Group"
                htmlFor="bgp-neighbor-peer-group"
              >
                <Select value={peerGroup || "__none__"} onValueChange={setPeerGroup}>
                  <SelectTrigger id="bgp-neighbor-peer-group">
                    <SelectValue placeholder="Select peer group (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {peerGroups.map((pg) => (
                      <SelectItem key={pg} value={pg}>
                        {pg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Update Source"
                htmlFor="bgp-neighbor-update-source"
                description="Source address or interface for BGP sessions."
              >
                <Input
                  id="bgp-neighbor-update-source"
                  value={updateSource}
                  onChange={(e) => setUpdateSource(e.target.value)}
                  placeholder="e.g. eth0 or 192.0.2.1"
                />
              </FormField>
            </Fieldset>

            {/* ============================================================ */}
            {/* SECTION 2 - STATUS & OPTIONS                                 */}
            {/* ============================================================ */}
            <FieldsetDivider />
            <Fieldset label="Status and Options">
              <FormField label="Shutdown" htmlFor="bgp-neighbor-shutdown" description="Administratively disable this neighbor." horizontal>
                <Checkbox
                  id="bgp-neighbor-shutdown"
                  checked={shutdown}
                  onCheckedChange={(checked) => setShutdown(checked === true)}
                />
              </FormField>

              <FormField label="Passive" htmlFor="bgp-neighbor-passive" description="Do not initiate a session; wait for remote peer." horizontal>
                <Checkbox
                  id="bgp-neighbor-passive"
                  checked={passive}
                  onCheckedChange={(checked) => setPassive(checked === true)}
                />
              </FormField>

              <FormField label="Solo" htmlFor="bgp-neighbor-solo" description="Solo peer (single adjacency in a group)." horizontal>
                <Checkbox
                  id="bgp-neighbor-solo"
                  checked={solo}
                  onCheckedChange={(checked) => setSolo(checked === true)}
                />
              </FormField>

              <FormField label="Enforce First AS" htmlFor="bgp-neighbor-enforce-first-as" description="Enforce the first AS in the AS path from this neighbor." horizontal>
                <Checkbox
                  id="bgp-neighbor-enforce-first-as"
                  checked={enforceFirstAs}
                  onCheckedChange={(checked) => setEnforceFirstAs(checked === true)}
                />
              </FormField>

              <FormField label="Override Capability" htmlFor="bgp-neighbor-override-capability" description="Override capability negotiation result." horizontal>
                <Checkbox
                  id="bgp-neighbor-override-capability"
                  checked={overrideCapability}
                  onCheckedChange={(checked) => setOverrideCapability(checked === true)}
                />
              </FormField>

              <FormField label="Disable Capability Negotiation" htmlFor="bgp-neighbor-disable-cap-negotiation" description="Suppress sending capability negotiation." horizontal>
                <Checkbox
                  id="bgp-neighbor-disable-cap-negotiation"
                  checked={disableCapabilityNegotiation}
                  onCheckedChange={(checked) => setDisableCapabilityNegotiation(checked === true)}
                />
              </FormField>

              <FormField label="Disable Connected Check" htmlFor="bgp-neighbor-disable-connected-check" description="Allow peering with eBGP neighbors not on a directly connected network." horizontal>
                <Checkbox
                  id="bgp-neighbor-disable-connected-check"
                  checked={disableConnectedCheck}
                  onCheckedChange={(checked) => setDisableConnectedCheck(checked === true)}
                />
              </FormField>
            </Fieldset>

            {/* ============================================================ */}
            {/* SECTION 3 - BFD                                              */}
            {/* ============================================================ */}
            <FieldsetDivider />
            <Fieldset label="BFD">
              <FormField label="Enable BFD" htmlFor="bgp-neighbor-bfd-enabled" description="Enable Bidirectional Forwarding Detection for this neighbor." horizontal>
                <Checkbox
                  id="bgp-neighbor-bfd-enabled"
                  checked={bfdEnabled}
                  onCheckedChange={(checked) => setBfdEnabled(checked === true)}
                />
              </FormField>

              {bfdEnabled && (
                <>
                  <FormField label="Check Control Plane Failure" htmlFor="bgp-neighbor-bfd-control-plane" description="Detect control-plane failures via BFD." horizontal>
                    <Checkbox
                      id="bgp-neighbor-bfd-control-plane"
                      checked={bfdCheckControlPlane}
                      onCheckedChange={(checked) => setBfdCheckControlPlane(checked === true)}
                    />
                  </FormField>

                  <FormField label="BFD Profile">
                    <Select value={bfdProfile || "__none__"} onValueChange={(v) => setBfdProfile(v === "__none__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {bfdProfileNames.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </>
              )}
            </Fieldset>

            {/* ============================================================ */}
            {/* SECTION 4 - CAPABILITY                                       */}
            {/* ============================================================ */}
            <FieldsetDivider />
            <Fieldset label="Capability">
              <FormField label="Dynamic" htmlFor="bgp-neighbor-cap-dynamic" description="Advertise dynamic capability." horizontal>
                <Checkbox
                  id="bgp-neighbor-cap-dynamic"
                  checked={capDynamic}
                  onCheckedChange={(checked) => setCapDynamic(checked === true)}
                />
              </FormField>

              <FormField label="Extended Nexthop" htmlFor="bgp-neighbor-cap-extended-nexthop" description="Advertise extended nexthop capability." horizontal>
                <Checkbox
                  id="bgp-neighbor-cap-extended-nexthop"
                  checked={capExtendedNexthop}
                  onCheckedChange={(checked) => setCapExtendedNexthop(checked === true)}
                />
              </FormField>

              <FormField label="Software Version" htmlFor="bgp-neighbor-cap-software-version" description="Advertise software version capability." horizontal>
                <Checkbox
                  id="bgp-neighbor-cap-software-version"
                  checked={capSoftwareVersion}
                  onCheckedChange={(checked) => setCapSoftwareVersion(checked === true)}
                />
              </FormField>
            </Fieldset>

            {/* ============================================================ */}
            {/* SECTION 5 - TIMERS                                           */}
            {/* ============================================================ */}
            <FieldsetDivider />
            <Fieldset label="Timers">
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Connect Timer" htmlFor="bgp-neighbor-timer-connect">
                  <Input
                    id="bgp-neighbor-timer-connect"
                    type="number"
                    value={timerConnect}
                    onChange={(e) => setTimerConnect(e.target.value)}
                    placeholder="Seconds"
                    min={1}
                  />
                </FormField>

                <FormField label="Keepalive" htmlFor="bgp-neighbor-timer-keepalive">
                  <Input
                    id="bgp-neighbor-timer-keepalive"
                    type="number"
                    value={timerKeepalive}
                    onChange={(e) => setTimerKeepalive(e.target.value)}
                    placeholder="Seconds"
                    min={1}
                  />
                </FormField>

                <FormField label="Holdtime" htmlFor="bgp-neighbor-timer-holdtime">
                  <Input
                    id="bgp-neighbor-timer-holdtime"
                    type="number"
                    value={timerHoldtime}
                    onChange={(e) => setTimerHoldtime(e.target.value)}
                    placeholder="Seconds"
                    min={0}
                  />
                </FormField>
              </div>
            </Fieldset>

            {/* ============================================================ */}
            {/* SECTION 6 - ADVANCED                                         */}
            {/* ============================================================ */}
            <FieldsetDivider />
            <Fieldset label="Advanced">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="eBGP Multihop" htmlFor="bgp-neighbor-ebgp-multihop">
                  <Input
                    id="bgp-neighbor-ebgp-multihop"
                    type="number"
                    value={ebgpMultihop}
                    onChange={(e) => setEbgpMultihop(e.target.value)}
                    placeholder="Max hops (1-255)"
                    min={1}
                    max={255}
                  />
                </FormField>

                <FormField label="Advertisement Interval" htmlFor="bgp-neighbor-adv-interval">
                  <Input
                    id="bgp-neighbor-adv-interval"
                    type="number"
                    value={advertisementInterval}
                    onChange={(e) => setAdvertisementInterval(e.target.value)}
                    placeholder="Seconds"
                    min={0}
                  />
                </FormField>

                <FormField label="TTL Security Hops" htmlFor="bgp-neighbor-ttl-security-hops">
                  <Input
                    id="bgp-neighbor-ttl-security-hops"
                    type="number"
                    value={ttlSecurityHops}
                    onChange={(e) => setTtlSecurityHops(e.target.value)}
                    placeholder="1-254"
                    min={1}
                    max={254}
                  />
                </FormField>

                <FormField label="Port" htmlFor="bgp-neighbor-port">
                  <Input
                    id="bgp-neighbor-port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="179"
                    min={1}
                    max={65535}
                  />
                </FormField>
              </div>

              <FormField label="Password" htmlFor="bgp-neighbor-password">
                <Input
                  id="bgp-neighbor-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="BGP session password (optional)"
                />
              </FormField>

              <FormField label="Graceful Restart" htmlFor="bgp-neighbor-graceful-restart">
                <Select
                  value={gracefulRestart || "__none__"}
                  onValueChange={setGracefulRestart}
                >
                  <SelectTrigger id="bgp-neighbor-graceful-restart">
                    <SelectValue placeholder="Select graceful restart mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    <SelectItem value="enable">Enable</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                    <SelectItem value="restart">Restart</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Local AS Number" htmlFor="bgp-neighbor-local-as">
                <Input
                  id="bgp-neighbor-local-as"
                  value={localAsAsn}
                  onChange={(e) => setLocalAsAsn(e.target.value)}
                  placeholder="Local AS number"
                />
              </FormField>
              {localAsAsn.trim() && (
                <FormField label="No Prepend Replace AS" htmlFor="bgp-neighbor-local-as-no-prepend" description="Do not prepend local-as to updates from this peer and replace the real AS in the AS path." horizontal>
                  <Checkbox
                    id="bgp-neighbor-local-as-no-prepend"
                    checked={localAsNoPrependReplaceAs}
                    onCheckedChange={(checked) => setLocalAsNoPrependReplaceAs(checked === true)}
                  />
                </FormField>
              )}

              {capabilities?.features.local_role.supported && (
                <>
                  <FormField label="Local Role" htmlFor="bgp-neighbor-local-role">
                    <Select
                      value={localRole || "__none__"}
                      onValueChange={setLocalRole}
                    >
                      <SelectTrigger id="bgp-neighbor-local-role">
                        <SelectValue placeholder="Select local role (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="provider">Provider</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="rs-server">RS Server</SelectItem>
                        <SelectItem value="rs-client">RS Client</SelectItem>
                        <SelectItem value="peer">Peer</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  {localRole && localRole !== "__none__" && (
                    <FormField label="Strict Mode" htmlFor="bgp-neighbor-local-role-strict" description="Require the remote peer to send the correct role." horizontal>
                      <Checkbox
                        id="bgp-neighbor-local-role-strict"
                        checked={localRoleStrict}
                        onCheckedChange={(checked) => setLocalRoleStrict(checked === true)}
                      />
                    </FormField>
                  )}
                </>
              )}
            </Fieldset>

            {/* ============================================================ */}
            {/* SECTION 7 - ADDRESS FAMILIES                                 */}
            {/* ============================================================ */}
            <FieldsetDivider />
            <Fieldset label="Address Families">
              {availableAFIs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No address family types available. Load capabilities first.
                </p>
              )}

              {availableAFIs.map((afi) => {
                const isEnabled = !!addressFamilies[afi];
                const afConfig = addressFamilies[afi] || emptyAfConfig();
                return (
                  <div key={afi} className="space-y-3">
                    {/* AFI toggle */}
                    <FormField label={afi} htmlFor={`bgp-neighbor-af-${afi}`} horizontal>
                      <Checkbox
                        id={`bgp-neighbor-af-${afi}`}
                        checked={isEnabled}
                        onCheckedChange={() => toggleAF(afi)}
                      />
                    </FormField>

                    {/* Per-AFI settings */}
                    {isEnabled && (
                      <div className="ml-7 space-y-4 rounded-lg border p-3">
                        {/* Route Maps */}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField label="Route Map Import" htmlFor={`bgp-af-${afi}-rm-import`}>
                            <Select
                              value={afConfig.route_map_import || "__none__"}
                              onValueChange={(v) =>
                                updateAfField(afi, "route_map_import", v === "__none__" ? null : v)
                              }
                            >
                              <SelectTrigger id={`bgp-af-${afi}-rm-import`}>
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {routeMapNames.map((name) => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormField>
                          <FormField label="Route Map Export" htmlFor={`bgp-af-${afi}-rm-export`}>
                            <Select
                              value={afConfig.route_map_export || "__none__"}
                              onValueChange={(v) =>
                                updateAfField(afi, "route_map_export", v === "__none__" ? null : v)
                              }
                            >
                              <SelectTrigger id={`bgp-af-${afi}-rm-export`}>
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {routeMapNames.map((name) => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormField>
                        </div>

                        {/* Boolean options */}
                        <div className="space-y-3">
                          <FormField label="Soft Reconfiguration Inbound" htmlFor={`bgp-af-${afi}-soft-reconfig`} horizontal>
                            <Checkbox
                              id={`bgp-af-${afi}-soft-reconfig`}
                              checked={afConfig.soft_reconfiguration_inbound}
                              onCheckedChange={(checked) =>
                                updateAfField(afi, "soft_reconfiguration_inbound", checked === true)
                              }
                            />
                          </FormField>

                          <FormField label="Next-Hop Self" htmlFor={`bgp-af-${afi}-nexthop-self`} horizontal>
                            <Checkbox
                              id={`bgp-af-${afi}-nexthop-self`}
                              checked={afConfig.nexthop_self}
                              onCheckedChange={(checked) =>
                                updateAfField(afi, "nexthop_self", checked === true)
                              }
                            />
                          </FormField>

                          {afConfig.nexthop_self && (
                            <div className="pl-6">
                              <FormField label="Force" htmlFor={`bgp-af-${afi}-nexthop-self-force`} horizontal>
                                <Checkbox
                                  id={`bgp-af-${afi}-nexthop-self-force`}
                                  checked={afConfig.nexthop_self_force}
                                  onCheckedChange={(checked) =>
                                    updateAfField(afi, "nexthop_self_force", checked === true)
                                  }
                                />
                              </FormField>
                            </div>
                          )}

                          <FormField label="Route Reflector Client" htmlFor={`bgp-af-${afi}-rr-client`} horizontal>
                            <Checkbox
                              id={`bgp-af-${afi}-rr-client`}
                              checked={afConfig.route_reflector_client}
                              onCheckedChange={(checked) =>
                                updateAfField(afi, "route_reflector_client", checked === true)
                              }
                            />
                          </FormField>

                          <FormField label="Default Originate" htmlFor={`bgp-af-${afi}-default-originate`} horizontal>
                            <Checkbox
                              id={`bgp-af-${afi}-default-originate`}
                              checked={afConfig.default_originate}
                              onCheckedChange={(checked) =>
                                updateAfField(afi, "default_originate", checked === true)
                              }
                            />
                          </FormField>

                          {afConfig.default_originate && (
                            <div className="pl-6">
                              <FormField label="Default Originate Route Map" htmlFor={`bgp-af-${afi}-default-originate-rm`}>
                                <Select
                                  value={afConfig.default_originate_route_map || "__none__"}
                                  onValueChange={(v) =>
                                    updateAfField(afi, "default_originate_route_map", v === "__none__" ? null : v)
                                  }
                                >
                                  <SelectTrigger id={`bgp-af-${afi}-default-originate-rm`}>
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {routeMapNames.map((name) => (
                                      <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormField>
                            </div>
                          )}

                          <FormField label="AS Override" htmlFor={`bgp-af-${afi}-as-override`} horizontal>
                            <Checkbox
                              id={`bgp-af-${afi}-as-override`}
                              checked={afConfig.as_override}
                              onCheckedChange={(checked) =>
                                updateAfField(afi, "as_override", checked === true)
                              }
                            />
                          </FormField>

                          <FormField label="Remove Private AS" htmlFor={`bgp-af-${afi}-remove-private-as`} horizontal>
                            <Checkbox
                              id={`bgp-af-${afi}-remove-private-as`}
                              checked={afConfig.remove_private_as}
                              onCheckedChange={(checked) =>
                                updateAfField(afi, "remove_private_as", checked === true)
                              }
                            />
                          </FormField>

                          {afConfig.remove_private_as && (
                            <div className="pl-6">
                              <FormField label="All" htmlFor={`bgp-af-${afi}-remove-private-as-all`} horizontal>
                                <Checkbox
                                  id={`bgp-af-${afi}-remove-private-as-all`}
                                  checked={afConfig.remove_private_as_all}
                                  onCheckedChange={(checked) =>
                                    updateAfField(afi, "remove_private_as_all", checked === true)
                                  }
                                />
                              </FormField>
                            </div>
                          )}
                        </div>

                        {/* Numeric fields */}
                        <div className="grid grid-cols-3 gap-4">
                          <FormField label="Maximum Prefix" htmlFor={`bgp-af-${afi}-max-prefix`}>
                            <Input
                              id={`bgp-af-${afi}-max-prefix`}
                              type="number"
                              value={afConfig.maximum_prefix != null ? String(afConfig.maximum_prefix) : ""}
                              onChange={(e) =>
                                updateAfField(afi, "maximum_prefix", e.target.value ? parseInt(e.target.value, 10) : null)
                              }
                              placeholder="Max prefixes"
                              min={1}
                            />
                          </FormField>

                          <FormField label="Allowas-In Number" htmlFor={`bgp-af-${afi}-allowas-in`}>
                            <Input
                              id={`bgp-af-${afi}-allowas-in`}
                              type="number"
                              value={afConfig.allowas_in_number != null ? String(afConfig.allowas_in_number) : ""}
                              onChange={(e) =>
                                updateAfField(afi, "allowas_in_number", e.target.value ? parseInt(e.target.value, 10) : null)
                              }
                              placeholder="Count"
                              min={1}
                              max={10}
                            />
                          </FormField>

                          <FormField label="Weight" htmlFor={`bgp-af-${afi}-weight`}>
                            <Input
                              id={`bgp-af-${afi}-weight`}
                              type="number"
                              value={afConfig.weight != null ? String(afConfig.weight) : ""}
                              onChange={(e) =>
                                updateAfField(afi, "weight", e.target.value ? parseInt(e.target.value, 10) : null)
                              }
                              placeholder="Weight"
                              min={0}
                              max={65535}
                            />
                          </FormField>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </Fieldset>
          </div>
        </ScrollArea>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Neighbor"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
