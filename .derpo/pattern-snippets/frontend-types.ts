// Canonical Frontend Types Pattern
// Source: frontend/src/lib/api/types/ntp.ts
// Used by DERPO agents as the reference implementation for new feature types.

// --- Config interface (mirrors backend response) ---

export interface NTPServer {
  address: string;
  noselect: boolean;
  prefer: boolean;
  pool: boolean;
}

export interface NTPConfig {
  servers: NTPServer[];
  listen_addresses: string[];
  allow_clients: string[];
  vrf?: string;
}

// --- Capabilities interface ---
// Every field has { supported: boolean; description: string }

export interface NTPFieldCapability {
  supported: boolean;
  description: string;
}

export interface NTPCapabilities {
  version: string;
  device_name?: string;
  fields: {
    server: NTPFieldCapability;
    listen_address: NTPFieldCapability;
    allow_client: NTPFieldCapability;
    vrf: NTPFieldCapability;
    noselect: NTPFieldCapability;
    prefer: NTPFieldCapability;
    pool: NTPFieldCapability;
  };
}

// --- Batch operation interfaces ---

export interface NTPBatchOperation {
  op: string;
  value?: string;
}

export interface NTPBatchRequest {
  server_address?: string;
  operations: NTPBatchOperation[];
}
