/**
 * TypeScript types for VXLAN Interface API
 */

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

export interface VxlanParameters {
  nolearning?: boolean | null;
  neighbor_suppress?: boolean | null;
}

export interface VxlanInterface {
  name: string;
  type: string;
  addresses: string[];
  description?: string | null;
  vrf?: string | null;
  mtu?: string | null;
  disable?: boolean | null;
  vni?: string | null;
  source_address?: string | null;
  remote?: string[] | null;
  group?: string | null;
  port?: string | null;
  source_interface?: string | null;
  gpe?: boolean | null;
  external?: boolean | null;
  ip?: IPConfig | null;
  ipv6?: IPv6Config | null;
  parameters?: VxlanParameters | null;
}

export interface VxlanConfigResponse {
  interfaces: VxlanInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface VxlanCapabilities {
  version: string;
  version_number: number;
  features: Record<string, Record<string, boolean> | boolean>;
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
