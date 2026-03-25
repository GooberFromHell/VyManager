/**
 * Router Advertisement API Service
 */

import { apiClient } from "./client";
import type {
  RouterAdvertConfig,
  RouterAdvertCapabilities,
  RouterAdvertBatchRequest,
  RouterAdvertBatchOperation,
} from "./types/router-advert";
import type { VyOSResponse } from "../types/api";

class RouterAdvertService {
  async getCapabilities(): Promise<RouterAdvertCapabilities> {
    return apiClient.get<RouterAdvertCapabilities>(
      "/vyos/router-advert/capabilities"
    );
  }

  async getConfig(): Promise<RouterAdvertConfig> {
    return apiClient.get<RouterAdvertConfig>("/vyos/router-advert/config");
  }

  async batchConfigure(
    request: RouterAdvertBatchRequest
  ): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/router-advert/batch", request);
  }

  async addInterface(
    iface: string,
    operations: RouterAdvertBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({ item_name: iface, operations });
  }

  async updateInterface(
    iface: string,
    operations: RouterAdvertBatchOperation[]
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

export const routerAdvertService = new RouterAdvertService();
