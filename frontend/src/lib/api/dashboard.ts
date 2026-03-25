import { apiClient } from "./client";
import { VyOSResponse } from "@/lib/types/api";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface DashboardCard {
  id: string;
  type: string; // "interface-statistics", etc.
  column: number; // 0-11 in 12-column grid
  position: number; // row position within grid
  span?: number; // how many columns this card spans (3, 4, 6, 8, or 12) - defaults to 4
  height?: number; // row height multiplier (1, 2, or 3) - defaults to 2
  config?: Record<string, any>; // card-specific configuration
}

export interface DashboardLayout {
  cards: DashboardCard[];
}

export interface DashboardLayoutResponse {
  layout: DashboardLayout | null;
  exists: boolean;
}

// ============================================================================
// API Service
// ============================================================================

class DashboardService {
  /**
   * Get the user's dashboard layout for the current instance
   */
  async getLayout(): Promise<DashboardLayoutResponse> {
    return apiClient.get<DashboardLayoutResponse>("/dashboard/layout");
  }

  /**
   * Save the user's dashboard layout
   */
  async saveLayout(layout: DashboardLayout): Promise<VyOSResponse> {
    return apiClient.post("/dashboard/layout", { layout });
  }
}

export const dashboardService = new DashboardService();
