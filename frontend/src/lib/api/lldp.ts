/**
 * LLDP Service API
 */

import { apiClient } from "./client";
import type {
  LLDPConfig,
  LLDPCapabilities,
  LLDPBatchRequest,
  LLDPBatchOperation,
} from "./types/lldp";
import type { VyOSResponse } from "../types/api";

class LLDPService {
  async getCapabilities(): Promise<LLDPCapabilities> {
    return apiClient.get<LLDPCapabilities>("/vyos/lldp/capabilities");
  }

  async getConfig(): Promise<LLDPConfig> {
    return apiClient.get<LLDPConfig>("/vyos/lldp/config");
  }

  async batchConfigure(request: LLDPBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/lldp/batch", request);
  }

  async addInterface(name: string, operations: LLDPBatchOperation[] = []): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: name,
      operations: [{ op: "set_interface" }, ...operations],
    });
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: name,
      operations: [{ op: "delete_interface" }],
    });
  }

  async updateSettings(operations: LLDPBatchOperation[]): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: "_",
      operations,
    });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const lldpService = new LLDPService();
