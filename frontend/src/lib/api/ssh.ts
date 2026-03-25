/**
 * SSH Service API Service
 */

import { apiClient } from "./client";
import type {
  SSHConfig,
  SSHCapabilities,
  SSHBatchRequest,
  SSHBatchOperation,
} from "./types/ssh";
import type { VyOSResponse } from "../types/api";

class SSHService {
  async getCapabilities(): Promise<SSHCapabilities> {
    return apiClient.get<SSHCapabilities>("/vyos/ssh/capabilities");
  }

  async getConfig(refresh?: boolean): Promise<SSHConfig> {
    const params = refresh ? { refresh: "true" } : undefined;
    return apiClient.get<SSHConfig>("/vyos/ssh/config", params);
  }

  async batchConfigure(request: SSHBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/ssh/batch", request);
  }

  async updateSettings(operations: SSHBatchOperation[]): Promise<VyOSResponse> {
    return this.batchConfigure({ operations });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const sshService = new SSHService();
