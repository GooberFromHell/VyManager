export type JobStatus = "queued" | "running" | "success" | "partial" | "failed" | "cancelled";

export interface BackgroundJob {
  job_id: string;
  trigger_id: string;
  job_type: string;
  instance_id: string;
  instance_name: string;
  site_id: string;
  site_name: string;
  user_id: string;
  status: JobStatus;
  progress: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  result: InstanceBackupResult | null;
  log: string[];
  error: string | null;
  cancel_requested: boolean;
}

export interface TriggerBackupResponse {
  trigger_id: string;
  job_ids: string[];
}

export interface VolumeBackupData {
  volume_name: string;
  source_path: string;
  size_bytes: number | null;
  data_base64: string | null;
  error: string | null;
}

export interface ContainerImageManifest {
  container_name: string;
  image_ref: string;
  image_digest: string | null;
  image_archive_path: string | null;
  error: string | null;
}

export interface ContainerRuntimeStatus {
  container_name: string;
  running: boolean;
  exit_code: number | null;
  uptime_seconds: number | null;
}

export interface ContainerFullBackup {
  container_name: string;
  config_commands: string;
  volumes: VolumeBackupData[];
  image_manifest: ContainerImageManifest;
  runtime_status: ContainerRuntimeStatus | null;
}

export interface InstanceBackupResult {
  instance_id: string;
  instance_name: string;
  host: string;
  vyos_version: string | null;
  status: string;
  config: Record<string, unknown> | null;
  config_commands: string | null;
  error: string | null;
  backed_up_at: string | null;
  containers: ContainerFullBackup[] | null;
  container_backup_errors: string[];
}

export interface RestoreStepResult {
  step: string;
  success: boolean;
  message: string;
  error: string | null;
}

export interface ContainerRestoreResponse {
  success: boolean;
  container_name: string;
  steps: RestoreStepResult[];
}

export interface TriggerGroup {
  trigger_id: string;
  site_name: string;
  created_at: string;
  jobs: BackgroundJob[];
}
