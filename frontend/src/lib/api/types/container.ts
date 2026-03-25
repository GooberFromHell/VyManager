/**
 * TypeScript types for Container API
 */

// ============================================================================
// Container Configuration Types
// ============================================================================

export interface ContainerPort {
  name: string;
  source: string | null;
  destination: string | null;
  protocol: string;
}

export interface ContainerVolume {
  name: string;
  source: string | null;
  destination: string | null;
  mode: string;
}

export interface ContainerEnvironment {
  key: string;
  value: string;
}

export interface ContainerLabel {
  key: string;
  value: string;
}

export interface ContainerDevice {
  name: string;
  source: string | null;
  destination: string | null;
}

export interface ContainerSysctl {
  parameter: string;
  value: string;
}

export interface ContainerTmpfs {
  name: string;
  destination: string | null;
  size: number | null;
}

export interface ContainerEntry {
  name: string;
  image: string | null;
  networks: string[];
  network_addresses: Record<string, string>;
  ports: ContainerPort[];
  volumes: ContainerVolume[];
  environment: ContainerEnvironment[];
  labels: ContainerLabel[];
  devices: ContainerDevice[];
  capabilities: string[];
  restart: string | null;
  memory: number | null;
  cpu_quota: string | null;
  description: string | null;
  host_name: string | null;
  entrypoint: string | null;
  command: string | null;
  arguments: string | null;
  uid: number | null;
  gid: number | null;
  allow_host_networks: boolean;
  allow_host_pid: boolean;
  disabled: boolean;
  name_servers: string[];
  log_driver: string | null;
  sysctls: ContainerSysctl[];
  tmpfs_mounts: ContainerTmpfs[];
}

export interface ContainerNetwork {
  name: string;
  prefixes: string[];
  description: string | null;
  mtu: number | null;
  vrf: string | null;
  no_name_server: boolean;
}

export interface ContainerRegistry {
  url: string;
  username: string | null;
  password: string | null;
  disabled: boolean;
  insecure: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ContainerConfig {
  containers: ContainerEntry[];
  networks: ContainerNetwork[];
  registries: ContainerRegistry[];
}

export interface ContainerFieldCapability {
  supported: boolean;
  description: string;
}

export interface ContainerCapabilities {
  version: string;
  instance_name?: string;
  instance_id?: string;
  has_log_driver: boolean;
  has_sysctl: boolean;
  has_tmpfs: boolean;
  has_network_no_name_server: boolean;
  capability_keyword: string;
  fields: {
    container: { supported: boolean; description?: string };
    network: { supported: boolean; description?: string };
    registry: { supported: boolean; description?: string };
    log_driver: ContainerFieldCapability;
    sysctl: ContainerFieldCapability;
    tmpfs: ContainerFieldCapability;
    network_no_name_server: ContainerFieldCapability;
  };
}

// ============================================================================
// Batch Operation Types
// ============================================================================

export interface ContainerBatchOperation {
  op: string;
  value?: string;
}

export interface ContainerBatchRequest {
  item_name: string;
  operations: ContainerBatchOperation[];
}
