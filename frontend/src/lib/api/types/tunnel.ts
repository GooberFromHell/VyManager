/**
 * TypeScript types for Tunnel Interface API
 */

export type TunnelEncapsulation = "gre" | "gretap" | "ipip" | "sit" | "erspan";

export interface IPConfig {
  adjust_mss?: string | null;
  arp_cache_timeout?: string | null;
  disable_arp_filter?: boolean | null;
  enable_arp_accept?: boolean | null;
  enable_arp_announce?: boolean | null;
  enable_arp_ignore?: boolean | null;
  enable_proxy_arp?: boolean | null;
  source_validation?: string | null;
}

export interface IPv6Config {
  adjust_mss?: string | null;
  disable_forwarding?: boolean | null;
  dup_addr_detect_transmits?: string | null;
}

export interface TunnelParameters {
  ip?: { ttl?: string | null; tos?: string | null; key?: string | null } | null;
  erspan?: { direction?: string | null; idx?: string | null; version?: string | null } | null;
}

export interface TunnelInterface {
  name: string;
  type: string;
  addresses: string[];
  description?: string | null;
  vrf?: string | null;
  mtu?: string | null;
  disable?: boolean | null;
  encapsulation?: string | null;
  source_address?: string | null;
  remote?: string | null;
  source_interface?: string | null;
  enable_multicast?: boolean | null;
  ip?: IPConfig | null;
  ipv6?: IPv6Config | null;
  parameters?: TunnelParameters | null;
}

export interface TunnelConfigResponse {
  interfaces: TunnelInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface TunnelCapabilities {
  version: string;
  version_number: number;
  features: Record<string, Record<string, boolean> | boolean>;
  encapsulation_types: TunnelEncapsulation[];
}

export interface BatchOperation {
  op: string;
  value?: string;
}

export interface BatchRequest {
  interface: string;
  operations: BatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}
