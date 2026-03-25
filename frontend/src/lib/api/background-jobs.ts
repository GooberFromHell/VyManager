import { apiClient } from "./client";
import type {
  BackgroundJob,
  TriggerBackupResponse,
  ContainerRestoreResponse,
  ContainerFullBackup,
} from "./types/background-jobs";

class BackgroundJobsService {
  async listJobs(opts?: { siteId?: string; triggerId?: string }): Promise<BackgroundJob[]> {
    const params: Record<string, string> = {};
    if (opts?.siteId) params.site_id = opts.siteId;
    if (opts?.triggerId) params.trigger_id = opts.triggerId;
    return apiClient.get<BackgroundJob[]>("/session/jobs", params);
  }

  async getJob(jobId: string): Promise<BackgroundJob> {
    return apiClient.get<BackgroundJob>(`/session/jobs/${jobId}`);
  }

  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/session/jobs/${jobId}`);
  }

  async downloadJobBackup(jobId: string, instanceName: string): Promise<void> {
    const response = await fetch(`/api/session/jobs/${jobId}/download`, {
      credentials: "include",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Download failed" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${instanceName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async triggerSiteBackup(siteId: string): Promise<TriggerBackupResponse> {
    return apiClient.post<TriggerBackupResponse>(`/session/sites/${siteId}/backup`);
  }

  async restoreContainer(
    siteId: string,
    instanceId: string,
    container: ContainerFullBackup,
  ): Promise<ContainerRestoreResponse> {
    return apiClient.post<ContainerRestoreResponse>(
      `/session/sites/${siteId}/instances/${instanceId}/container-restore`,
      { container },
    );
  }
}

export const backgroundJobsService = new BackgroundJobsService();
