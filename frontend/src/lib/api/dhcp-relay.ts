/**
 * DHCP Relay Service API
 */

import { apiClient } from "./client";
import type {
  DHCPRelayConfig,
  DHCPRelayCapabilities,
  DHCPRelayBatchRequest,
  DHCPRelayBatchOperation,
} from "./types/dhcp-relay";
import type { VyOSResponse } from "../types/api";

class DHCPRelayService {
  async getCapabilities(): Promise<DHCPRelayCapabilities> {
    return apiClient.get<DHCPRelayCapabilities>("/vyos/dhcp-relay/capabilities");
  }

  async getConfig(): Promise<DHCPRelayConfig> {
    return apiClient.get<DHCPRelayConfig>("/vyos/dhcp-relay/config");
  }

  async batchConfigure(request: DHCPRelayBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/dhcp-relay/batch", request);
  }

  async addServer(address: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: address,
      operations: [{ op: "set_server" }],
    });
  }

  async deleteServer(address: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: address,
      operations: [{ op: "delete_server" }],
    });
  }

  async addInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: name,
      operations: [{ op: "set_interface" }],
    });
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: name,
      operations: [{ op: "delete_interface" }],
    });
  }

  async updateRelayOptions(operations: DHCPRelayBatchOperation[]): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: "_",
      operations,
    });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const dhcpRelayService = new DHCPRelayService();
