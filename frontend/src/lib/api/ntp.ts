/**
 * NTP Service API
 */

import { apiClient } from "./client";
import type {
  NTPConfig,
  NTPCapabilities,
  NTPBatchRequest,
  NTPBatchOperation,
} from "./types/ntp";
import type { VyOSResponse } from "../types/api";

class NTPService {
  async getCapabilities(): Promise<NTPCapabilities> {
    return apiClient.get<NTPCapabilities>("/vyos/ntp/capabilities");
  }

  async getConfig(): Promise<NTPConfig> {
    return apiClient.get<NTPConfig>("/vyos/ntp/config");
  }

  async batchConfigure(request: NTPBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/ntp/batch", request);
  }

  async createItem(
    serverAddress: string,
    operations: NTPBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      server_address: serverAddress,
      operations,
    });
  }

  async updateItem(
    serverAddress: string,
    operations: NTPBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      server_address: serverAddress,
      operations,
    });
  }

  async deleteItem(serverAddress: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      server_address: serverAddress,
      operations: [{ op: "delete_server" }],
    });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const ntpService = new NTPService();
