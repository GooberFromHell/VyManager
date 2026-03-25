"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle } from "lucide-react";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { routeMapService } from "@/lib/api/route-map";
import type { RouteMapCapabilities, MatchConditions, SetActions } from "@/lib/api/route-map";

interface CreateRouteMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateRouteMapModal({ open, onOpenChange, onSuccess }: CreateRouteMapModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<RouteMapCapabilities | null>(null);

  // Basic fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleNumber, setRuleNumber] = useState("100");
  const [ruleDescription, setRuleDescription] = useState("");
  const [action, setAction] = useState("permit");

  // Advanced rule options
  const [call, setCall] = useState("");
  const [continueRule, setContinueRule] = useState("");
  const [onMatchGoto, setOnMatchGoto] = useState("");
  const [onMatchNext, setOnMatchNext] = useState(false);

  // Match Conditions - BGP
  const [matchAsPath, setMatchAsPath] = useState("");
  const [matchCommunityList, setMatchCommunityList] = useState("");
  const [matchCommunityExact, setMatchCommunityExact] = useState(false);
  const [matchExtcommunity, setMatchExtcommunity] = useState("");
  const [matchLargeCommunityList, setMatchLargeCommunityList] = useState("");
  const [matchLargeCommunityExact, setMatchLargeCommunityExact] = useState(false);
  const [matchLocalPref, setMatchLocalPref] = useState("");
  const [matchMetric, setMatchMetric] = useState("");
  const [matchOrigin, setMatchOrigin] = useState("");
  const [matchPeer, setMatchPeer] = useState("");
  const [matchRpki, setMatchRpki] = useState("");

  // Match Conditions - IP/IPv6 Address
  const [matchIpAddressAccessList, setMatchIpAddressAccessList] = useState("");
  const [matchIpAddressPrefixList, setMatchIpAddressPrefixList] = useState("");
  const [matchIpAddressPrefixLen, setMatchIpAddressPrefixLen] = useState("");
  const [matchIpv6AddressAccessList, setMatchIpv6AddressAccessList] = useState("");
  const [matchIpv6AddressPrefixList, setMatchIpv6AddressPrefixList] = useState("");
  const [matchIpv6AddressPrefixLen, setMatchIpv6AddressPrefixLen] = useState("");

  // Match Conditions - Next-Hop
  const [matchIpNexthopAccessList, setMatchIpNexthopAccessList] = useState("");
  const [matchIpNexthopAddress, setMatchIpNexthopAddress] = useState("");
  const [matchIpNexthopPrefixLen, setMatchIpNexthopPrefixLen] = useState("");
  const [matchIpNexthopPrefixList, setMatchIpNexthopPrefixList] = useState("");
  const [matchIpNexthopType, setMatchIpNexthopType] = useState("");
  const [matchIpv6NexthopAddress, setMatchIpv6NexthopAddress] = useState("");

  // Match Conditions - Route Source
  const [matchIpRouteSourceAccessList, setMatchIpRouteSourceAccessList] = useState("");
  const [matchIpRouteSourcePrefixList, setMatchIpRouteSourcePrefixList] = useState("");

  // Match Conditions - Other
  const [matchInterface, setMatchInterface] = useState("");
  const [matchProtocol, setMatchProtocol] = useState("");
  const [matchSourceVrf, setMatchSourceVrf] = useState("");
  const [matchTag, setMatchTag] = useState("");

  // Set Actions - BGP AS Path
  const [setAsPathExclude, setSetAsPathExclude] = useState("");
  const [setAsPathPrepend, setSetAsPathPrepend] = useState("");
  const [setAsPathPrependLastAs, setSetAsPathPrependLastAs] = useState("");

  // Set Actions - Communities
  const [setCommunityValue, setSetCommunityValue] = useState("");
  const [setCommunityAction, setSetCommunityAction] = useState("");
  const [setLargeCommunityValue, setSetLargeCommunityValue] = useState("");
  const [setLargeCommunityAction, setSetLargeCommunityAction] = useState("");
  const [setExtcommunityBandwidth, setSetExtcommunityBandwidth] = useState("");
  const [setExtcommunityRt, setSetExtcommunityRt] = useState("");
  const [setExtcommunitySoo, setSetExtcommunitySoo] = useState("");
  const [setExtcommunityNone, setSetExtcommunityNone] = useState(false);

  // Set Actions - BGP Attributes
  const [setAtomicAggregate, setSetAtomicAggregate] = useState(false);
  const [setAggregatorAs, setSetAggregatorAs] = useState("");
  const [setAggregatorIp, setSetAggregatorIp] = useState("");
  const [setLocalPref, setSetLocalPref] = useState("");
  const [setOrigin, setSetOrigin] = useState("");
  const [setOriginatorId, setSetOriginatorId] = useState("");
  const [setWeight, setSetWeight] = useState("");

  // Set Actions - Next-Hop
  const [setIpNexthop, setSetIpNexthop] = useState("");
  const [setIpNexthopPeerAddress, setSetIpNexthopPeerAddress] = useState(false);
  const [setIpNexthopUnchanged, setSetIpNexthopUnchanged] = useState(false);
  const [setIpv6NexthopGlobal, setSetIpv6NexthopGlobal] = useState("");
  const [setIpv6NexthopLocal, setSetIpv6NexthopLocal] = useState("");
  const [setIpv6NexthopPeerAddress, setSetIpv6NexthopPeerAddress] = useState(false);
  const [setIpv6NexthopPreferGlobal, setSetIpv6NexthopPreferGlobal] = useState(false);

  // Set Actions - Route Properties
  const [setDistance, setSetDistance] = useState("");
  const [setMetric, setSetMetric] = useState("");
  const [setMetricType, setSetMetricType] = useState("");
  const [setSrc, setSetSrc] = useState("");
  const [setTable, setSetTable] = useState("");
  const [setTag, setSetTag] = useState("");

  useEffect(() => {
    if (open) {
      loadCapabilities();
    }
  }, [open]);

  const loadCapabilities = async () => {
    try {
      const caps = await routeMapService.getCapabilities();
      setCapabilities(caps);
    } catch (err) {
      console.error("Failed to load capabilities:", err);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setRuleNumber("10");
    setRuleDescription("");
    setAction("permit");
    setCall("");
    setContinueRule("");
    setOnMatchGoto("");
    setOnMatchNext(false);

    // Reset all match conditions
    setMatchAsPath("");
    setMatchCommunityList("");
    setMatchCommunityExact(false);
    setMatchExtcommunity("");
    setMatchLargeCommunityList("");
    setMatchLargeCommunityExact(false);
    setMatchLocalPref("");
    setMatchMetric("");
    setMatchOrigin("");
    setMatchPeer("");
    setMatchRpki("");
    setMatchIpAddressAccessList("");
    setMatchIpAddressPrefixList("");
    setMatchIpAddressPrefixLen("");
    setMatchIpv6AddressAccessList("");
    setMatchIpv6AddressPrefixList("");
    setMatchIpv6AddressPrefixLen("");
    setMatchIpNexthopAccessList("");
    setMatchIpNexthopAddress("");
    setMatchIpNexthopPrefixLen("");
    setMatchIpNexthopPrefixList("");
    setMatchIpNexthopType("");
    setMatchIpv6NexthopAddress("");
    setMatchIpRouteSourceAccessList("");
    setMatchIpRouteSourcePrefixList("");
    setMatchInterface("");
    setMatchProtocol("");
    setMatchSourceVrf("");
    setMatchTag("");

    // Reset all set actions
    setSetAsPathExclude("");
    setSetAsPathPrepend("");
    setSetAsPathPrependLastAs("");
    setSetCommunityValue("");
    setSetCommunityAction("");
    setSetLargeCommunityValue("");
    setSetLargeCommunityAction("");
    setSetExtcommunityBandwidth("");
    setSetExtcommunityRt("");
    setSetExtcommunitySoo("");
    setSetExtcommunityNone(false);
    setSetAtomicAggregate(false);
    setSetAggregatorAs("");
    setSetAggregatorIp("");
    setSetLocalPref("");
    setSetOrigin("");
    setSetOriginatorId("");
    setSetWeight("");
    setSetIpNexthop("");
    setSetIpNexthopPeerAddress(false);
    setSetIpNexthopUnchanged(false);
    setSetIpv6NexthopGlobal("");
    setSetIpv6NexthopLocal("");
    setSetIpv6NexthopPeerAddress(false);
    setSetIpv6NexthopPreferGlobal(false);
    setSetDistance("");
    setSetMetric("");
    setSetMetricType("");
    setSetSrc("");
    setSetTable("");
    setSetTag("");

    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Route-map name is required");
      return;
    }

    if (!ruleNumber.trim()) {
      setError("Rule number is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build match conditions
      const match: Partial<MatchConditions> = {};
      if (matchAsPath.trim()) match.as_path = matchAsPath.trim();
      if (matchCommunityList.trim()) match.community_list = matchCommunityList.trim();
      match.community_exact_match = matchCommunityExact;
      if (matchExtcommunity.trim()) match.extcommunity = matchExtcommunity.trim();
      if (matchLargeCommunityList.trim()) match.large_community_list = matchLargeCommunityList.trim();
      match.large_community_exact_match = matchLargeCommunityExact;
      if (matchLocalPref.trim()) match.local_preference = parseInt(matchLocalPref);
      if (matchMetric.trim()) match.metric = parseInt(matchMetric);
      if (matchOrigin.trim()) match.origin = matchOrigin.trim();
      if (matchPeer.trim()) match.peer = matchPeer.trim();
      if (matchRpki.trim()) match.rpki = matchRpki.trim();
      if (matchIpAddressAccessList.trim()) match.ip_address_access_list = matchIpAddressAccessList.trim();
      if (matchIpAddressPrefixList.trim()) match.ip_address_prefix_list = matchIpAddressPrefixList.trim();
      if (matchIpAddressPrefixLen.trim()) match.ip_address_prefix_len = parseInt(matchIpAddressPrefixLen);
      if (matchIpv6AddressAccessList.trim()) match.ipv6_address_access_list = matchIpv6AddressAccessList.trim();
      if (matchIpv6AddressPrefixList.trim()) match.ipv6_address_prefix_list = matchIpv6AddressPrefixList.trim();
      if (matchIpv6AddressPrefixLen.trim()) match.ipv6_address_prefix_len = parseInt(matchIpv6AddressPrefixLen);
      if (matchIpNexthopAccessList.trim()) match.ip_nexthop_access_list = matchIpNexthopAccessList.trim();
      if (matchIpNexthopAddress.trim()) match.ip_nexthop_address = matchIpNexthopAddress.trim();
      if (matchIpNexthopPrefixLen.trim()) match.ip_nexthop_prefix_len = parseInt(matchIpNexthopPrefixLen);
      if (matchIpNexthopPrefixList.trim()) match.ip_nexthop_prefix_list = matchIpNexthopPrefixList.trim();
      if (matchIpNexthopType.trim()) match.ip_nexthop_type = matchIpNexthopType.trim();
      if (matchIpv6NexthopAddress.trim()) match.ipv6_nexthop_address = matchIpv6NexthopAddress.trim();
      if (matchIpRouteSourceAccessList.trim()) match.ip_route_source_access_list = matchIpRouteSourceAccessList.trim();
      if (matchIpRouteSourcePrefixList.trim()) match.ip_route_source_prefix_list = matchIpRouteSourcePrefixList.trim();
      if (matchInterface.trim()) match.interface = matchInterface.trim();
      if (matchProtocol.trim()) match.protocol = matchProtocol.trim();
      if (matchSourceVrf.trim()) match.source_vrf = matchSourceVrf.trim();
      if (matchTag.trim()) match.tag = parseInt(matchTag);

      // Build set actions
      const set: Partial<SetActions> = {};
      if (setAsPathExclude.trim()) set.as_path_exclude = setAsPathExclude.trim();
      if (setAsPathPrepend.trim()) set.as_path_prepend = setAsPathPrepend.trim();
      if (setAsPathPrependLastAs.trim()) set.as_path_prepend_last_as = parseInt(setAsPathPrependLastAs);

      if (setCommunityValue.trim()) {
        const v = setCommunityValue.trim();
        if (setCommunityAction === "add") {
          set.community_add_values = [v];
        } else if (setCommunityAction === "delete") {
          set.community_delete_values = [v];
        } else if (setCommunityAction === "replace") {
          set.community_replace_values = [v];
        } else if (setCommunityAction === "none") {
          set.community_remove_all = true;
        }
      }
      if (setLargeCommunityValue.trim()) {
        const v = setLargeCommunityValue.trim();
        if (setLargeCommunityAction === "add") {
          set.large_community_add_values = [v];
        } else if (setLargeCommunityAction === "delete") {
          set.large_community_delete_values = [v];
        } else if (setLargeCommunityAction === "replace") {
          set.large_community_replace_values = [v];
        } else if (setLargeCommunityAction === "none") {
          set.large_community_remove_all = true;
        }
      }
      if (setExtcommunityBandwidth.trim()) set.extcommunity_bandwidth = setExtcommunityBandwidth.trim();
      if (setExtcommunityRt.trim()) set.extcommunity_rt = setExtcommunityRt.trim();
      if (setExtcommunitySoo.trim()) set.extcommunity_soo = setExtcommunitySoo.trim();
      set.extcommunity_none = setExtcommunityNone;
      set.atomic_aggregate = setAtomicAggregate;
      if (setAggregatorAs.trim()) set.aggregator_as = setAggregatorAs.trim();
      if (setAggregatorIp.trim()) set.aggregator_ip = setAggregatorIp.trim();
      if (setLocalPref.trim()) set.local_preference = parseInt(setLocalPref);
      if (setOrigin.trim()) set.origin = setOrigin.trim();
      if (setOriginatorId.trim()) set.originator_id = setOriginatorId.trim();
      if (setWeight.trim()) set.weight = parseInt(setWeight);
      // Handle IP next-hop - only one option at a time
      if (setIpNexthopPeerAddress) {
        set.ip_nexthop = "peer-address";
      } else if (setIpNexthopUnchanged) {
        set.ip_nexthop = "unchanged";
      } else if (setIpNexthop.trim()) {
        set.ip_nexthop = setIpNexthop.trim();
      }
      if (setIpv6NexthopGlobal.trim()) set.ipv6_nexthop_global = setIpv6NexthopGlobal.trim();
      if (setIpv6NexthopLocal.trim()) set.ipv6_nexthop_local = setIpv6NexthopLocal.trim();
      set.ipv6_nexthop_peer_address = setIpv6NexthopPeerAddress;
      set.ipv6_nexthop_prefer_global = setIpv6NexthopPreferGlobal;
      if (setDistance.trim()) set.distance = parseInt(setDistance);
      if (setMetric.trim()) set.metric = setMetric.trim();
      if (setMetricType.trim()) set.metric_type = setMetricType.trim();
      if (setSrc.trim()) set.src = setSrc.trim();
      if (setTable.trim()) set.table = parseInt(setTable);
      if (setTag.trim()) set.tag = parseInt(setTag);

      const rule: any = {
        rule_number: parseInt(ruleNumber),
        description: ruleDescription.trim() || null,
        action,
        call: call.trim() || null,
        continue_rule: continueRule.trim() ? parseInt(continueRule) : null,
        on_match_goto: onMatchGoto.trim() ? parseInt(onMatchGoto) : null,
        on_match_next: onMatchNext,
        match,
        set,
      };

      await routeMapService.createRouteMap(name.trim(), description.trim() || null, rule);

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create route-map");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Route Map</DialogTitle>
          <DialogDescription>
            Create a new route-map policy with match conditions and set actions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="match">Match Conditions</TabsTrigger>
            <TabsTrigger value="set">Set Actions</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4">
            <Fieldset label="Route Map">
              <FormField label="Route-Map Name" htmlFor="name" required>
                <Input
                  id="name"
                  placeholder="e.g., MY-ROUTE-MAP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>

              <FormField label="Description" htmlFor="description">
                <Textarea
                  id="description"
                  placeholder="Optional description for this route-map"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </FormField>
            </Fieldset>

            <FieldsetDivider />

            <Fieldset label="Initial Rule">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Rule Number"
                  htmlFor="ruleNumber"
                  description="First rule will start at 100"
                  required
                >
                  <Input
                    id="ruleNumber"
                    type="number"
                    value={ruleNumber}
                    disabled
                    className="bg-muted"
                  />
                </FormField>

                <FormField
                  label="Action"
                  htmlFor="action"
                  description="Permit allows matching routes, Deny blocks them"
                  required
                >
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger id="action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permit">Permit</SelectItem>
                      <SelectItem value="deny">Deny</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <FormField label="Rule Description" htmlFor="ruleDescription">
                <Input
                  id="ruleDescription"
                  placeholder="Optional description for this rule"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                />
              </FormField>
            </Fieldset>
          </TabsContent>

          {/* Match Conditions Tab */}
          <TabsContent value="match" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define conditions that routes must match. All specified conditions must match (AND logic).
            </p>

            <Accordion type="multiple" className="w-full">
              {/* BGP Attributes */}
              <AccordionItem value="bgp">
                <AccordionTrigger>BGP Attributes</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="AS Path List" htmlFor="matchAsPath">
                      <Input
                        id="matchAsPath"
                        placeholder="AS path list name"
                        value={matchAsPath}
                        onChange={(e) => setMatchAsPath(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Origin" htmlFor="matchOrigin">
                      <Select value={matchOrigin} onValueChange={setMatchOrigin}>
                        <SelectTrigger id="matchOrigin">
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          <SelectItem value="egp">EGP</SelectItem>
                          <SelectItem value="igp">IGP</SelectItem>
                          <SelectItem value="incomplete">Incomplete</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    <div className="space-y-2">
                      <FormField label="Community List" htmlFor="matchCommunityList">
                        <Input
                          id="matchCommunityList"
                          placeholder="Community list name"
                          value={matchCommunityList}
                          onChange={(e) => setMatchCommunityList(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Exact match" htmlFor="matchCommunityExact" horizontal>
                        <Checkbox
                          id="matchCommunityExact"
                          checked={matchCommunityExact}
                          onCheckedChange={(checked) => setMatchCommunityExact(checked as boolean)}
                        />
                      </FormField>
                    </div>

                    <FormField label="Extended Community" htmlFor="matchExtcommunity">
                      <Input
                        id="matchExtcommunity"
                        placeholder="Extcommunity list name"
                        value={matchExtcommunity}
                        onChange={(e) => setMatchExtcommunity(e.target.value)}
                      />
                    </FormField>

                    <div className="space-y-2">
                      <FormField label="Large Community List" htmlFor="matchLargeCommunityList">
                        <Input
                          id="matchLargeCommunityList"
                          placeholder="Large community list name"
                          value={matchLargeCommunityList}
                          onChange={(e) => setMatchLargeCommunityList(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Exact match" htmlFor="matchLargeCommunityExact" horizontal>
                        <Checkbox
                          id="matchLargeCommunityExact"
                          checked={matchLargeCommunityExact}
                          onCheckedChange={(checked) => setMatchLargeCommunityExact(checked as boolean)}
                        />
                      </FormField>
                    </div>

                    <FormField label="Local Preference" htmlFor="matchLocalPref">
                      <Input
                        id="matchLocalPref"
                        type="number"
                        placeholder="0-4294967295"
                        value={matchLocalPref}
                        onChange={(e) => setMatchLocalPref(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Metric (MED)" htmlFor="matchMetric">
                      <Input
                        id="matchMetric"
                        type="number"
                        placeholder="0-4294967295"
                        value={matchMetric}
                        onChange={(e) => setMatchMetric(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Peer Address" htmlFor="matchPeer">
                      <Input
                        id="matchPeer"
                        placeholder="e.g., 192.168.1.1"
                        value={matchPeer}
                        onChange={(e) => setMatchPeer(e.target.value)}
                      />
                    </FormField>

                    <FormField label="RPKI Validation" htmlFor="matchRpki">
                      <Select value={matchRpki} onValueChange={setMatchRpki}>
                        <SelectTrigger id="matchRpki">
                          <SelectValue placeholder="Select RPKI state" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          <SelectItem value="valid">Valid</SelectItem>
                          <SelectItem value="invalid">Invalid</SelectItem>
                          <SelectItem value="notfound">Not Found</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* IP/IPv6 Address */}
              <AccordionItem value="address">
                <AccordionTrigger>IP/IPv6 Address Matching</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">IPv4 Address</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Access List" htmlFor="matchIpAddressAccessList">
                        <Input
                          id="matchIpAddressAccessList"
                          placeholder="Access list number/name"
                          value={matchIpAddressAccessList}
                          onChange={(e) => setMatchIpAddressAccessList(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Prefix List" htmlFor="matchIpAddressPrefixList">
                        <Input
                          id="matchIpAddressPrefixList"
                          placeholder="Prefix list name"
                          value={matchIpAddressPrefixList}
                          onChange={(e) => setMatchIpAddressPrefixList(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Prefix Length" htmlFor="matchIpAddressPrefixLen">
                        <Input
                          id="matchIpAddressPrefixLen"
                          type="number"
                          placeholder="0-32"
                          value={matchIpAddressPrefixLen}
                          onChange={(e) => setMatchIpAddressPrefixLen(e.target.value)}
                        />
                      </FormField>
                    </div>

                    <h4 className="font-medium text-sm pt-4">IPv6 Address</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Access List" htmlFor="matchIpv6AddressAccessList">
                        <Input
                          id="matchIpv6AddressAccessList"
                          placeholder="Access list number/name"
                          value={matchIpv6AddressAccessList}
                          onChange={(e) => setMatchIpv6AddressAccessList(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Prefix List" htmlFor="matchIpv6AddressPrefixList">
                        <Input
                          id="matchIpv6AddressPrefixList"
                          placeholder="Prefix list name"
                          value={matchIpv6AddressPrefixList}
                          onChange={(e) => setMatchIpv6AddressPrefixList(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Prefix Length" htmlFor="matchIpv6AddressPrefixLen">
                        <Input
                          id="matchIpv6AddressPrefixLen"
                          type="number"
                          placeholder="0-128"
                          value={matchIpv6AddressPrefixLen}
                          onChange={(e) => setMatchIpv6AddressPrefixLen(e.target.value)}
                        />
                      </FormField>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Next-Hop */}
              <AccordionItem value="nexthop">
                <AccordionTrigger>Next-Hop Matching</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">IPv4 Next-Hop</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Access List" htmlFor="matchIpNexthopAccessList">
                        <Input
                          id="matchIpNexthopAccessList"
                          placeholder="Access list number/name"
                          value={matchIpNexthopAccessList}
                          onChange={(e) => setMatchIpNexthopAccessList(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Address" htmlFor="matchIpNexthopAddress">
                        <Input
                          id="matchIpNexthopAddress"
                          placeholder="e.g., 192.168.1.1"
                          value={matchIpNexthopAddress}
                          onChange={(e) => setMatchIpNexthopAddress(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Prefix List" htmlFor="matchIpNexthopPrefixList">
                        <Input
                          id="matchIpNexthopPrefixList"
                          placeholder="Prefix list name"
                          value={matchIpNexthopPrefixList}
                          onChange={(e) => setMatchIpNexthopPrefixList(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Prefix Length" htmlFor="matchIpNexthopPrefixLen">
                        <Input
                          id="matchIpNexthopPrefixLen"
                          type="number"
                          placeholder="0-32"
                          value={matchIpNexthopPrefixLen}
                          onChange={(e) => setMatchIpNexthopPrefixLen(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Type" htmlFor="matchIpNexthopType">
                        <Input
                          id="matchIpNexthopType"
                          placeholder="e.g., blackhole"
                          value={matchIpNexthopType}
                          onChange={(e) => setMatchIpNexthopType(e.target.value)}
                        />
                      </FormField>
                    </div>

                    <h4 className="font-medium text-sm pt-4">IPv6 Next-Hop</h4>
                    <FormField label="Address" htmlFor="matchIpv6NexthopAddress">
                      <Input
                        id="matchIpv6NexthopAddress"
                        placeholder="e.g., 2001:db8::1"
                        value={matchIpv6NexthopAddress}
                        onChange={(e) => setMatchIpv6NexthopAddress(e.target.value)}
                      />
                    </FormField>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Other Conditions */}
              <AccordionItem value="other">
                <AccordionTrigger>Other Conditions</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Route Source Access List" htmlFor="matchIpRouteSourceAccessList">
                      <Input
                        id="matchIpRouteSourceAccessList"
                        placeholder="Access list number/name"
                        value={matchIpRouteSourceAccessList}
                        onChange={(e) => setMatchIpRouteSourceAccessList(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Route Source Prefix List" htmlFor="matchIpRouteSourcePrefixList">
                      <Input
                        id="matchIpRouteSourcePrefixList"
                        placeholder="Prefix list name"
                        value={matchIpRouteSourcePrefixList}
                        onChange={(e) => setMatchIpRouteSourcePrefixList(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Interface" htmlFor="matchInterface">
                      <Input
                        id="matchInterface"
                        placeholder="e.g., eth0"
                        value={matchInterface}
                        onChange={(e) => setMatchInterface(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Protocol" htmlFor="matchProtocol">
                      <Select value={matchProtocol} onValueChange={setMatchProtocol}>
                        <SelectTrigger id="matchProtocol">
                          <SelectValue placeholder="Select protocol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          <SelectItem value="babel">Babel</SelectItem>
                          <SelectItem value="bgp">BGP</SelectItem>
                          <SelectItem value="connected">Connected</SelectItem>
                          <SelectItem value="isis">IS-IS</SelectItem>
                          <SelectItem value="kernel">Kernel</SelectItem>
                          <SelectItem value="ospf">OSPF</SelectItem>
                          <SelectItem value="ospfv3">OSPFv3</SelectItem>
                          <SelectItem value="rip">RIP</SelectItem>
                          <SelectItem value="ripng">RIPng</SelectItem>
                          <SelectItem value="static">Static</SelectItem>
                          <SelectItem value="table">Table</SelectItem>
                          <SelectItem value="vnc">VNC</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Source VRF" htmlFor="matchSourceVrf">
                      <Input
                        id="matchSourceVrf"
                        placeholder="VRF name"
                        value={matchSourceVrf}
                        onChange={(e) => setMatchSourceVrf(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Tag" htmlFor="matchTag">
                      <Input
                        id="matchTag"
                        type="number"
                        placeholder="1-4294967295"
                        value={matchTag}
                        onChange={(e) => setMatchTag(e.target.value)}
                      />
                    </FormField>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Set Actions Tab */}
          <TabsContent value="set" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define actions to apply to matching routes. Multiple actions can be combined.
            </p>

            <Accordion type="multiple" className="w-full">
              {/* BGP AS Path */}
              <AccordionItem value="aspath">
                <AccordionTrigger>BGP AS Path</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Exclude AS" htmlFor="setAsPathExclude">
                      <Input
                        id="setAsPathExclude"
                        placeholder="AS numbers to exclude"
                        value={setAsPathExclude}
                        onChange={(e) => setSetAsPathExclude(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Prepend AS" htmlFor="setAsPathPrepend">
                      <Input
                        id="setAsPathPrepend"
                        placeholder="AS numbers to prepend"
                        value={setAsPathPrepend}
                        onChange={(e) => setSetAsPathPrepend(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Prepend Last AS (count)" htmlFor="setAsPathPrependLastAs">
                      <Input
                        id="setAsPathPrependLastAs"
                        type="number"
                        placeholder="Number of times"
                        value={setAsPathPrependLastAs}
                        onChange={(e) => setSetAsPathPrependLastAs(e.target.value)}
                      />
                    </FormField>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BGP Communities */}
              <AccordionItem value="communities">
                <AccordionTrigger>BGP Communities</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Standard Community</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Community Value" htmlFor="setCommunityValue">
                        <Input
                          id="setCommunityValue"
                          placeholder="e.g., 65000:100 or local-as"
                          value={setCommunityValue}
                          onChange={(e) => setSetCommunityValue(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Action" htmlFor="setCommunityAction">
                        <Select value={setCommunityAction} onValueChange={setSetCommunityAction}>
                          <SelectTrigger id="setCommunityAction">
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            <SelectItem value="add">Add</SelectItem>
                            <SelectItem value="replace">Replace</SelectItem>
                            <SelectItem value="delete">Delete</SelectItem>
                            <SelectItem value="none">Remove All</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>

                    <h4 className="font-medium text-sm pt-4">Large Community</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Large Community Value" htmlFor="setLargeCommunityValue">
                        <Input
                          id="setLargeCommunityValue"
                          placeholder="e.g., 65000:1:100"
                          value={setLargeCommunityValue}
                          onChange={(e) => setSetLargeCommunityValue(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Action" htmlFor="setLargeCommunityAction">
                        <Select value={setLargeCommunityAction} onValueChange={setSetLargeCommunityAction}>
                          <SelectTrigger id="setLargeCommunityAction">
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            <SelectItem value="add">Add</SelectItem>
                            <SelectItem value="replace">Replace</SelectItem>
                            <SelectItem value="delete">Delete</SelectItem>
                            <SelectItem value="none">Remove All</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>

                    <h4 className="font-medium text-sm pt-4">Extended Community</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Bandwidth" htmlFor="setExtcommunityBandwidth">
                        <Input
                          id="setExtcommunityBandwidth"
                          placeholder="Bandwidth value"
                          value={setExtcommunityBandwidth}
                          onChange={(e) => setSetExtcommunityBandwidth(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Route Target (RT)" htmlFor="setExtcommunityRt">
                        <Input
                          id="setExtcommunityRt"
                          placeholder="e.g., 65000:100"
                          value={setExtcommunityRt}
                          onChange={(e) => setSetExtcommunityRt(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Site of Origin (SOO)" htmlFor="setExtcommunitySoo">
                        <Input
                          id="setExtcommunitySoo"
                          placeholder="e.g., 65000:1"
                          value={setExtcommunitySoo}
                          onChange={(e) => setSetExtcommunitySoo(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Remove all extcommunities" htmlFor="setExtcommunityNone" horizontal>
                        <Checkbox
                          id="setExtcommunityNone"
                          checked={setExtcommunityNone}
                          onCheckedChange={(checked) => setSetExtcommunityNone(checked as boolean)}
                        />
                      </FormField>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BGP Attributes */}
              <AccordionItem value="bgp-attrs">
                <AccordionTrigger>BGP Attributes</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Atomic Aggregate" htmlFor="setAtomicAggregate" horizontal>
                      <Checkbox
                        id="setAtomicAggregate"
                        checked={setAtomicAggregate}
                        onCheckedChange={(checked) => setSetAtomicAggregate(checked as boolean)}
                      />
                    </FormField>
                    <FormField label="Local Preference" htmlFor="setLocalPref">
                      <Input
                        id="setLocalPref"
                        type="number"
                        placeholder="0-4294967295"
                        value={setLocalPref}
                        onChange={(e) => setSetLocalPref(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Aggregator AS" htmlFor="setAggregatorAs">
                      <Input
                        id="setAggregatorAs"
                        placeholder="AS number"
                        value={setAggregatorAs}
                        onChange={(e) => setSetAggregatorAs(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Aggregator IP" htmlFor="setAggregatorIp">
                      <Input
                        id="setAggregatorIp"
                        placeholder="e.g., 192.168.1.1"
                        value={setAggregatorIp}
                        onChange={(e) => setSetAggregatorIp(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Origin" htmlFor="setOrigin">
                      <Select value={setOrigin} onValueChange={setSetOrigin}>
                        <SelectTrigger id="setOrigin">
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          <SelectItem value="egp">EGP</SelectItem>
                          <SelectItem value="igp">IGP</SelectItem>
                          <SelectItem value="incomplete">Incomplete</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Originator ID" htmlFor="setOriginatorId">
                      <Input
                        id="setOriginatorId"
                        placeholder="e.g., 192.168.1.1"
                        value={setOriginatorId}
                        onChange={(e) => setSetOriginatorId(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Weight" htmlFor="setWeight">
                      <Input
                        id="setWeight"
                        type="number"
                        placeholder="0-65535"
                        value={setWeight}
                        onChange={(e) => setSetWeight(e.target.value)}
                      />
                    </FormField>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Next-Hop */}
              <AccordionItem value="nexthop-set">
                <AccordionTrigger>Next-Hop</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">IPv4 Next-Hop</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        label="Address"
                        htmlFor="setIpNexthop"
                        description="Only one option can be selected at a time"
                      >
                        <Input
                          id="setIpNexthop"
                          placeholder="e.g., 192.168.1.1"
                          value={setIpNexthop}
                          onChange={(e) => setSetIpNexthop(e.target.value)}
                          disabled={setIpNexthopPeerAddress || setIpNexthopUnchanged}
                          className={setIpNexthopPeerAddress || setIpNexthopUnchanged ? "bg-muted" : ""}
                        />
                      </FormField>
                      <div className="flex flex-col gap-2">
                        <FormField label="Use peer address" htmlFor="setIpNexthopPeerAddress" horizontal>
                          <Checkbox
                            id="setIpNexthopPeerAddress"
                            checked={setIpNexthopPeerAddress}
                            onCheckedChange={(checked) => {
                              setSetIpNexthopPeerAddress(checked as boolean);
                              if (checked) {
                                setSetIpNexthopUnchanged(false);
                                setSetIpNexthop("");
                              }
                            }}
                          />
                        </FormField>
                        <FormField label="Keep unchanged" htmlFor="setIpNexthopUnchanged" horizontal>
                          <Checkbox
                            id="setIpNexthopUnchanged"
                            checked={setIpNexthopUnchanged}
                            onCheckedChange={(checked) => {
                              setSetIpNexthopUnchanged(checked as boolean);
                              if (checked) {
                                setSetIpNexthopPeerAddress(false);
                                setSetIpNexthop("");
                              }
                            }}
                          />
                        </FormField>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">IPv6 Next-Hop</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Global Address" htmlFor="setIpv6NexthopGlobal">
                        <Input
                          id="setIpv6NexthopGlobal"
                          placeholder="e.g., 2001:db8::1"
                          value={setIpv6NexthopGlobal}
                          onChange={(e) => setSetIpv6NexthopGlobal(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Link-Local Address" htmlFor="setIpv6NexthopLocal">
                        <Input
                          id="setIpv6NexthopLocal"
                          placeholder="e.g., fe80::1"
                          value={setIpv6NexthopLocal}
                          onChange={(e) => setSetIpv6NexthopLocal(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Use peer address" htmlFor="setIpv6NexthopPeerAddress" horizontal>
                        <Checkbox
                          id="setIpv6NexthopPeerAddress"
                          checked={setIpv6NexthopPeerAddress}
                          onCheckedChange={(checked) => setSetIpv6NexthopPeerAddress(checked as boolean)}
                        />
                      </FormField>
                      <FormField label="Prefer global" htmlFor="setIpv6NexthopPreferGlobal" horizontal>
                        <Checkbox
                          id="setIpv6NexthopPreferGlobal"
                          checked={setIpv6NexthopPreferGlobal}
                          onCheckedChange={(checked) => setSetIpv6NexthopPreferGlobal(checked as boolean)}
                        />
                      </FormField>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Route Properties */}
              <AccordionItem value="route-props">
                <AccordionTrigger>Route Properties</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Administrative Distance" htmlFor="setDistance">
                      <Input
                        id="setDistance"
                        type="number"
                        placeholder="1-255"
                        value={setDistance}
                        onChange={(e) => setSetDistance(e.target.value)}
                      />
                    </FormField>
                    <FormField
                      label="Metric"
                      htmlFor="setMetric"
                      description="Use +N or -N for relative changes"
                    >
                      <Input
                        id="setMetric"
                        placeholder="Value or +/-N"
                        value={setMetric}
                        onChange={(e) => setSetMetric(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Metric Type (OSPF)" htmlFor="setMetricType">
                      <Select value={setMetricType} onValueChange={setSetMetricType}>
                        <SelectTrigger id="setMetricType">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          <SelectItem value="type-1">Type 1</SelectItem>
                          <SelectItem value="type-2">Type 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Source Address" htmlFor="setSrc">
                      <Input
                        id="setSrc"
                        placeholder="e.g., 192.168.1.1"
                        value={setSrc}
                        onChange={(e) => setSetSrc(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Routing Table" htmlFor="setTable">
                      <Input
                        id="setTable"
                        type="number"
                        placeholder="Table number"
                        value={setTable}
                        onChange={(e) => setSetTable(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Tag" htmlFor="setTag">
                      <Input
                        id="setTag"
                        type="number"
                        placeholder="1-4294967295"
                        value={setTag}
                        onChange={(e) => setSetTag(e.target.value)}
                      />
                    </FormField>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Advanced rule flow control options for calling other route-maps or jumping to different rules.
            </p>

            <Fieldset>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Call Route-Map"
                  htmlFor="call"
                  description="Jump to another route-map on match"
                >
                  <Input
                    id="call"
                    placeholder="Route-map name to call"
                    value={call}
                    onChange={(e) => setCall(e.target.value)}
                  />
                </FormField>

                <FormField
                  label="Continue to Rule"
                  htmlFor="continueRule"
                  description="Continue processing at specified rule"
                >
                  <Input
                    id="continueRule"
                    type="number"
                    placeholder="Rule number"
                    value={continueRule}
                    onChange={(e) => setContinueRule(e.target.value)}
                  />
                </FormField>

                <FormField
                  label="On-Match Goto"
                  htmlFor="onMatchGoto"
                  description="Jump to rule number on match"
                >
                  <Input
                    id="onMatchGoto"
                    type="number"
                    placeholder="Rule number"
                    value={onMatchGoto}
                    onChange={(e) => setOnMatchGoto(e.target.value)}
                  />
                </FormField>

                <FormField label="On-Match Next (go to next sequence number)" htmlFor="onMatchNext" horizontal>
                  <Checkbox
                    id="onMatchNext"
                    checked={onMatchNext}
                    onCheckedChange={(checked) => setOnMatchNext(checked as boolean)}
                  />
                </FormField>
              </div>
            </Fieldset>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Route Map"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
