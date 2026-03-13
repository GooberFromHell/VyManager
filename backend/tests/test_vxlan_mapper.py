import pytest
from vyos_mappers.interfaces.vxlan import VxlanInterfaceMapper


class TestVxlanMapperPaths:
    """Test CLI path generation for VXLAN interfaces."""

    def setup_method(self):
        self.mapper = VxlanInterfaceMapper("1.5")

    # --- Common interface properties ---
    def test_description(self):
        assert self.mapper.get_description("vxlan0", "VXLAN overlay") == [
            "interfaces", "vxlan", "vxlan0", "description", "VXLAN overlay"
        ]

    def test_description_path(self):
        assert self.mapper.get_description_path("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "description"
        ]

    def test_address(self):
        assert self.mapper.get_address("vxlan0", "10.0.0.1/24") == [
            "interfaces", "vxlan", "vxlan0", "address", "10.0.0.1/24"
        ]

    def test_mtu(self):
        assert self.mapper.get_mtu("vxlan0", "1500") == [
            "interfaces", "vxlan", "vxlan0", "mtu", "1500"
        ]

    def test_mtu_path(self):
        assert self.mapper.get_mtu_path("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "mtu"
        ]

    def test_disable(self):
        assert self.mapper.get_disable("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "disable"
        ]

    def test_vrf(self):
        assert self.mapper.get_vrf("vxlan0", "MGMT") == [
            "interfaces", "vxlan", "vxlan0", "vrf", "MGMT"
        ]

    def test_interface_path(self):
        assert self.mapper.get_interface("vxlan0") == [
            "interfaces", "vxlan", "vxlan0"
        ]

    # --- IP options ---
    def test_ip_adjust_mss(self):
        assert self.mapper.get_ip_adjust_mss("vxlan0", "1400") == [
            "interfaces", "vxlan", "vxlan0", "ip", "adjust-mss", "1400"
        ]

    def test_ip_adjust_mss_clamp_mss_to_pmtu(self):
        assert self.mapper.get_ip_adjust_mss_clamp_mss_to_pmtu("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "ip", "adjust-mss", "clamp-mss-to-pmtu"
        ]

    def test_ip_arp_cache_timeout(self):
        assert self.mapper.get_ip_arp_cache_timeout("vxlan0", "300") == [
            "interfaces", "vxlan", "vxlan0", "ip", "arp-cache-timeout", "300"
        ]

    def test_ip_disable_arp_filter(self):
        assert self.mapper.get_ip_disable_arp_filter("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "ip", "disable-arp-filter"
        ]

    def test_ip_enable_arp_accept(self):
        assert self.mapper.get_ip_enable_arp_accept("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "ip", "enable-arp-accept"
        ]

    def test_ip_enable_arp_announce(self):
        assert self.mapper.get_ip_enable_arp_announce("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "ip", "enable-arp-announce"
        ]

    def test_ip_enable_arp_ignore(self):
        assert self.mapper.get_ip_enable_arp_ignore("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "ip", "enable-arp-ignore"
        ]

    def test_ip_enable_proxy_arp(self):
        assert self.mapper.get_ip_enable_proxy_arp("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "ip", "enable-proxy-arp"
        ]

    def test_ip_source_validation(self):
        assert self.mapper.get_ip_source_validation("vxlan0", "strict") == [
            "interfaces", "vxlan", "vxlan0", "ip", "source-validation", "strict"
        ]

    def test_ip_source_validation_path(self):
        assert self.mapper.get_ip_source_validation_path("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "ip", "source-validation"
        ]

    # --- IPv6 options ---
    def test_ipv6_adjust_mss(self):
        assert self.mapper.get_ipv6_adjust_mss("vxlan0", "1400") == [
            "interfaces", "vxlan", "vxlan0", "ipv6", "adjust-mss", "1400"
        ]

    def test_ipv6_adjust_mss_clamp_mss_to_pmtu(self):
        assert self.mapper.get_ipv6_adjust_mss_clamp_mss_to_pmtu("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "ipv6", "adjust-mss", "clamp-mss-to-pmtu"
        ]

    def test_ipv6_disable_forwarding(self):
        assert self.mapper.get_ipv6_disable_forwarding("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "ipv6", "disable-forwarding"
        ]

    def test_ipv6_dup_addr_detect_transmits(self):
        assert self.mapper.get_ipv6_dup_addr_detect_transmits("vxlan0", "3") == [
            "interfaces", "vxlan", "vxlan0", "ipv6", "dup-addr-detect-transmits", "3"
        ]

    # --- VXLAN-specific ---
    def test_vni(self):
        assert self.mapper.get_vni("vxlan0", "100") == [
            "interfaces", "vxlan", "vxlan0", "vni", "100"
        ]

    def test_vni_path(self):
        assert self.mapper.get_vni_path("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "vni"
        ]

    def test_source_address(self):
        assert self.mapper.get_source_address("vxlan0", "192.168.1.1") == [
            "interfaces", "vxlan", "vxlan0", "source-address", "192.168.1.1"
        ]

    def test_source_address_path(self):
        assert self.mapper.get_source_address_path("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "source-address"
        ]

    def test_remote(self):
        assert self.mapper.get_remote("vxlan0", "10.0.0.2") == [
            "interfaces", "vxlan", "vxlan0", "remote", "10.0.0.2"
        ]

    def test_remote_path(self):
        assert self.mapper.get_remote_path("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "remote"
        ]

    def test_group(self):
        assert self.mapper.get_group("vxlan0", "239.1.1.1") == [
            "interfaces", "vxlan", "vxlan0", "group", "239.1.1.1"
        ]

    def test_group_path(self):
        assert self.mapper.get_group_path("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "group"
        ]

    def test_port(self):
        assert self.mapper.get_port("vxlan0", "4789") == [
            "interfaces", "vxlan", "vxlan0", "port", "4789"
        ]

    def test_port_path(self):
        assert self.mapper.get_port_path("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "port"
        ]

    def test_source_interface(self):
        assert self.mapper.get_source_interface("vxlan0", "eth0") == [
            "interfaces", "vxlan", "vxlan0", "source-interface", "eth0"
        ]

    def test_source_interface_path(self):
        assert self.mapper.get_source_interface_path("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "source-interface"
        ]

    def test_gpe(self):
        assert self.mapper.get_gpe("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "gpe"
        ]

    def test_external(self):
        assert self.mapper.get_external("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "external"
        ]

    def test_parameters_nolearning(self):
        assert self.mapper.get_parameters_nolearning("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "parameters", "nolearning"
        ]

    def test_parameters_neighbor_suppress(self):
        assert self.mapper.get_parameters_neighbor_suppress("vxlan0") == [
            "interfaces", "vxlan", "vxlan0", "parameters", "neighbor-suppress"
        ]


class TestVxlanMapperParsing:
    """Test config parsing for VXLAN interfaces."""

    def setup_method(self):
        self.mapper = VxlanInterfaceMapper("1.5")

    def test_parse_single_interface_basic(self):
        config = {
            "address": ["10.0.0.1/24"],
            "description": "VXLAN overlay",
            "vni": "100",
            "source-address": "192.168.1.1",
            "remote": "10.10.10.1",
            "mtu": "1500",
        }
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["name"] == "vxlan0"
        assert result["type"] == "vxlan"
        assert result["addresses"] == ["10.0.0.1/24"]
        assert result["description"] == "VXLAN overlay"
        assert result["vni"] == "100"
        assert result["source_address"] == "192.168.1.1"
        assert result["remote"] == ["10.10.10.1"]
        assert result["mtu"] == "1500"

    def test_parse_single_interface_remote_as_string(self):
        """VXLAN remote can be a single string when only one remote is configured."""
        config = {
            "vni": "200",
            "remote": "10.0.0.2",
        }
        result = self.mapper.parse_single_interface("vxlan1", config)
        assert result["remote"] == ["10.0.0.2"]

    def test_parse_single_interface_remote_as_list(self):
        """VXLAN remote is a list when multiple remotes are configured."""
        config = {
            "vni": "200",
            "remote": ["10.0.0.2", "10.0.0.3", "10.0.0.4"],
        }
        result = self.mapper.parse_single_interface("vxlan1", config)
        assert result["remote"] == ["10.0.0.2", "10.0.0.3", "10.0.0.4"]

    def test_parse_single_interface_no_remote(self):
        """VXLAN with no remote configured returns empty list."""
        config = {
            "vni": "300",
        }
        result = self.mapper.parse_single_interface("vxlan2", config)
        assert result["remote"] == []

    def test_parse_disabled_interface(self):
        config = {"vni": "100", "disable": {}}
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["disable"] is True

    def test_parse_enabled_interface(self):
        config = {"vni": "100"}
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["disable"] is None

    def test_parse_group_and_port(self):
        config = {
            "vni": "100",
            "group": "239.1.1.1",
            "port": "4789",
            "source-interface": "eth0",
        }
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["group"] == "239.1.1.1"
        assert result["port"] == "4789"
        assert result["source_interface"] == "eth0"

    def test_parse_gpe_and_external(self):
        config = {
            "vni": "100",
            "gpe": {},
            "external": {},
        }
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["gpe"] is True
        assert result["external"] is True

    def test_parse_no_gpe_and_external(self):
        config = {
            "vni": "100",
        }
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["gpe"] is False
        assert result["external"] is False

    def test_parse_parameters(self):
        config = {
            "vni": "100",
            "parameters": {
                "nolearning": {},
                "neighbor-suppress": {},
            },
        }
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["parameters"]["nolearning"] is True
        assert result["parameters"]["neighbor_suppress"] is True

    def test_parse_no_parameters(self):
        config = {"vni": "100"}
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["parameters"] is None

    def test_parse_parameters_partial(self):
        config = {
            "vni": "100",
            "parameters": {
                "nolearning": {},
            },
        }
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["parameters"]["nolearning"] is True
        assert result["parameters"]["neighbor_suppress"] is False

    def test_parse_ip_config(self):
        config = {
            "vni": "100",
            "ip": {
                "adjust-mss": "1400",
                "enable-arp-accept": {},
                "source-validation": "strict",
            },
        }
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["ip"]["adjust_mss"] == "1400"
        assert result["ip"]["enable_arp_accept"] is True
        assert result["ip"]["source_validation"] == "strict"

    def test_parse_ipv6_config(self):
        config = {
            "vni": "100",
            "ipv6": {
                "adjust-mss": "1400",
                "disable-forwarding": {},
                "dup-addr-detect-transmits": "3",
            },
        }
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["ipv6"]["adjust_mss"] == "1400"
        assert result["ipv6"]["disable_forwarding"] is True
        assert result["ipv6"]["dup_addr_detect_transmits"] == "3"

    def test_parse_no_ip_config(self):
        config = {"vni": "100"}
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["ip"] is None

    def test_parse_no_ipv6_config(self):
        config = {"vni": "100"}
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["ipv6"] is None

    def test_parse_address_as_string(self):
        config = {"vni": "100", "address": "10.0.0.1/24"}
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["addresses"] == ["10.0.0.1/24"]

    def test_parse_address_as_list(self):
        config = {"vni": "100", "address": ["10.0.0.1/24", "10.0.0.2/24"]}
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["addresses"] == ["10.0.0.1/24", "10.0.0.2/24"]

    def test_parse_no_address(self):
        config = {"vni": "100"}
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["addresses"] == []

    def test_parse_vrf(self):
        config = {"vni": "100", "vrf": "TENANT1"}
        result = self.mapper.parse_single_interface("vxlan0", config)
        assert result["vrf"] == "TENANT1"

    def test_parse_full_config(self):
        """Test parsing a fully populated VXLAN interface config."""
        config = {
            "address": ["10.0.0.1/24", "fd00::1/64"],
            "description": "Full VXLAN",
            "vni": "42",
            "source-address": "192.168.1.1",
            "remote": ["10.0.0.2", "10.0.0.3"],
            "group": "239.1.1.1",
            "port": "4789",
            "source-interface": "eth0",
            "mtu": "9000",
            "vrf": "OVERLAY",
            "gpe": {},
            "external": {},
            "ip": {
                "adjust-mss": "1400",
                "enable-arp-accept": {},
            },
            "ipv6": {
                "disable-forwarding": {},
            },
            "parameters": {
                "nolearning": {},
                "neighbor-suppress": {},
            },
        }
        result = self.mapper.parse_single_interface("vxlan42", config)
        assert result["name"] == "vxlan42"
        assert result["type"] == "vxlan"
        assert result["addresses"] == ["10.0.0.1/24", "fd00::1/64"]
        assert result["description"] == "Full VXLAN"
        assert result["vni"] == "42"
        assert result["source_address"] == "192.168.1.1"
        assert result["remote"] == ["10.0.0.2", "10.0.0.3"]
        assert result["group"] == "239.1.1.1"
        assert result["port"] == "4789"
        assert result["source_interface"] == "eth0"
        assert result["mtu"] == "9000"
        assert result["vrf"] == "OVERLAY"
        assert result["gpe"] is True
        assert result["external"] is True
        assert result["ip"]["adjust_mss"] == "1400"
        assert result["ip"]["enable_arp_accept"] is True
        assert result["ipv6"]["disable_forwarding"] is True
        assert result["parameters"]["nolearning"] is True
        assert result["parameters"]["neighbor_suppress"] is True

    def test_parse_interfaces_of_type(self):
        config = {
            "vxlan0": {"vni": "100", "address": "10.0.0.1/24"},
            "vxlan1": {"vni": "200"},
            "vxlan2": {"vni": "300", "vrf": "TENANT1"},
        }
        result = self.mapper.parse_interfaces_of_type(config)
        assert result["total"] == 3
        assert len(result["interfaces"]) == 3
        assert result["by_type"]["vxlan"] == 3
        assert result["by_vrf"]["TENANT1"] == 1

    def test_parse_interfaces_of_type_empty(self):
        result = self.mapper.parse_interfaces_of_type({})
        assert result["total"] == 0
        assert result["interfaces"] == []
        assert result["by_type"]["vxlan"] == 0
        assert result["by_vrf"] == {}

    def test_parse_interfaces_of_type_skips_non_dict(self):
        config = {
            "vxlan0": {"vni": "100"},
            "some_string_value": "not a dict",
        }
        result = self.mapper.parse_interfaces_of_type(config)
        assert result["total"] == 1
        assert len(result["interfaces"]) == 1

    def test_parse_interfaces_of_type_multiple_vrfs(self):
        config = {
            "vxlan0": {"vni": "100", "vrf": "VRF1"},
            "vxlan1": {"vni": "200", "vrf": "VRF1"},
            "vxlan2": {"vni": "300", "vrf": "VRF2"},
            "vxlan3": {"vni": "400"},
        }
        result = self.mapper.parse_interfaces_of_type(config)
        assert result["total"] == 4
        assert result["by_vrf"]["VRF1"] == 2
        assert result["by_vrf"]["VRF2"] == 1


class TestVxlanMapperVersions:
    """Test that version-specific mappers work correctly."""

    def test_v14_mapper(self):
        mapper = VxlanInterfaceMapper("1.4")
        assert mapper.version == "1.4"
        assert mapper.interface_type == "vxlan"
        # Basic path generation works the same
        assert mapper.get_vni("vxlan0", "100") == [
            "interfaces", "vxlan", "vxlan0", "vni", "100"
        ]

    def test_v15_mapper(self):
        mapper = VxlanInterfaceMapper("1.5")
        assert mapper.version == "1.5"
        assert mapper.interface_type == "vxlan"

    def test_version_factory(self):
        from vyos_mappers.interfaces.vxlan_versions import get_vxlan_mapper
        mapper_14 = get_vxlan_mapper("1.4")
        assert mapper_14.version == "1.4"
        mapper_15 = get_vxlan_mapper("1.5")
        assert mapper_15.version == "1.5"

    def test_version_factory_unknown_defaults_to_15(self):
        from vyos_mappers.interfaces.vxlan_versions import get_vxlan_mapper
        mapper = get_vxlan_mapper("2.0")
        assert mapper.version == "2.0"

    def test_registry_integration(self):
        from vyos_mappers import CommandMapperRegistry
        mapper = CommandMapperRegistry.get_mapper("interface_vxlan", "1.5")
        assert mapper.interface_type == "vxlan"
        assert mapper.version == "1.5"
