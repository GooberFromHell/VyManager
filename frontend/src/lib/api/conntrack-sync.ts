/**
 * Conntrack Sync Service API Service
 */

import { apiClient } from "./client";
import type {
  ConntrackSyncConfig,
  ConntrackSyncCapabilities,
  ConntrackSyncBatchRequest,
  ConntrackSyncBatchOperation,
} from "./types/conntrack-sync";
import type { VyOSResponse } from "../types/api";

class ConntrackSyncService {
  async getCapabilities(): Promise<ConntrackSyncCapabilities> {
    return apiClient.get<ConntrackSyncCapabilities>(
      "/vyos/conntrack-sync/capabilities"
    );
  }

  async getConfig(refresh?: boolean): Promise<ConntrackSyncConfig> {
    const params = refresh ? { refresh: "true" } : undefined;
    const response = await apiClient.get<{ data: ConntrackSyncConfig }>(
      "/vyos/conntrack-sync/config",
      params
    );
    return response.data;
  }

  async batchConfigure(
    request: ConntrackSyncBatchRequest
  ): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/conntrack-sync/batch", request);
  }

  async updateSettings(
    operations: ConntrackSyncBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({ operations });
  }

  async addInterface(
    iface: string,
    operations: ConntrackSyncBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({ item_name: iface, operations });
  }

  async deleteInterface(iface: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: iface,
      operations: [{ op: "delete_interface" }],
    });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const conntrackSyncService = new ConntrackSyncService();
