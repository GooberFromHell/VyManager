/**
 * VXLAN Interface API Service
 */

import { apiClient } from "./client";
import type {
  VxlanConfigResponse,
  VxlanCapabilities,
  BatchRequest,
  VyOSResponse,
  BatchOperation,
} from "./types/vxlan";

class VxlanService {
  /**
   * Get VXLAN interface capabilities based on VyOS version
   */
  async getCapabilities(): Promise<VxlanCapabilities> {
    return apiClient.get<VxlanCapabilities>("/vyos/vxlan/capabilities");
  }

  /**
   * Get all VXLAN interface configurations
   */
  async getConfig(): Promise<VxlanConfigResponse> {
    return apiClient.get<VxlanConfigResponse>("/vyos/vxlan/config");
  }

  /**
   * Configure VXLAN interface using batch operations
   */
  async batchConfigure(request: BatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/vxlan/batch", request);
  }

  /**
   * Delete a VXLAN interface
   */
  async deleteInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "delete_interface" }],
    });
  }

  /**
   * Refresh the configuration cache
   */
  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const vxlanService = new VxlanService();
