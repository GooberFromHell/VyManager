// DHCP Relay Types

export interface DHCPRelayRelayOptions {
  hop_count?: number;
  max_size?: number;
  relay_agents_packets?: string;
}

export interface DHCPRelayConfig {
  servers: string[];
  interfaces: string[];
  relay_options: DHCPRelayRelayOptions;
  listen_addresses: string[];
}

export interface DHCPRelayCapabilities {
  version: string;
  has_listen_address: boolean;
  instance_name?: string;
  instance_id?: string;
  fields: Record<string, { supported: boolean; description: string }>;
}

export interface DHCPRelayBatchOperation {
  op: string;
  value?: string;
}

export interface DHCPRelayBatchRequest {
  item_name: string;
  operations: DHCPRelayBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}
