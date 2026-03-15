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
   * Create a new VXLAN interface
   */
  async createInterface(
    interfaceName: string,
    operations: BatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations,
    });
  }

  /**
   * Update an existing VXLAN interface
   */
  async updateInterface(
    interfaceName: string,
    operations: BatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations,
    });
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
   * Enable an interface
   */
  async enableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "enable" }],
    });
  }

  /**
   * Disable an interface
   */
  async disableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "disable" }],
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
