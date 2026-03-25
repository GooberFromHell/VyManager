/**
 * DHCPv6 Server Service API
 */

import { apiClient } from "./client";
import type {
  DHCPv6ServerConfig,
  DHCPv6ServerCapabilities,
  DHCPv6ServerBatchRequest,
  DHCPv6ServerBatchOperation,
} from "./types/dhcpv6-server";
import type { VyOSResponse } from "../types/api";

class DHCPv6ServerService {
  async getCapabilities(): Promise<DHCPv6ServerCapabilities> {
    return apiClient.get<DHCPv6ServerCapabilities>("/vyos/dhcpv6-server/capabilities");
  }

  async getConfig(): Promise<DHCPv6ServerConfig> {
    return apiClient.get<DHCPv6ServerConfig>("/vyos/dhcpv6-server/config");
  }

  async batchConfigure(request: DHCPv6ServerBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/dhcpv6-server/batch", request);
  }

  async createSharedNetwork(
    networkName: string,
    operations: DHCPv6ServerBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: networkName,
      operations,
    });
  }

  async deleteSharedNetwork(networkName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: networkName,
      operations: [{ op: "delete_shared_network" }],
    });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const dhcpv6ServerService = new DHCPv6ServerService();
