// LLDP Types

export interface LLDPInterface {
  name: string;
  disabled: boolean;
  location_elin?: string;
}

export interface LLDPConfig {
  interfaces: LLDPInterface[];
  snmp_enabled: boolean;
  legacy_protocols: string[];
  management_addresses: string[];
}

export interface LLDPCapabilities {
  version: string;
  has_legacy_protocols: boolean;
  has_management_address: boolean;
  instance_name?: string;
  instance_id?: string;
  fields: Record<string, { supported: boolean; description: string }>;
}

export interface LLDPBatchOperation {
  op: string;
  value?: string;
}

export interface LLDPBatchRequest {
  item_name: string;
  operations: LLDPBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}
