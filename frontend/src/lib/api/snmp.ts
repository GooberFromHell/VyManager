/**
 * SNMP Service API
 */

import { apiClient } from "./client";
import type {
  SNMPConfig,
  SNMPCapabilities,
  SNMPBatchRequest,
  SNMPBatchOperation,
} from "./types/snmp";
import type { VyOSResponse } from "../types/api";

class SNMPService {
  async getCapabilities(): Promise<SNMPCapabilities> {
    return apiClient.get<SNMPCapabilities>("/vyos/snmp/capabilities");
  }

  async getConfig(): Promise<SNMPConfig> {
    return apiClient.get<SNMPConfig>("/vyos/snmp/config");
  }

  async batchConfigure(request: SNMPBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/snmp/batch", request);
  }

  async createCommunity(
    communityName: string,
    operations: SNMPBatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: communityName,
      operations,
    });
  }

  async deleteCommunity(communityName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: communityName,
      operations: [{ op: "delete_community" }],
    });
  }

  async updateSettings(operations: SNMPBatchOperation[]): Promise<VyOSResponse> {
    return this.batchConfigure({
      item_name: "_",
      operations,
    });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const snmpService = new SNMPService();
