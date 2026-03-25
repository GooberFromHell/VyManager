/**
 * TypeScript types for NTP Service API
 */

// NTP server entry
export interface NTPServer {
  address: string; // Server hostname or IP
  noselect: boolean; // Mark as noselect
  prefer: boolean; // Mark as preferred
  pool: boolean; // Treat as pool (multiple servers)
}

// Main configuration response
export interface NTPConfig {
  servers: NTPServer[];
  listen_addresses: string[];
  allow_clients: string[]; // Networks allowed to query (CIDR)
  vrf?: string;
}

// Capabilities response
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

// Batch operations
export interface NTPBatchOperation {
  op: string;
  value?: string;
}

export interface NTPBatchRequest {
  server_address?: string;
  operations: NTPBatchOperation[];
}
