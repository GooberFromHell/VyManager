import pytest
from vyos_builders.interfaces.vxlan import VxlanInterfaceBuilderMixin


class TestVxlanBuilderCore:
    """Test core batch operations."""

    def setup_method(self):
        self.builder = VxlanInterfaceBuilderMixin("1.5")

    def test_empty_batch(self):
        assert self.builder.is_empty()
        assert self.builder.operation_count() == 0
        assert self.builder.get_operations() == []

    def test_operation_count(self):
        self.builder.set_vni("vxlan0", "100")
        self.builder.set_source_address("vxlan0", "10.0.0.1")
        assert self.builder.operation_count() == 2

    def test_clear(self):
        self.builder.set_vni("vxlan0", "100")
        self.builder.set_source_address("vxlan0", "10.0.0.1")
        assert self.builder.operation_count() == 2
        self.builder.clear()
        assert self.builder.is_empty()
        assert self.builder.operation_count() == 0


class TestVxlanBuilderVxlanSpecific:
    """Test VXLAN-specific operations."""

    def setup_method(self):
        self.builder = VxlanInterfaceBuilderMixin("1.5")

    def test_set_vni(self):
        self.builder.set_vni("vxlan0", "100")
        ops = self.builder.get_operations()
        assert len(ops) == 1
        assert ops[0] == {"op": "set", "path": ["interfaces", "vxlan", "vxlan0", "vni", "100"]}

    def test_set_source_address(self):
        self.builder.set_source_address("vxlan0", "10.0.0.1")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "vxlan", "vxlan0", "source-address", "10.0.0.1"]}

    def test_delete_source_address(self):
        self.builder.delete_source_address("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "source-address"]}

    def test_set_remote(self):
        self.builder.set_remote("vxlan0", "10.0.0.2")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "vxlan", "vxlan0", "remote", "10.0.0.2"]}

    def test_delete_remote(self):
        self.builder.delete_remote("vxlan0", "10.0.0.2")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "remote", "10.0.0.2"]}

    def test_set_group(self):
        self.builder.set_group("vxlan0", "239.1.1.1")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "vxlan", "vxlan0", "group", "239.1.1.1"]}

    def test_delete_group(self):
        self.builder.delete_group("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "group"]}

    def test_set_port(self):
        self.builder.set_port("vxlan0", "4789")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "vxlan", "vxlan0", "port", "4789"]}

    def test_delete_port(self):
        self.builder.delete_port("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "port"]}

    def test_set_source_interface(self):
        self.builder.set_source_interface("vxlan0", "eth0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "vxlan", "vxlan0", "source-interface", "eth0"]}

    def test_delete_source_interface(self):
        self.builder.delete_source_interface("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "source-interface"]}

    def test_set_gpe(self):
        self.builder.set_gpe("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "vxlan", "vxlan0", "gpe"]}

    def test_delete_gpe(self):
        self.builder.delete_gpe("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "gpe"]}

    def test_set_external(self):
        self.builder.set_external("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "vxlan", "vxlan0", "external"]}

    def test_delete_external(self):
        self.builder.delete_external("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "external"]}

    def test_set_nolearning(self):
        self.builder.set_nolearning("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "vxlan", "vxlan0", "parameters", "nolearning"]}

    def test_delete_nolearning(self):
        self.builder.delete_nolearning("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "parameters", "nolearning"]}

    def test_set_neighbor_suppress(self):
        self.builder.set_neighbor_suppress("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {
            "op": "set",
            "path": ["interfaces", "vxlan", "vxlan0", "parameters", "neighbor-suppress"],
        }

    def test_delete_neighbor_suppress(self):
        self.builder.delete_neighbor_suppress("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {
            "op": "delete",
            "path": ["interfaces", "vxlan", "vxlan0", "parameters", "neighbor-suppress"],
        }


class TestVxlanBuilderCommon:
    """Test common interface operations (description, address, mtu, disable, vrf)."""

    def setup_method(self):
        self.builder = VxlanInterfaceBuilderMixin("1.5")

    def test_set_description(self):
        self.builder.set_interface_description("vxlan0", "VXLAN overlay")
        ops = self.builder.get_operations()
        assert ops[0] == {
            "op": "set",
            "path": ["interfaces", "vxlan", "vxlan0", "description", "VXLAN overlay"],
        }

    def test_delete_description(self):
        self.builder.delete_interface_description("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "description"]}

    def test_set_address(self):
        self.builder.set_interface_address("vxlan0", "10.0.0.1/24")
        ops = self.builder.get_operations()
        assert ops[0] == {
            "op": "set",
            "path": ["interfaces", "vxlan", "vxlan0", "address", "10.0.0.1/24"],
        }

    def test_delete_address(self):
        self.builder.delete_interface_address("vxlan0", "10.0.0.1/24")
        ops = self.builder.get_operations()
        assert ops[0] == {
            "op": "delete",
            "path": ["interfaces", "vxlan", "vxlan0", "address", "10.0.0.1/24"],
        }

    def test_set_mtu(self):
        self.builder.set_interface_mtu("vxlan0", "1450")
        ops = self.builder.get_operations()
        assert ops[0] == {
            "op": "set",
            "path": ["interfaces", "vxlan", "vxlan0", "mtu", "1450"],
        }

    def test_delete_mtu(self):
        self.builder.delete_interface_mtu("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "mtu"]}

    def test_set_disable(self):
        self.builder.set_interface_disable("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "vxlan", "vxlan0", "disable"]}

    def test_delete_disable(self):
        self.builder.delete_interface_disable("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0", "disable"]}

    def test_set_vrf(self):
        self.builder.set_interface_vrf("vxlan0", "VRF_OVERLAY")
        ops = self.builder.get_operations()
        assert ops[0] == {
            "op": "set",
            "path": ["interfaces", "vxlan", "vxlan0", "vrf", "VRF_OVERLAY"],
        }

    def test_delete_vrf(self):
        self.builder.delete_interface_vrf("vxlan0", "VRF_OVERLAY")
        ops = self.builder.get_operations()
        assert ops[0] == {
            "op": "delete",
            "path": ["interfaces", "vxlan", "vxlan0", "vrf", "VRF_OVERLAY"],
        }

    def test_delete_interface(self):
        self.builder.delete_interface("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "vxlan", "vxlan0"]}


class TestVxlanBuilderIPOptions:
    """Test IP and IPv6 option methods."""

    def setup_method(self):
        self.builder = VxlanInterfaceBuilderMixin("1.5")

    def test_set_ip_adjust_mss(self):
        self.builder.set_ip_adjust_mss("vxlan0", "1400")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "vxlan", "vxlan0", "ip", "adjust-mss", "1400"]

    def test_set_ip_adjust_mss_clamp_to_pmtu(self):
        self.builder.set_ip_adjust_mss_clamp_to_pmtu("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "vxlan", "vxlan0", "ip", "adjust-mss", "clamp-mss-to-pmtu"]

    def test_set_ip_source_validation(self):
        self.builder.set_ip_source_validation("vxlan0", "strict")
        ops = self.builder.get_operations()
        assert ops[0] == {
            "op": "set",
            "path": ["interfaces", "vxlan", "vxlan0", "ip", "source-validation", "strict"],
        }

    def test_delete_ip_source_validation(self):
        self.builder.delete_ip_source_validation("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0] == {
            "op": "delete",
            "path": ["interfaces", "vxlan", "vxlan0", "ip", "source-validation"],
        }

    def test_set_ip_arp_cache_timeout(self):
        self.builder.set_ip_arp_cache_timeout("vxlan0", "300")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "vxlan", "vxlan0", "ip", "arp-cache-timeout", "300"]

    def test_set_ip_enable_arp_accept(self):
        self.builder.set_ip_enable_arp_accept("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "vxlan", "vxlan0", "ip", "enable-arp-accept"]

    def test_set_ipv6_adjust_mss(self):
        self.builder.set_ipv6_adjust_mss("vxlan0", "1380")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "vxlan", "vxlan0", "ipv6", "adjust-mss", "1380"]

    def test_set_ipv6_adjust_mss_clamp_to_pmtu(self):
        self.builder.set_ipv6_adjust_mss_clamp_to_pmtu("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "vxlan", "vxlan0", "ipv6", "adjust-mss", "clamp-mss-to-pmtu"]

    def test_set_ipv6_disable_forwarding(self):
        self.builder.set_ipv6_disable_forwarding("vxlan0")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "vxlan", "vxlan0", "ipv6", "disable-forwarding"]

    def test_set_ipv6_dup_addr_detect_transmits(self):
        self.builder.set_ipv6_dup_addr_detect_transmits("vxlan0", "3")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "vxlan", "vxlan0", "ipv6", "dup-addr-detect-transmits", "3"]


class TestVxlanBuilderChainable:
    """Test that the builder API is chainable."""

    def setup_method(self):
        self.builder = VxlanInterfaceBuilderMixin("1.5")

    def test_chainable_api(self):
        result = (
            self.builder
            .set_vni("vxlan0", "100")
            .set_source_address("vxlan0", "10.0.0.1")
            .set_remote("vxlan0", "10.0.0.2")
            .set_port("vxlan0", "4789")
            .set_interface_description("vxlan0", "VXLAN overlay")
            .set_interface_address("vxlan0", "192.168.100.1/24")
            .set_interface_mtu("vxlan0", "1450")
            .set_gpe("vxlan0")
            .set_nolearning("vxlan0")
            .set_neighbor_suppress("vxlan0")
        )
        assert result is self.builder
        assert self.builder.operation_count() == 10

    def test_multiple_remotes(self):
        """Test adding multiple remote VTEPs."""
        result = (
            self.builder
            .set_remote("vxlan0", "10.0.0.2")
            .set_remote("vxlan0", "10.0.0.3")
            .set_remote("vxlan0", "10.0.0.4")
        )
        assert result is self.builder
        assert self.builder.operation_count() == 3
        ops = self.builder.get_operations()
        assert ops[0]["path"][-1] == "10.0.0.2"
        assert ops[1]["path"][-1] == "10.0.0.3"
        assert ops[2]["path"][-1] == "10.0.0.4"
