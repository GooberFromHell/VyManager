/**
 * DNS Forwarding API Service
 */

import { apiClient } from "./client";
import type {
  DNSForwardingConfig,
  DNSForwardingCapabilities,
  DNSForwardingBatchRequest,
  DNSForwardingBatchOperation,
  VyOSResponse,
} from "./types/dns-forwarding";

class DNSForwardingService {
  async getCapabilities(): Promise<DNSForwardingCapabilities> {
    return apiClient.get<DNSForwardingCapabilities>(
      "/vyos/dns-forwarding/capabilities"
    );
  }

  async getConfig(): Promise<DNSForwardingConfig> {
    return apiClient.get<DNSForwardingConfig>("/vyos/dns-forwarding/config");
  }

  async batchConfigure(
    request: DNSForwardingBatchRequest
  ): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/dns-forwarding/batch", request);
  }

  async updateGlobalSettings(config: {
    listen_addresses?: string[];
    allow_from?: string[];
    name_servers?: string[];
    cache_size?: number;
    no_serve_rfc1918?: boolean;
    use_system_nameservers?: boolean;
    dnssec?: string;
    ignore_hosts_file?: boolean;
    delete_listen_addresses?: string[];
    delete_allow_from?: string[];
    delete_name_servers?: string[];
    delete_cache_size?: boolean;
  }): Promise<VyOSResponse> {
    const operations: DNSForwardingBatchOperation[] = [];

    // Set operations for list values
    if (config.listen_addresses) {
      for (const addr of config.listen_addresses) {
        operations.push({ op: "set_listen_address", value: addr });
      }
    }
    if (config.allow_from) {
      for (const network of config.allow_from) {
        operations.push({ op: "set_allow_from", value: network });
      }
    }
    if (config.name_servers) {
      for (const server of config.name_servers) {
        operations.push({ op: "set_name_server", value: server });
      }
    }

    // Set scalar values
    if (config.cache_size !== undefined) {
      operations.push({
        op: "set_cache_size",
        value: config.cache_size.toString(),
      });
    }
    if (config.no_serve_rfc1918 !== undefined) {
      operations.push({
        op: config.no_serve_rfc1918
          ? "set_no_serve_rfc1918"
          : "delete_no_serve_rfc1918",
      });
    }
    if (config.use_system_nameservers !== undefined) {
      operations.push({
        op: config.use_system_nameservers
          ? "set_system"
          : "delete_system",
      });
    }
    if (config.dnssec !== undefined) {
      operations.push({ op: "set_dnssec", value: config.dnssec });
    }
    if (config.ignore_hosts_file !== undefined) {
      operations.push({
        op: config.ignore_hosts_file
          ? "set_ignore_hosts_file"
          : "delete_ignore_hosts_file",
      });
    }

    // Delete operations for list values
    if (config.delete_listen_addresses) {
      for (const addr of config.delete_listen_addresses) {
        operations.push({ op: "delete_listen_address", value: addr });
      }
    }
    if (config.delete_allow_from) {
      for (const network of config.delete_allow_from) {
        operations.push({ op: "delete_allow_from", value: network });
      }
    }
    if (config.delete_name_servers) {
      for (const server of config.delete_name_servers) {
        operations.push({ op: "delete_name_server", value: server });
      }
    }
    if (config.delete_cache_size) {
      operations.push({ op: "delete_cache_size" });
    }

    return this.batchConfigure({ operations });
  }

  async createDomain(
    name: string,
    servers: string[],
    addnta?: boolean,
    recursion_desired?: boolean
  ): Promise<VyOSResponse> {
    const operations: DNSForwardingBatchOperation[] = [];

    for (const server of servers) {
      operations.push({ op: "set_domain_server", value: server });
    }
    if (addnta) {
      operations.push({ op: "set_domain_addnta" });
    }
    if (recursion_desired) {
      operations.push({ op: "set_domain_recursion_desired" });
    }

    return this.batchConfigure({ domain_name: name, operations });
  }

  async updateDomain(
    name: string,
    servers?: string[],
    addnta?: boolean,
    recursion_desired?: boolean
  ): Promise<VyOSResponse> {
    const operations: DNSForwardingBatchOperation[] = [];

    if (servers) {
      for (const server of servers) {
        operations.push({ op: "set_domain_server", value: server });
      }
    }
    if (addnta !== undefined) {
      operations.push({
        op: addnta ? "set_domain_addnta" : "delete_domain_addnta",
      });
    }
    if (recursion_desired !== undefined) {
      operations.push({
        op: recursion_desired
          ? "set_domain_recursion_desired"
          : "delete_domain_recursion_desired",
      });
    }

    return this.batchConfigure({ domain_name: name, operations });
  }

  async deleteDomain(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      domain_name: name,
      operations: [{ op: "delete_domain" }],
    });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const dnsForwardingService = new DNSForwardingService();
