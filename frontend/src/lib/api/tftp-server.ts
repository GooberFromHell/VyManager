/**
 * TFTP Server Service API
 */

import { apiClient } from "./client";
import type {
  TFTPServerConfig,
  TFTPServerCapabilities,
  TFTPServerBatchRequest,
  TFTPServerBatchOperation,
} from "./types/tftp-server";
import type { VyOSResponse } from "../types/api";

class TFTPServerService {
  async getCapabilities(): Promise<TFTPServerCapabilities> {
    return apiClient.get<TFTPServerCapabilities>("/vyos/tftp-server/capabilities");
  }

  async getConfig(refresh?: boolean): Promise<TFTPServerConfig> {
    const params = refresh ? { refresh: "true" } : undefined;
    return apiClient.get<TFTPServerConfig>("/vyos/tftp-server/config", params);
  }

  async batchConfigure(request: TFTPServerBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/tftp-server/batch", request);
  }

  async updateSettings(
    operations: TFTPServerBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({ operations });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const tftpServerService = new TFTPServerService();
