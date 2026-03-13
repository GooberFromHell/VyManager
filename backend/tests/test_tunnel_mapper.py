import pytest
from vyos_mappers.interfaces.tunnel import TunnelInterfaceMapper


class TestTunnelMapperPaths:
    """Test CLI path generation for tunnel interfaces."""

    def setup_method(self):
        self.mapper = TunnelInterfaceMapper("1.5")

    # --- Common interface properties ---
    def test_description(self):
        assert self.mapper.get_description("tun0", "GRE tunnel") == [
            "interfaces", "tunnel", "tun0", "description", "GRE tunnel"
        ]

    def test_description_path(self):
        assert self.mapper.get_description_path("tun0") == [
            "interfaces", "tunnel", "tun0", "description"
        ]

    def test_address(self):
        assert self.mapper.get_address("tun0", "10.0.0.1/30") == [
            "interfaces", "tunnel", "tun0", "address", "10.0.0.1/30"
        ]

    def test_mtu(self):
        assert self.mapper.get_mtu("tun0", "1476") == [
            "interfaces", "tunnel", "tun0", "mtu", "1476"
        ]

    def test_mtu_path(self):
        assert self.mapper.get_mtu_path("tun0") == [
            "interfaces", "tunnel", "tun0", "mtu"
        ]

    def test_disable(self):
        assert self.mapper.get_disable("tun0") == [
            "interfaces", "tunnel", "tun0", "disable"
        ]

    def test_vrf(self):
        assert self.mapper.get_vrf("tun0", "MGMT") == [
            "interfaces", "tunnel", "tun0", "vrf", "MGMT"
        ]

    def test_interface_path(self):
        assert self.mapper.get_interface("tun0") == [
            "interfaces", "tunnel", "tun0"
        ]

    # --- IP options ---
    def test_ip_adjust_mss(self):
        assert self.mapper.get_ip_adjust_mss("tun0", "1400") == [
            "interfaces", "tunnel", "tun0", "ip", "adjust-mss", "1400"
        ]

    def test_ip_adjust_mss_clamp_mss_to_pmtu(self):
        assert self.mapper.get_ip_adjust_mss_clamp_mss_to_pmtu("tun0") == [
            "interfaces", "tunnel", "tun0", "ip", "adjust-mss", "clamp-mss-to-pmtu"
        ]

    def test_ip_arp_cache_timeout(self):
        assert self.mapper.get_ip_arp_cache_timeout("tun0", "300") == [
            "interfaces", "tunnel", "tun0", "ip", "arp-cache-timeout", "300"
        ]

    def test_ip_disable_arp_filter(self):
        assert self.mapper.get_ip_disable_arp_filter("tun0") == [
            "interfaces", "tunnel", "tun0", "ip", "disable-arp-filter"
        ]

    def test_ip_enable_arp_accept(self):
        assert self.mapper.get_ip_enable_arp_accept("tun0") == [
            "interfaces", "tunnel", "tun0", "ip", "enable-arp-accept"
        ]

    def test_ip_enable_arp_announce(self):
        assert self.mapper.get_ip_enable_arp_announce("tun0") == [
            "interfaces", "tunnel", "tun0", "ip", "enable-arp-announce"
        ]

    def test_ip_enable_arp_ignore(self):
        assert self.mapper.get_ip_enable_arp_ignore("tun0") == [
            "interfaces", "tunnel", "tun0", "ip", "enable-arp-ignore"
        ]

    def test_ip_enable_proxy_arp(self):
        assert self.mapper.get_ip_enable_proxy_arp("tun0") == [
            "interfaces", "tunnel", "tun0", "ip", "enable-proxy-arp"
        ]

    def test_ip_source_validation(self):
        assert self.mapper.get_ip_source_validation("tun0", "strict") == [
            "interfaces", "tunnel", "tun0", "ip", "source-validation", "strict"
        ]

    def test_ip_source_validation_path(self):
        assert self.mapper.get_ip_source_validation_path("tun0") == [
            "interfaces", "tunnel", "tun0", "ip", "source-validation"
        ]

    # --- IPv6 options ---
    def test_ipv6_adjust_mss(self):
        assert self.mapper.get_ipv6_adjust_mss("tun0", "1400") == [
            "interfaces", "tunnel", "tun0", "ipv6", "adjust-mss", "1400"
        ]

    def test_ipv6_adjust_mss_clamp_mss_to_pmtu(self):
        assert self.mapper.get_ipv6_adjust_mss_clamp_mss_to_pmtu("tun0") == [
            "interfaces", "tunnel", "tun0", "ipv6", "adjust-mss", "clamp-mss-to-pmtu"
        ]

    def test_ipv6_disable_forwarding(self):
        assert self.mapper.get_ipv6_disable_forwarding("tun0") == [
            "interfaces", "tunnel", "tun0", "ipv6", "disable-forwarding"
        ]

    def test_ipv6_dup_addr_detect_transmits(self):
        assert self.mapper.get_ipv6_dup_addr_detect_transmits("tun0", "2") == [
            "interfaces", "tunnel", "tun0", "ipv6", "dup-addr-detect-transmits", "2"
        ]

    # --- Tunnel-specific ---
    def test_encapsulation(self):
        assert self.mapper.get_encapsulation("tun0", "gre") == [
            "interfaces", "tunnel", "tun0", "encapsulation", "gre"
        ]

    def test_source_address(self):
        assert self.mapper.get_source_address("tun0", "192.168.1.1") == [
            "interfaces", "tunnel", "tun0", "source-address", "192.168.1.1"
        ]

    def test_source_address_path(self):
        assert self.mapper.get_source_address_path("tun0") == [
            "interfaces", "tunnel", "tun0", "source-address"
        ]

    def test_remote(self):
        assert self.mapper.get_remote("tun0", "10.0.0.2") == [
            "interfaces", "tunnel", "tun0", "remote", "10.0.0.2"
        ]

    def test_remote_path(self):
        assert self.mapper.get_remote_path("tun0") == [
            "interfaces", "tunnel", "tun0", "remote"
        ]

    def test_source_interface(self):
        assert self.mapper.get_source_interface("tun0", "eth0") == [
            "interfaces", "tunnel", "tun0", "source-interface", "eth0"
        ]

    def test_source_interface_path(self):
        assert self.mapper.get_source_interface_path("tun0") == [
            "interfaces", "tunnel", "tun0", "source-interface"
        ]

    def test_enable_multicast(self):
        assert self.mapper.get_enable_multicast("tun0") == [
            "interfaces", "tunnel", "tun0", "enable-multicast"
        ]

    def test_parameters_ip_ttl(self):
        assert self.mapper.get_parameters_ip_ttl("tun0", "64") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "ttl", "64"
        ]

    def test_parameters_ip_ttl_path(self):
        assert self.mapper.get_parameters_ip_ttl_path("tun0") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "ttl"
        ]

    def test_parameters_ip_tos(self):
        assert self.mapper.get_parameters_ip_tos("tun0", "inherit") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "tos", "inherit"
        ]

    def test_parameters_ip_tos_path(self):
        assert self.mapper.get_parameters_ip_tos_path("tun0") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "tos"
        ]

    def test_parameters_ip_key(self):
        assert self.mapper.get_parameters_ip_key("tun0", "1") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "key", "1"
        ]

    def test_parameters_ip_key_path(self):
        assert self.mapper.get_parameters_ip_key_path("tun0") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "key"
        ]

    def test_erspan_direction(self):
        assert self.mapper.get_erspan_direction("tun0", "ingress") == [
            "interfaces", "tunnel", "tun0", "parameters", "erspan", "direction", "ingress"
        ]

    def test_erspan_idx(self):
        assert self.mapper.get_erspan_idx("tun0", "1") == [
            "interfaces", "tunnel", "tun0", "parameters", "erspan", "idx", "1"
        ]

    def test_erspan_version(self):
        assert self.mapper.get_erspan_version("tun0", "2") == [
            "interfaces", "tunnel", "tun0", "parameters", "erspan", "version", "2"
        ]


class TestTunnelMapperParsing:
    """Test config parsing for tunnel interfaces."""

    def setup_method(self):
        self.mapper = TunnelInterfaceMapper("1.5")

    def test_parse_single_interface(self):
        config = {
            "address": ["10.0.0.1/30"],
            "description": "GRE to datacenter",
            "encapsulation": "gre",
            "source-address": "192.168.1.1",
            "remote": "10.10.10.1",
            "mtu": "1476",
        }
        result = self.mapper.parse_single_interface("tun0", config)
        assert result["name"] == "tun0"
        assert result["type"] == "tunnel"
        assert result["addresses"] == ["10.0.0.1/30"]
        assert result["description"] == "GRE to datacenter"
        assert result["encapsulation"] == "gre"
        assert result["source_address"] == "192.168.1.1"
        assert result["remote"] == "10.10.10.1"
        assert result["mtu"] == "1476"

    def test_parse_disabled_interface(self):
        config = {"encapsulation": "ipip", "disable": {}}
        result = self.mapper.parse_single_interface("tun1", config)
        assert result["disable"] is True

    def test_parse_erspan_parameters(self):
        config = {
            "encapsulation": "erspan",
            "parameters": {
                "erspan": {"direction": "ingress", "idx": "1", "version": "2"}
            },
        }
        result = self.mapper.parse_single_interface("tun2", config)
        assert result["parameters"]["erspan"]["direction"] == "ingress"
        assert result["parameters"]["erspan"]["idx"] == "1"
        assert result["parameters"]["erspan"]["version"] == "2"

    def test_parse_ip_parameters(self):
        config = {
            "encapsulation": "gre",
            "parameters": {
                "ip": {"ttl": "64", "tos": "inherit", "key": "1"}
            },
        }
        result = self.mapper.parse_single_interface("tun3", config)
        assert result["parameters"]["ip"]["ttl"] == "64"
        assert result["parameters"]["ip"]["tos"] == "inherit"
        assert result["parameters"]["ip"]["key"] == "1"

    def test_parse_ip_config(self):
        config = {
            "encapsulation": "gre",
            "ip": {
                "adjust-mss": "1400",
                "arp-cache-timeout": "300",
                "disable-arp-filter": {},
                "enable-arp-accept": {},
                "source-validation": "strict",
            },
        }
        result = self.mapper.parse_single_interface("tun4", config)
        assert result["ip"]["adjust_mss"] == "1400"
        assert result["ip"]["arp_cache_timeout"] == "300"
        assert result["ip"]["disable_arp_filter"] is True
        assert result["ip"]["enable_arp_accept"] is True
        assert result["ip"]["source_validation"] == "strict"

    def test_parse_ipv6_config(self):
        config = {
            "encapsulation": "gre",
            "ipv6": {
                "adjust-mss": "1400",
                "disable-forwarding": {},
                "dup-addr-detect-transmits": "2",
            },
        }
        result = self.mapper.parse_single_interface("tun5", config)
        assert result["ipv6"]["adjust_mss"] == "1400"
        assert result["ipv6"]["disable_forwarding"] is True
        assert result["ipv6"]["dup_addr_detect_transmits"] == "2"

    def test_parse_no_ip_config(self):
        config = {"encapsulation": "gre"}
        result = self.mapper.parse_single_interface("tun6", config)
        assert result["ip"] is None

    def test_parse_no_ipv6_config(self):
        config = {"encapsulation": "gre"}
        result = self.mapper.parse_single_interface("tun7", config)
        assert result["ipv6"] is None

    def test_parse_no_parameters(self):
        config = {"encapsulation": "gre"}
        result = self.mapper.parse_single_interface("tun8", config)
        assert result["parameters"] is None

    def test_parse_address_as_string(self):
        config = {"encapsulation": "gre", "address": "10.0.0.1/30"}
        result = self.mapper.parse_single_interface("tun9", config)
        assert result["addresses"] == ["10.0.0.1/30"]

    def test_parse_address_as_list(self):
        config = {"encapsulation": "gre", "address": ["10.0.0.1/30", "10.0.0.5/30"]}
        result = self.mapper.parse_single_interface("tun10", config)
        assert result["addresses"] == ["10.0.0.1/30", "10.0.0.5/30"]

    def test_parse_no_address(self):
        config = {"encapsulation": "gre"}
        result = self.mapper.parse_single_interface("tun11", config)
        assert result["addresses"] == []

    def test_parse_source_interface(self):
        config = {"encapsulation": "gre", "source-interface": "eth0"}
        result = self.mapper.parse_single_interface("tun12", config)
        assert result["source_interface"] == "eth0"

    def test_parse_enable_multicast(self):
        config = {"encapsulation": "gre", "enable-multicast": {}}
        result = self.mapper.parse_single_interface("tun13", config)
        assert result["enable_multicast"] is True

    def test_parse_no_enable_multicast(self):
        config = {"encapsulation": "gre"}
        result = self.mapper.parse_single_interface("tun14", config)
        assert result["enable_multicast"] is False

    def test_parse_interfaces_of_type(self):
        config = {
            "tun0": {"encapsulation": "gre", "address": "10.0.0.1/30"},
            "tun1": {"encapsulation": "ipip"},
        }
        result = self.mapper.parse_interfaces_of_type(config)
        assert result["total"] == 2
        assert len(result["interfaces"]) == 2
        assert result["by_type"]["tunnel"] == 2

    def test_parse_interfaces_of_type_with_vrf(self):
        config = {
            "tun0": {"encapsulation": "gre", "vrf": "MGMT"},
            "tun1": {"encapsulation": "ipip", "vrf": "MGMT"},
            "tun2": {"encapsulation": "sit", "vrf": "PROD"},
        }
        result = self.mapper.parse_interfaces_of_type(config)
        assert result["total"] == 3
        assert result["by_vrf"]["MGMT"] == 2
        assert result["by_vrf"]["PROD"] == 1

    def test_parse_interfaces_of_type_skips_non_dict(self):
        config = {
            "tun0": {"encapsulation": "gre"},
            "some_string": "not a dict",
        }
        result = self.mapper.parse_interfaces_of_type(config)
        assert result["total"] == 1
