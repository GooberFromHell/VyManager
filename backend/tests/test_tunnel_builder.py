import pytest
from vyos_builders.interfaces.tunnel import TunnelInterfaceBuilderMixin


class TestTunnelBuilderCore:
    """Test core batch operations."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_empty_batch(self):
        assert self.builder.is_empty()
        assert self.builder.operation_count() == 0

    def test_operation_count(self):
        self.builder.set_encapsulation("tun0", "gre")
        self.builder.set_source_address("tun0", "192.168.1.1")
        assert self.builder.operation_count() == 2

    def test_is_empty_after_add(self):
        self.builder.set_encapsulation("tun0", "gre")
        assert not self.builder.is_empty()

    def test_clear(self):
        self.builder.set_encapsulation("tun0", "gre")
        self.builder.set_remote("tun0", "10.0.0.2")
        self.builder.clear()
        assert self.builder.is_empty()
        assert self.builder.operation_count() == 0


class TestTunnelBuilderEncapsulation:
    """Test tunnel encapsulation operations."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_set_encapsulation(self):
        self.builder.set_encapsulation("tun0", "gre")
        ops = self.builder.get_operations()
        assert len(ops) == 1
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "encapsulation", "gre"]}

    def test_set_encapsulation_ipip(self):
        self.builder.set_encapsulation("tun1", "ipip")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun1", "encapsulation", "ipip"]}


class TestTunnelBuilderSourceAddress:
    """Test source address operations."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_set_source_address(self):
        self.builder.set_source_address("tun0", "192.168.1.1")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "source-address", "192.168.1.1"]}

    def test_delete_source_address(self):
        self.builder.delete_source_address("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "source-address"]}


class TestTunnelBuilderRemote:
    """Test remote endpoint operations."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_set_remote(self):
        self.builder.set_remote("tun0", "10.0.0.2")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "remote", "10.0.0.2"]}

    def test_delete_remote(self):
        self.builder.delete_remote("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "remote"]}


class TestTunnelBuilderCommonInterface:
    """Test common interface operations (description, address, mtu, disable, vrf)."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_set_interface_description(self):
        self.builder.set_interface_description("tun0", "GRE tunnel")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "description", "GRE tunnel"]}

    def test_delete_interface_description(self):
        self.builder.delete_interface_description("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "description"]}

    def test_set_interface_address(self):
        self.builder.set_interface_address("tun0", "10.0.0.1/30")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "address", "10.0.0.1/30"]}

    def test_delete_interface_address(self):
        self.builder.delete_interface_address("tun0", "10.0.0.1/30")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "address", "10.0.0.1/30"]}

    def test_set_interface_mtu(self):
        self.builder.set_interface_mtu("tun0", "1476")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "mtu", "1476"]}

    def test_delete_interface_mtu(self):
        self.builder.delete_interface_mtu("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "mtu"]}

    def test_set_interface_disable(self):
        self.builder.set_interface_disable("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "disable"]}

    def test_delete_interface_disable(self):
        self.builder.delete_interface_disable("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "disable"]}

    def test_set_interface_vrf(self):
        self.builder.set_interface_vrf("tun0", "MGMT")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "vrf", "MGMT"]}

    def test_delete_interface_vrf(self):
        self.builder.delete_interface_vrf("tun0", "MGMT")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "vrf", "MGMT"]}

    def test_delete_interface(self):
        self.builder.delete_interface("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0"]}


class TestTunnelBuilderChainable:
    """Test that all builder methods return self for chaining."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_chainable_api(self):
        result = (
            self.builder
            .set_encapsulation("tun0", "gre")
            .set_source_address("tun0", "192.168.1.1")
            .set_remote("tun0", "10.0.0.2")
            .set_interface_description("tun0", "My tunnel")
            .set_interface_address("tun0", "10.0.0.1/30")
        )
        assert result is self.builder
        assert self.builder.operation_count() == 5

    def test_chainable_delete_operations(self):
        result = (
            self.builder
            .delete_source_address("tun0")
            .delete_remote("tun0")
            .delete_interface_description("tun0")
        )
        assert result is self.builder
        assert self.builder.operation_count() == 3
        ops = self.builder.get_operations()
        assert all(op["op"] == "delete" for op in ops)

    def test_chainable_tunnel_specific(self):
        result = (
            self.builder
            .set_enable_multicast("tun0")
            .set_source_interface("tun0", "eth0")
            .set_parameters_ip_ttl("tun0", "64")
            .set_parameters_ip_tos("tun0", "inherit")
            .set_parameters_ip_key("tun0", "42")
        )
        assert result is self.builder
        assert self.builder.operation_count() == 5


class TestTunnelBuilderMulticast:
    """Test multicast enable/disable operations."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_set_enable_multicast(self):
        self.builder.set_enable_multicast("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "enable-multicast"]}

    def test_delete_enable_multicast(self):
        self.builder.delete_enable_multicast("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "enable-multicast"]}


class TestTunnelBuilderSourceInterface:
    """Test source interface operations."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_set_source_interface(self):
        self.builder.set_source_interface("tun0", "eth0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "source-interface", "eth0"]}

    def test_delete_source_interface(self):
        self.builder.delete_source_interface("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "source-interface"]}


class TestTunnelBuilderParametersIP:
    """Test tunnel parameters IP operations (TTL, TOS, key)."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_set_parameters_ip_ttl(self):
        self.builder.set_parameters_ip_ttl("tun0", "64")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "parameters", "ip", "ttl", "64"]}

    def test_delete_parameters_ip_ttl(self):
        self.builder.delete_parameters_ip_ttl("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "parameters", "ip", "ttl"]}

    def test_set_parameters_ip_tos(self):
        self.builder.set_parameters_ip_tos("tun0", "inherit")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "parameters", "ip", "tos", "inherit"]}

    def test_delete_parameters_ip_tos(self):
        self.builder.delete_parameters_ip_tos("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "parameters", "ip", "tos"]}

    def test_set_parameters_ip_key(self):
        self.builder.set_parameters_ip_key("tun0", "42")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "parameters", "ip", "key", "42"]}

    def test_delete_parameters_ip_key(self):
        self.builder.delete_parameters_ip_key("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "parameters", "ip", "key"]}


class TestTunnelBuilderERSPAN:
    """Test ERSPAN parameter operations."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_set_erspan_direction(self):
        self.builder.set_erspan_direction("tun0", "ingress")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "parameters", "erspan", "direction", "ingress"]}

    def test_set_erspan_idx(self):
        self.builder.set_erspan_idx("tun0", "1")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "parameters", "erspan", "idx", "1"]}

    def test_set_erspan_version(self):
        self.builder.set_erspan_version("tun0", "2")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "parameters", "erspan", "version", "2"]}

    def test_erspan_full_config(self):
        self.builder.set_erspan_direction("tun0", "ingress")
        self.builder.set_erspan_idx("tun0", "1")
        self.builder.set_erspan_version("tun0", "2")
        ops = self.builder.get_operations()
        assert len(ops) == 3
        assert ops[0]["path"][-2:] == ["direction", "ingress"]
        assert ops[1]["path"][-2:] == ["idx", "1"]
        assert ops[2]["path"][-2:] == ["version", "2"]


class TestTunnelBuilderIPOptions:
    """Test IP option operations."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_set_ip_adjust_mss(self):
        self.builder.set_ip_adjust_mss("tun0", "1400")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "ip", "adjust-mss", "1400"]}

    def test_set_ip_adjust_mss_clamp_to_pmtu(self):
        self.builder.set_ip_adjust_mss_clamp_to_pmtu("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "ip", "adjust-mss", "clamp-mss-to-pmtu"]}

    def test_set_ip_arp_cache_timeout(self):
        self.builder.set_ip_arp_cache_timeout("tun0", "300")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "ip", "arp-cache-timeout", "300"]}

    def test_set_ip_enable_arp_accept(self):
        self.builder.set_ip_enable_arp_accept("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "ip", "enable-arp-accept"]}

    def test_set_ip_source_validation(self):
        self.builder.set_ip_source_validation("tun0", "strict")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "ip", "source-validation", "strict"]}

    def test_delete_ip_source_validation(self):
        self.builder.delete_ip_source_validation("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0", "ip", "source-validation"]}


class TestTunnelBuilderIPv6Options:
    """Test IPv6 option operations."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_set_ipv6_adjust_mss(self):
        self.builder.set_ipv6_adjust_mss("tun0", "1400")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "ipv6", "adjust-mss", "1400"]}

    def test_set_ipv6_adjust_mss_clamp_to_pmtu(self):
        self.builder.set_ipv6_adjust_mss_clamp_to_pmtu("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "ipv6", "adjust-mss", "clamp-mss-to-pmtu"]}

    def test_set_ipv6_disable_forwarding(self):
        self.builder.set_ipv6_disable_forwarding("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "ipv6", "disable-forwarding"]}

    def test_set_ipv6_dup_addr_detect_transmits(self):
        self.builder.set_ipv6_dup_addr_detect_transmits("tun0", "3")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "ipv6", "dup-addr-detect-transmits", "3"]}


class TestTunnelBuilderDeleteOperations:
    """Test that delete operations generate correct op type."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_delete_operations_all_delete_op(self):
        self.builder.delete_interface_description("tun0")
        self.builder.delete_source_address("tun0")
        self.builder.delete_remote("tun0")
        self.builder.delete_source_interface("tun0")
        self.builder.delete_enable_multicast("tun0")
        self.builder.delete_parameters_ip_ttl("tun0")
        self.builder.delete_parameters_ip_tos("tun0")
        self.builder.delete_parameters_ip_key("tun0")
        self.builder.delete_ip_source_validation("tun0")
        ops = self.builder.get_operations()
        assert all(op["op"] == "delete" for op in ops)
        assert len(ops) == 9


class TestTunnelBuilderTTLTOSKey:
    """Test TTL, TOS, and key parameter operations together."""

    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_ttl_tos_key(self):
        self.builder.set_parameters_ip_ttl("tun0", "64")
        self.builder.set_parameters_ip_tos("tun0", "inherit")
        self.builder.set_parameters_ip_key("tun0", "42")
        ops = self.builder.get_operations()
        assert len(ops) == 3
        assert ops[0]["path"] == ["interfaces", "tunnel", "tun0", "parameters", "ip", "ttl", "64"]
        assert ops[1]["path"] == ["interfaces", "tunnel", "tun0", "parameters", "ip", "tos", "inherit"]
        assert ops[2]["path"] == ["interfaces", "tunnel", "tun0", "parameters", "ip", "key", "42"]
