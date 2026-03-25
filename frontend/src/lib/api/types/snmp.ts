// SNMP Types

export interface SNMPCommunity {
  name: string;
  authorization?: string;
  clients: string[];
  networks: string[];
}

export interface SNMPListenAddress {
  address: string;
  port?: number;
}

export interface SNMPTrapTarget {
  address: string;
  community?: string;
  port?: number;
}

export interface SNMPv3Group {
  name: string;
  mode?: string;
  seclevel?: string;
  view?: string;
}

export interface SNMPv3User {
  name: string;
  auth_type?: string;
  privacy_type?: string;
  group?: string;
  mode?: string;
  engineid?: string;
}

export interface SNMPv3View {
  name: string;
  oids: string[];
}

export interface SNMPv3Config {
  engineid?: string;
  groups: SNMPv3Group[];
  users: SNMPv3User[];
  views: SNMPv3View[];
  trap_targets: SNMPTrapTarget[];
}

export interface SNMPConfig {
  communities: SNMPCommunity[];
  contact?: string;
  description?: string;
  listen_addresses: SNMPListenAddress[];
  location?: string;
  trap_source?: string;
  trap_targets: SNMPTrapTarget[];
  v3: SNMPv3Config;
}

export interface SNMPCapabilities {
  version: string;
  instance_name?: string;
  instance_id?: string;
  fields: Record<string, { supported: boolean; description: string }>;
}

export interface SNMPBatchOperation {
  op: string;
  value?: string;
}

export interface SNMPBatchRequest {
  item_name: string;
  operations: SNMPBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}
