/**
 * Container Service API
 */

import { apiClient } from "./client";
import type {
  ContainerConfig,
  ContainerCapabilities,
  ContainerBatchRequest,
  ContainerBatchOperation,
} from "./types/container";
import type { VyOSResponse } from "../types/api";

class ContainerService {
  // ========================================================================
  // Core API Methods
  // ========================================================================

  async getCapabilities(): Promise<ContainerCapabilities> {
    return apiClient.get<ContainerCapabilities>("/vyos/container/capabilities");
  }

  async getConfig(): Promise<ContainerConfig> {
    return apiClient.get<ContainerConfig>("/vyos/container/config");
  }

  async batchConfigure(request: ContainerBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/container/batch", request);
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }

  // ========================================================================
  // Container Convenience Methods
  // ========================================================================

  async createContainer(
    name: string,
    operations: ContainerBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({ item_name: name, operations });
  }

  async updateContainer(
    name: string,
    operations: ContainerBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({ item_name: name, operations });
  }

  async deleteContainer(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: name,
      operations: [{ op: "delete_container" }],
    });
  }

  // ========================================================================
  // Container Network Convenience Methods
  // ========================================================================

  async createNetwork(
    name: string,
    operations: ContainerBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({ item_name: name, operations });
  }

  async updateNetwork(
    name: string,
    operations: ContainerBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({ item_name: name, operations });
  }

  async deleteNetwork(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: name,
      operations: [{ op: "delete_network" }],
    });
  }

  // ========================================================================
  // Container Registry Convenience Methods
  // ========================================================================

  async createRegistry(
    url: string,
    operations: ContainerBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({ item_name: url, operations });
  }

  async updateRegistry(
    url: string,
    operations: ContainerBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({ item_name: url, operations });
  }

  async deleteRegistry(url: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: url,
      operations: [{ op: "delete_registry" }],
    });
  }
}

export const containerService = new ContainerService();
