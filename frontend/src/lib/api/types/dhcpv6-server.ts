// DHCPv6 Server Types

export interface DHCPv6StaticMapping {
  name: string;
  identifier?: string;
  ipv6_address?: string;
  ipv6_prefix?: string;
}

export interface DHCPv6LeaseTime {
  default?: number;
  maximum?: number;
  minimum?: number;
}

export interface DHCPv6Subnet {
  prefix: string;
  address_range_prefixes: string[];
  address_range_start?: string;
  address_range_stop?: string;
  domain_search: string[];
  lease_time: DHCPv6LeaseTime;
  name_servers: string[];
  nis_domain?: string;
  nisplus_domain?: string;
  sip_servers: string[];
  sntp_servers: string[];
  static_mappings: DHCPv6StaticMapping[];
}

export interface DHCPv6SharedNetwork {
  name: string;
  subnets: DHCPv6Subnet[];
}

export interface DHCPv6ServerConfig {
  preference?: number;
  shared_networks: DHCPv6SharedNetwork[];
}

export interface DHCPv6ServerCapabilities {
  version: string;
  instance_name?: string;
  instance_id?: string;
  fields: Record<string, { supported: boolean; description: string }>;
}

export interface DHCPv6ServerBatchOperation {
  op: string;
  value?: string;
}

export interface DHCPv6ServerBatchRequest {
  item_name: string;
  operations: DHCPv6ServerBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}
