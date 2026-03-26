"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { natService } from "@/lib/api/nat";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import { configService } from "@/lib/api/config";
import type { FirewallGroup } from "@/lib/api/types/firewall-groups";

interface SimpleInterface {
  name: string;
  type: string;
}

interface CreateDestinationNATModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateDestinationNATModal({ open, onOpenChange, onSuccess }: CreateDestinationNATModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data
  const [groups, setGroups] = useState<FirewallGroup[]>([]);
  const [interfaces, setInterfaces] = useState<SimpleInterface[]>([]);

  // Auto-calculated rule number
  const [ruleNumber, setRuleNumber] = useState<number>(10);

  // Form fields
  const [description, setDescription] = useState("");

  // Source
  const [sourceType, setSourceType] = useState<"address" | "group">("address");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceGroupType, setSourceGroupType] = useState("");
  const [sourceGroupName, setSourceGroupName] = useState("");
  const [sourcePort, setSourcePort] = useState("");

  // Destination
  const [destinationType, setDestinationType] = useState<"address" | "group">("address");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationGroupType, setDestinationGroupType] = useState("");
  const [destinationGroupName, setDestinationGroupName] = useState("");
  const [destinationPort, setDestinationPort] = useState("");
  const [sourcePortType, setSourcePortType] = useState<"input" | "group">("input");
  const [sourcePortGroupName, setSourcePortGroupName] = useState("");
  const [destPortType, setDestPortType] = useState<"input" | "group">("input");
  const [destPortGroupName, setDestPortGroupName] = useState("");

  // Inbound interface
  const [inboundInterfaceType, setInboundInterfaceType] = useState<"name" | "group">("name");
  const [inboundInterfaceName, setInboundInterfaceName] = useState("");
  const [inboundInterfaceGroup, setInboundInterfaceGroup] = useState("");
  const [inboundInterfaceInvert, setInboundInterfaceInvert] = useState(false);

  // Protocol & Packet Type
  const [protocol, setProtocol] = useState("all");
  const [packetType, setPacketType] = useState("");

  // Translation
  const [translationAddress, setTranslationAddress] = useState("");
  const [translationPort, setTranslationPort] = useState("");

  // Load Balance
  const [loadBalancingEnabled, setLoadBalancingEnabled] = useState(false);
  const [loadBalanceHash, setLoadBalanceHash] = useState("");
  const [loadBalanceBackend, setLoadBalanceBackend] = useState("");

  // Flags
  const [disable, setDisable] = useState(false);
  const [exclude, setExclude] = useState(false);
  const [log, setLog] = useState(false);

  // Load groups, interfaces, and calculate next rule number on mount
  useEffect(() => {
    if (open) {
      // Reset form to ensure clean state when opening
      resetForm();
      loadGroups();
      loadInterfaces();
      calculateNextRuleNumber();
    }
  }, [open]);

  // Auto-adjust protocol when ports are used
  useEffect(() => {
    const hasPort = sourcePort.trim() || destinationPort.trim() || translationPort.trim() || sourcePortGroupName || destPortGroupName;
    const portCompatibleProtocols = ["tcp", "udp", "tcp_udp"];

    if (hasPort && !portCompatibleProtocols.includes(protocol)) {
      // Switch to tcp_udp when port is entered and current protocol is incompatible
      setProtocol("tcp_udp");
    } else if (!hasPort && portCompatibleProtocols.includes(protocol) && protocol !== "all") {
      // Switch back to "all" when ports are cleared
      setProtocol("all");
    }
  }, [sourcePort, destinationPort, translationPort, sourcePortGroupName, destPortGroupName, protocol]);

  const loadGroups = async () => {
    try {
      const config = await firewallGroupsService.getConfig();
      // Aggregate all groups from different categories
      const allGroups = [
        ...config.address_groups,
        ...config.ipv6_address_groups,
        ...config.network_groups,
        ...config.ipv6_network_groups,
        ...config.port_groups,
        ...config.interface_groups,
        ...config.mac_groups,
        ...config.domain_groups,
        ...config.remote_groups,
      ];
      setGroups(allGroups);
    } catch (err) {
      console.error("Failed to load firewall groups:", err);
    }
  };

  const loadInterfaces = async () => {
    try {
      const snapshot = await configService.getSnapshot();
      const interfacesConfig = snapshot.config?.interfaces || {};
      const allInterfaces: SimpleInterface[] = [];

      // Parse all interface types from the config
      const interfaceTypes = [
        "ethernet",
        "wireguard",
        "vti",
        "tunnel",
        "dummy",
        "loopback",
        "bridge",
        "bonding",
        "pppoe",
        "wwan",
        "macsec",
        "openvpn",
        "vxlan",
        "geneve",
        "l2tpv3",
        "sstpc",
        "virtual-ethernet",
      ];

      for (const ifaceType of interfaceTypes) {
        const typeInterfaces = interfacesConfig[ifaceType];
        if (typeInterfaces && typeof typeInterfaces === "object") {
          for (const ifaceName of Object.keys(typeInterfaces)) {
            allInterfaces.push({ name: ifaceName, type: ifaceType });

            // Check for VLANs (vif) under ethernet/bonding/bridge interfaces
            const ifaceConfig = typeInterfaces[ifaceName];
            if (ifaceConfig?.vif && typeof ifaceConfig.vif === "object") {
              for (const vlanId of Object.keys(ifaceConfig.vif)) {
                allInterfaces.push({
                  name: `${ifaceName}.${vlanId}`,
                  type: "vlan",
                });
              }
            }
          }
        }
      }

      // Sort interfaces by name
      allInterfaces.sort((a, b) => a.name.localeCompare(b.name));
      setInterfaces(allInterfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const calculateNextRuleNumber = async () => {
    try {
      const config = await natService.getConfig();

      // Find the maximum rule number for DESTINATION NAT rules only
      const destinationRuleNumbers = config.destination_rules.map(r => r.rule_number);

      if (destinationRuleNumbers.length === 0) {
        setRuleNumber(100); // Start at 100 if no destination rules exist
      } else {
        const maxRuleNumber = Math.max(...destinationRuleNumbers);
        setRuleNumber(maxRuleNumber + 1);
      }
    } catch (err) {
      console.error("Failed to calculate next rule number:", err);
      setRuleNumber(100); // Default to 100 on error
    }
  };

  const resetForm = () => {
    // Don't reset ruleNumber - it's auto-calculated
    setDescription("");
    setSourceType("address");
    setSourceAddress("");
    setSourceGroupType("");
    setSourceGroupName("");
    setSourcePort("");
    setDestinationType("address");
    setDestinationAddress("");
    setDestinationGroupType("");
    setDestinationGroupName("");
    setDestinationPort("");
    setSourcePortType("input");
    setSourcePortGroupName("");
    setDestPortType("input");
    setDestPortGroupName("");
    setInboundInterfaceType("name");
    setInboundInterfaceName("");
    setInboundInterfaceGroup("");
    setInboundInterfaceInvert(false);
    setProtocol("all");
    setPacketType("");
    setTranslationAddress("");
    setTranslationPort("");
    setLoadBalanceHash("");
    setLoadBalanceBackend("");
    setDisable(false);
    setExclude(false);
    setLog(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const config: any = {};

      if (description.trim()) {
        config.description = description.trim();
      }

      // Source
      if (sourceType === "address" && sourceAddress.trim()) {
        config.source_address = sourceAddress.trim();
      } else if (sourceType === "group" && sourceGroupType && sourceGroupName) {
        config.source_group_type = sourceGroupType;
        config.source_group_name = sourceGroupName;
      }
      if (sourcePortType === "input" && sourcePort.trim()) {
        config.source_port = sourcePort.trim();
      } else if (sourcePortType === "group" && sourcePortGroupName) {
        config.source_port_group_name = sourcePortGroupName;
      }

      // Destination
      if (destinationType === "address" && destinationAddress.trim()) {
        config.destination_address = destinationAddress.trim();
      } else if (destinationType === "group" && destinationGroupType && destinationGroupName) {
        config.destination_group_type = destinationGroupType;
        config.destination_group_name = destinationGroupName;
      }
      if (destPortType === "input" && destinationPort.trim()) {
        config.destination_port = destinationPort.trim();
      } else if (destPortType === "group" && destPortGroupName) {
        config.destination_port_group_name = destPortGroupName;
      }

      // Inbound interface
      if (inboundInterfaceType === "name" && inboundInterfaceName) {
        config.inbound_interface_type = "name";
        config.inbound_interface_value = inboundInterfaceName;
        config.inbound_interface_invert = inboundInterfaceInvert;
      } else if (inboundInterfaceType === "group" && inboundInterfaceGroup) {
        config.inbound_interface_type = "group";
        config.inbound_interface_value = inboundInterfaceGroup;
        config.inbound_interface_invert = inboundInterfaceInvert;
      }

      // Protocol (don't send "all" - VyOS treats no protocol as all protocols)
      if (protocol && protocol !== "all") {
        config.protocol = protocol;
      }

      // Packet type
      if (packetType) {
        config.packet_type = packetType;
      }

      // Translation
      if (translationAddress.trim()) {
        config.translation_address = translationAddress.trim();
      }
      if (translationPort.trim()) {
        config.translation_port = translationPort.trim();
      }

      // Load balance
      if (loadBalancingEnabled) {
        if (loadBalanceHash) {
          config.load_balance_hash = loadBalanceHash;
        }
        if (loadBalanceBackend.trim()) {
          config.load_balance_backend = loadBalanceBackend.trim();
        }
      }

      // Flags
      config.disable = disable;
      config.exclude = exclude;
      config.log = log;

      // Use auto-calculated rule number
      await natService.createDestinationRule(ruleNumber, config);

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create destination NAT rule");
    } finally {
      setLoading(false);
    }
  };

  const getAddressGroups = () => (groups || []).filter(g => g.type === "address-group" || g.type === "ipv6-address-group");
  const getNetworkGroups = () => (groups || []).filter(g => g.type === "network-group" || g.type === "ipv6-network-group");
  const getDomainGroups = () => (groups || []).filter(g => g.type === "domain-group");
  const getInterfaceGroups = () => (groups || []).filter(g => g.type === "interface-group");
  const getPortGroups = () => (groups || []).filter(g => g.type === "port-group");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Destination NAT Rule</DialogTitle>
          <DialogDescription>
            Create a new destination NAT rule for inbound traffic translation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Rule Number (Auto-calculated) */}
          <div className="bg-muted/30 border border-muted rounded-lg p-4">
            <p className="text-sm font-medium mb-1">Rule Number (Auto-assigned)</p>
            <div className="text-2xl font-mono font-bold text-primary">
              {ruleNumber}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This rule will be automatically assigned number {ruleNumber}
            </p>
          </div>

          <Fieldset>
            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this rule"
                rows={2}
              />
            </FormField>
          </Fieldset>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="source">Source</TabsTrigger>
              <TabsTrigger value="destination">Destination</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              <Fieldset label="Inbound Interface">
                <FormField label="Interface Type">
                  <RadioGroup value={inboundInterfaceType} onValueChange={(v) => setInboundInterfaceType(v as "name" | "group")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="name" id="inbound-name" />
                      <label htmlFor="inbound-name" className="text-sm cursor-pointer">Interface Name</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="group" id="inbound-group" />
                      <label htmlFor="inbound-group" className="text-sm cursor-pointer">Interface Group</label>
                    </div>
                  </RadioGroup>
                </FormField>

                {inboundInterfaceType === "name" ? (
                  <FormField label="Inbound Interface Name" htmlFor="inbound-interface-name">
                    <Select value={inboundInterfaceName} onValueChange={setInboundInterfaceName}>
                      <SelectTrigger id="inbound-interface-name">
                        <SelectValue placeholder="Select interface" />
                      </SelectTrigger>
                      <SelectContent>
                        {interfaces.map((iface) => (
                          <SelectItem key={iface.name} value={iface.name}>
                            {iface.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                ) : (
                  <FormField label="Inbound Interface Group" htmlFor="inbound-interface-group">
                    <Select value={inboundInterfaceGroup} onValueChange={setInboundInterfaceGroup}>
                      <SelectTrigger id="inbound-interface-group">
                        <SelectValue placeholder="Select interface group" />
                      </SelectTrigger>
                      <SelectContent>
                        {getInterfaceGroups().map((group) => (
                          <SelectItem key={group.name} value={group.name}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}

                <FormField label="Invert Match" htmlFor="inbound-invert" horizontal>
                  <Checkbox
                    id="inbound-invert"
                    checked={inboundInterfaceInvert}
                    onCheckedChange={(checked) => setInboundInterfaceInvert(checked === true)}
                  />
                </FormField>
              </Fieldset>

              <FieldsetDivider />

              <Fieldset label="Translation">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Translation Address" htmlFor="translation-address">
                    <Input
                      id="translation-address"
                      value={translationAddress}
                      onChange={(e) => setTranslationAddress(e.target.value)}
                      placeholder="e.g., 192.168.1.10"
                      className="font-mono"
                    />
                  </FormField>
                  <FormField label="Translation Port" htmlFor="translation-port">
                    <Input
                      id="translation-port"
                      value={translationPort}
                      onChange={(e) => setTranslationPort(e.target.value)}
                      placeholder="e.g., 8080"
                      className="font-mono"
                    />
                  </FormField>
                </div>
              </Fieldset>

              <FieldsetDivider />

              <Fieldset>
                <FormField
                  label="Protocol"
                  htmlFor="protocol"
                  description={(sourcePort.trim() || destinationPort.trim() || translationPort.trim()) ? "Only TCP/UDP protocols are available when using ports" : undefined}
                >
                  <Select value={protocol} onValueChange={setProtocol}>
                    <SelectTrigger id="protocol">
                      <SelectValue />
                    </SelectTrigger>
                    {(sourcePort.trim() || destinationPort.trim() || translationPort.trim()) ? (
                      <SelectContent>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="udp">UDP</SelectItem>
                        <SelectItem value="tcp_udp">TCP & UDP</SelectItem>
                      </SelectContent>
                    ) : (
                      <SelectContent>
                        <SelectItem value="all">All (default)</SelectItem>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="udp">UDP</SelectItem>
                        <SelectItem value="tcp_udp">TCP & UDP</SelectItem>
                        <SelectItem value="icmp">ICMP</SelectItem>
                        <SelectItem value="ip">IP</SelectItem>
                        <SelectItem value="ipv6">IPv6</SelectItem>
                        <SelectItem value="hopopt">IPv6 Hop-by-Hop Option</SelectItem>
                        <SelectItem value="igmp">IGMP</SelectItem>
                        <SelectItem value="ggp">Gateway-Gateway Protocol</SelectItem>
                        <SelectItem value="ipencap">IP Encapsulated in IP</SelectItem>
                        <SelectItem value="st">ST Datagram Mode</SelectItem>
                        <SelectItem value="egp">Exterior Gateway Protocol</SelectItem>
                        <SelectItem value="igp">Interior Gateway Protocol</SelectItem>
                        <SelectItem value="pup">PARC Universal Packet</SelectItem>
                        <SelectItem value="hmp">Host Monitoring Protocol</SelectItem>
                        <SelectItem value="xns-idp">Xerox NS IDP</SelectItem>
                        <SelectItem value="rdp">Reliable Datagram Protocol</SelectItem>
                        <SelectItem value="iso-tp4">ISO Transport Protocol Class 4</SelectItem>
                        <SelectItem value="dccp">Datagram Congestion Control Protocol</SelectItem>
                        <SelectItem value="xtp">Xpress Transfer Protocol</SelectItem>
                        <SelectItem value="ddp">Datagram Delivery Protocol</SelectItem>
                        <SelectItem value="idpr-cmtp">IDPR Control Message Transport</SelectItem>
                        <SelectItem value="ipv6-route">IPv6 Routing Header</SelectItem>
                        <SelectItem value="ipv6-frag">IPv6 Fragment Header</SelectItem>
                        <SelectItem value="idrp">Inter-Domain Routing Protocol</SelectItem>
                        <SelectItem value="rsvp">Reservation Protocol</SelectItem>
                        <SelectItem value="gre">GRE</SelectItem>
                        <SelectItem value="esp">Encapsulating Security Payload</SelectItem>
                        <SelectItem value="ah">Authentication Header</SelectItem>
                        <SelectItem value="skip">SKIP</SelectItem>
                        <SelectItem value="ipv6-icmp">ICMPv6</SelectItem>
                        <SelectItem value="ipv6-nonxt">IPv6 No Next Header</SelectItem>
                        <SelectItem value="ipv6-opts">IPv6 Destination Options</SelectItem>
                        <SelectItem value="rspf">Radio Shortest Path First</SelectItem>
                        <SelectItem value="vmtp">Versatile Message Transport</SelectItem>
                        <SelectItem value="eigrp">EIGRP</SelectItem>
                        <SelectItem value="ospf">OSPF</SelectItem>
                        <SelectItem value="ax.25">AX.25 Frames</SelectItem>
                        <SelectItem value="ipip">IP-within-IP Encapsulation</SelectItem>
                        <SelectItem value="etherip">Ethernet-within-IP Encapsulation</SelectItem>
                        <SelectItem value="encap">IP Encapsulation</SelectItem>
                        <SelectItem value="pim">Protocol Independent Multicast</SelectItem>
                        <SelectItem value="ipcomp">IP Payload Compression</SelectItem>
                        <SelectItem value="vrrp">VRRP</SelectItem>
                        <SelectItem value="l2tp">L2TP</SelectItem>
                        <SelectItem value="isis">IS-IS over IPv4</SelectItem>
                        <SelectItem value="sctp">SCTP</SelectItem>
                        <SelectItem value="fc">Fibre Channel</SelectItem>
                        <SelectItem value="mobility-header">IPv6 Mobility Support</SelectItem>
                        <SelectItem value="udplite">UDP-Lite</SelectItem>
                        <SelectItem value="mpls-in-ip">MPLS-in-IP</SelectItem>
                        <SelectItem value="manet">MANET Protocols</SelectItem>
                        <SelectItem value="hip">Host Identity Protocol</SelectItem>
                        <SelectItem value="shim6">Shim6 Protocol</SelectItem>
                        <SelectItem value="wesp">Wrapped Encapsulating Security Payload</SelectItem>
                        <SelectItem value="rohc">Robust Header Compression</SelectItem>
                      </SelectContent>
                    )}
                  </Select>
                </FormField>
              </Fieldset>
            </TabsContent>

            {/* Source Tab */}
            <TabsContent value="source" className="space-y-4">
              <Fieldset label="Source">
                <FormField label="Source Type">
                  <RadioGroup value={sourceType} onValueChange={(v) => setSourceType(v as "address" | "group")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="address" id="source-address" />
                      <label htmlFor="source-address" className="text-sm cursor-pointer">Address/Network</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="group" id="source-group" />
                      <label htmlFor="source-group" className="text-sm cursor-pointer">Firewall Group</label>
                    </div>
                  </RadioGroup>
                </FormField>

                {sourceType === "address" ? (
                  <FormField label="Source Address" htmlFor="source-address-input">
                    <Input
                      id="source-address-input"
                      value={sourceAddress}
                      onChange={(e) => setSourceAddress(e.target.value)}
                      placeholder="e.g., 192.168.1.0/24 or 10.0.0.1"
                      className="font-mono"
                    />
                  </FormField>
                ) : (
                  <>
                    <FormField label="Source Group Type" htmlFor="source-group-type">
                      <Select value={sourceGroupType} onValueChange={setSourceGroupType}>
                        <SelectTrigger id="source-group-type">
                          <SelectValue placeholder="Select group type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="address-group">Address Group</SelectItem>
                          <SelectItem value="network-group">Network Group</SelectItem>
                          <SelectItem value="domain-group">Domain Group</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Source Group Name" htmlFor="source-group-name">
                      <Select value={sourceGroupName} onValueChange={setSourceGroupName}>
                        <SelectTrigger id="source-group-name">
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceGroupType === "address-group" && getAddressGroups().map((g) => (
                            <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                          ))}
                          {sourceGroupType === "network-group" && getNetworkGroups().map((g) => (
                            <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                          ))}
                          {sourceGroupType === "domain-group" && getDomainGroups().map((g) => (
                            <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </>
                )}

                <FormField label="Source Port" htmlFor="source-port">
                  <Input
                    id="source-port"
                    value={sourcePort}
                    onChange={(e) => setSourcePort(e.target.value)}
                    placeholder="e.g., 80, 443, 1024-65535"
                    className="font-mono"
                  />
                </FormField>
              </Fieldset>
            </TabsContent>

            {/* Destination Tab */}
            <TabsContent value="destination" className="space-y-4">
              <Fieldset label="Destination">
                <FormField label="Destination Type">
                  <RadioGroup value={destinationType} onValueChange={(v) => setDestinationType(v as "address" | "group")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="address" id="dest-address" />
                      <label htmlFor="dest-address" className="text-sm cursor-pointer">Address/Network</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="group" id="dest-group" />
                      <label htmlFor="dest-group" className="text-sm cursor-pointer">Firewall Group</label>
                    </div>
                  </RadioGroup>
                </FormField>

                {destinationType === "address" ? (
                  <FormField label="Destination Address" htmlFor="destination-address-input">
                    <Input
                      id="destination-address-input"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder="e.g., 203.0.113.10"
                      className="font-mono"
                    />
                  </FormField>
                ) : (
                  <>
                    <FormField label="Destination Group Type" htmlFor="destination-group-type">
                      <Select value={destinationGroupType} onValueChange={setDestinationGroupType}>
                        <SelectTrigger id="destination-group-type">
                          <SelectValue placeholder="Select group type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="address-group">Address Group</SelectItem>
                          <SelectItem value="network-group">Network Group</SelectItem>
                          <SelectItem value="domain-group">Domain Group</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Destination Group Name" htmlFor="destination-group-name">
                      <Select value={destinationGroupName} onValueChange={setDestinationGroupName}>
                        <SelectTrigger id="destination-group-name">
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          {destinationGroupType === "address-group" && getAddressGroups().map((g) => (
                            <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                          ))}
                          {destinationGroupType === "network-group" && getNetworkGroups().map((g) => (
                            <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                          ))}
                          {destinationGroupType === "domain-group" && getDomainGroups().map((g) => (
                            <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </>
                )}

                <FormField label="Destination Port" htmlFor="destination-port">
                  <Input
                    id="destination-port"
                    value={destinationPort}
                    onChange={(e) => setDestinationPort(e.target.value)}
                    placeholder="e.g., 80, 443, 8080"
                    className="font-mono"
                  />
                </FormField>
              </Fieldset>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <Fieldset>
                <FormField label="Packet Type" htmlFor="packet-type">
                  <Select value={packetType} onValueChange={setPacketType}>
                    <SelectTrigger id="packet-type">
                      <SelectValue placeholder="Select packet type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="broadcast">Broadcast</SelectItem>
                      <SelectItem value="host">Host</SelectItem>
                      <SelectItem value="multicast">Multicast</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </Fieldset>

              <FieldsetDivider />

              <Fieldset label="Load Balancing">
                <FormField
                  label="Enable Load Balancing"
                  htmlFor="enable-load-balancing"
                  description="Distribute connections across multiple backend servers using a hash algorithm"
                  horizontal
                >
                  <Checkbox
                    id="enable-load-balancing"
                    checked={loadBalancingEnabled}
                    onCheckedChange={(checked) => setLoadBalancingEnabled(checked === true)}
                  />
                </FormField>

                {loadBalancingEnabled && (
                  <>
                    <FormField
                      label="Hash Method"
                      htmlFor="load-balance-hash"
                      description="Algorithm used to distribute traffic across backend servers"
                      required
                    >
                      <Select value={loadBalanceHash} onValueChange={setLoadBalanceHash}>
                        <SelectTrigger id="load-balance-hash">
                          <SelectValue placeholder="Select hash algorithm" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="source-address">Source Address</SelectItem>
                          <SelectItem value="destination-address">Destination Address</SelectItem>
                          <SelectItem value="source-port">Source Port</SelectItem>
                          <SelectItem value="destination-port">Destination Port</SelectItem>
                          <SelectItem value="random">Random</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField
                      label="Backend Server IP"
                      htmlFor="load-balance-backend"
                      description="Internal IP address of the backend server to receive translated traffic"
                      required
                    >
                      <Input
                        id="load-balance-backend"
                        value={loadBalanceBackend}
                        onChange={(e) => setLoadBalanceBackend(e.target.value)}
                        placeholder="e.g., 192.168.1.20"
                        className="font-mono"
                      />
                    </FormField>
                  </>
                )}
              </Fieldset>

              <FieldsetDivider />

              <Fieldset label="Rule Flags">
                <FormField label="Disable" htmlFor="disable" horizontal>
                  <Checkbox
                    id="disable"
                    checked={disable}
                    onCheckedChange={(checked) => setDisable(checked === true)}
                  />
                </FormField>
                <FormField label="Exclude from NAT" htmlFor="exclude" horizontal>
                  <Checkbox
                    id="exclude"
                    checked={exclude}
                    onCheckedChange={(checked) => setExclude(checked === true)}
                  />
                </FormField>
                <FormField label="Enable Logging" htmlFor="log" horizontal>
                  <Checkbox
                    id="log"
                    checked={log}
                    onCheckedChange={(checked) => setLog(checked === true)}
                  />
                </FormField>
              </Fieldset>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
