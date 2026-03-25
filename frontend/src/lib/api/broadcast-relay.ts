/**
 * Broadcast Relay Service API
 */

import { apiClient } from "./client";
import type {
  BroadcastRelayConfig,
  BroadcastRelayCapabilities,
  BroadcastRelayBatchRequest,
  BroadcastRelayBatchOperation,
} from "./types/broadcast-relay";
import type { VyOSResponse } from "../types/api";

class BroadcastRelayService {
  async getCapabilities(): Promise<BroadcastRelayCapabilities> {
    return apiClient.get<BroadcastRelayCapabilities>(
      "/vyos/broadcast-relay/capabilities"
    );
  }

  async getConfig(): Promise<BroadcastRelayConfig> {
    return apiClient.get<BroadcastRelayConfig>("/vyos/broadcast-relay/config");
  }

  async batchConfigure(
    request: BroadcastRelayBatchRequest
  ): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/broadcast-relay/batch", request);
  }

  async createRelay(
    id: string,
    operations: BroadcastRelayBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: id,
      operations,
    });
  }

  async updateRelay(
    id: string,
    operations: BroadcastRelayBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: id,
      operations,
    });
  }

  async deleteRelay(id: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: id,
      operations: [{ op: "delete_id" }],
    });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const broadcastRelayService = new BroadcastRelayService();
