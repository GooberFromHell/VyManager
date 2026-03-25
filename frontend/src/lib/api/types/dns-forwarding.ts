/**
 * TypeScript types for DNS Forwarding API
 */

export interface DNSDomainServer {
  address: string;
}

export interface DNSDomain {
  name: string;
  servers: DNSDomainServer[];
  addnta: boolean;
  recursion_desired: boolean;
}

export interface DNSForwardingConfig {
  listen_addresses: string[];
  allow_from: string[];
  name_servers: string[];
  domains: DNSDomain[];
  cache_size: number;
  no_serve_rfc1918: boolean;
  use_system_nameservers: boolean;
  dnssec: string;
  ignore_hosts_file: boolean;
}

export interface DNSForwardingFieldCapability {
  supported: boolean;
  description: string;
}

export interface DNSForwardingCapabilities {
  version: string;
  device_name?: string;
  fields: {
    listen_address: DNSForwardingFieldCapability;
    allow_from: DNSForwardingFieldCapability;
    name_server: DNSForwardingFieldCapability;
    domain: DNSForwardingFieldCapability;
    cache_size: DNSForwardingFieldCapability;
    no_serve_rfc1918: DNSForwardingFieldCapability;
    system: DNSForwardingFieldCapability;
    dnssec: DNSForwardingFieldCapability;
    ignore_hosts_file: DNSForwardingFieldCapability;
  };
}

export interface DNSForwardingBatchOperation {
  op: string;
  value?: string;
}

export interface DNSForwardingBatchRequest {
  domain_name?: string;
  operations: DNSForwardingBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}
