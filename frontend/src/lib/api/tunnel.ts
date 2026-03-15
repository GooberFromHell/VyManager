/**
 * Tunnel Interface API Service
 */

import { apiClient } from "./client";
import type {
  TunnelConfigResponse,
  TunnelCapabilities,
  BatchRequest,
  VyOSResponse,
  BatchOperation,
} from "./types/tunnel";

class TunnelService {
  async getCapabilities(): Promise<TunnelCapabilities> {
    return apiClient.get<TunnelCapabilities>("/vyos/tunnel/capabilities");
  }

  async getConfig(): Promise<TunnelConfigResponse> {
    return apiClient.get<TunnelConfigResponse>("/vyos/tunnel/config");
  }

  async batchConfigure(request: BatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/tunnel/batch", request);
  }

  async createInterface(
    interfaceName: string,
    operations: BatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations,
    });
  }

  async updateInterface(
    interfaceName: string,
    operations: BatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations,
    });
  }

  async deleteInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "delete_interface" }],
    });
  }

  async enableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "enable" }],
    });
  }

  async disableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "disable" }],
    });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const tunnelService = new TunnelService();
