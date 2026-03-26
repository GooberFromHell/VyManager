"""
VyOS Batch Builders

Self-contained batch builders for different features.
Each builder includes all necessary operations for its feature type.
"""

from .interfaces import EthernetInterfaceBuilderMixin, DummyInterfaceBuilderMixin, TunnelInterfaceBuilderMixin, VxlanInterfaceBuilderMixin
from .firewall import FirewallGroupsBatchBuilder, FirewallIPv4BatchBuilder, FirewallIPv6BatchBuilder, BridgeFirewallBatchBuilder, FirewallZonesBatchBuilder
from .nat import NATBatchBuilder
from .nat64 import NAT64BatchBuilder
from .nat66 import NAT66BatchBuilder
from .dhcp import DHCPBatchBuilder
from .static_routes import StaticRoutesBatchBuilder
from .route_map import RouteMapBatchBuilder
from .access_list import AccessListBatchBuilder
from .prefix_list import PrefixListBatchBuilder
from .local_route import LocalRouteBatchBuilder
from .route import RouteBatchBuilder
from .as_path_list import AsPathListBatchBuilder
from .community_list import CommunityListBatchBuilder
from .extcommunity_list import ExtCommunityListBatchBuilder
from .large_community_list import LargeCommunityListBatchBuilder
from .firewall_global_options import FirewallGlobalOptionsBatchBuilder
from .wireguard import WireGuardBatchBuilder
from .babel import BabelBatchBuilder
from .bfd import BfdBatchBuilder
from .bgp import BgpBatchBuilder
from .failover import FailoverBatchBuilder
from .ospf import OspfBatchBuilder
from .ospfv3 import Ospfv3BatchBuilder
from .vrf import VrfBatchBuilder
from .system import SystemPerformanceBatchBuilder, SystemBatchBuilder
from .high_availability import HighAvailabilityBatchBuilder
from .load_balancing import LoadBalancingBatchBuilder
from .isis import IsisBatchBuilder
from .ntp import NTPBatchBuilder
from .dns_forwarding import DNSForwardingBatchBuilder
from .ssh import SSHBatchBuilder
from .dhcp_relay import DHCPRelayBatchBuilder
from .lldp import LLDPBatchBuilder
from .dhcpv6_server import DHCPv6ServerBatchBuilder
from .snmp import SNMPBatchBuilder
from .tftp_server import TFTPServerBatchBuilder
from .broadcast_relay import BroadcastRelayBatchBuilder
from .router_advert import RouterAdvertBatchBuilder
from .conntrack_sync import ConntrackSyncBatchBuilder
from .container import ContainerBatchBuilder
from .ipsec import IPSecBatchBuilder
from .pki import PKIBatchBuilder

# Directly use the self-contained builders
EthernetBatchBuilder = EthernetInterfaceBuilderMixin
DummyBatchBuilder = DummyInterfaceBuilderMixin
TunnelBatchBuilder = TunnelInterfaceBuilderMixin
VxlanBatchBuilder = VxlanInterfaceBuilderMixin

__all__ = [
    "EthernetBatchBuilder",
    "DummyBatchBuilder",
    "TunnelBatchBuilder",
    "VxlanBatchBuilder",
    "FirewallGroupsBatchBuilder",
    "FirewallIPv4BatchBuilder",
    "FirewallIPv6BatchBuilder",
    "NATBatchBuilder",
    "NAT64BatchBuilder",
    "NAT66BatchBuilder",
    "DHCPBatchBuilder",
    "StaticRoutesBatchBuilder",
    "RouteMapBatchBuilder",
    "AccessListBatchBuilder",
    "PrefixListBatchBuilder",
    "LocalRouteBatchBuilder",
    "RouteBatchBuilder",
    "AsPathListBatchBuilder",
    "CommunityListBatchBuilder",
    "ExtCommunityListBatchBuilder",
    "LargeCommunityListBatchBuilder",
    "FirewallGlobalOptionsBatchBuilder",
    "WireGuardBatchBuilder",
    "BridgeFirewallBatchBuilder",
    "FirewallZonesBatchBuilder",
    "BabelBatchBuilder",
    "BfdBatchBuilder",
    "BgpBatchBuilder",
    "FailoverBatchBuilder",
    "OspfBatchBuilder",
    "Ospfv3BatchBuilder",
    "VrfBatchBuilder",
    "SystemPerformanceBatchBuilder",
    "SystemBatchBuilder",
    "HighAvailabilityBatchBuilder",
    "LoadBalancingBatchBuilder",
    "IsisBatchBuilder",
    "NTPBatchBuilder",
    "DNSForwardingBatchBuilder",
    "SSHBatchBuilder",
    "DHCPRelayBatchBuilder",
    "LLDPBatchBuilder",
    "DHCPv6ServerBatchBuilder",
    "SNMPBatchBuilder",
    "TFTPServerBatchBuilder",
    "BroadcastRelayBatchBuilder",
    "RouterAdvertBatchBuilder",
    "ConntrackSyncBatchBuilder",
    "ContainerBatchBuilder",
    "IPSecBatchBuilder",
    "PKIBatchBuilder",
]
