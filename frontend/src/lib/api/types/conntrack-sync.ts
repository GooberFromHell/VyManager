/**
 * TypeScript types for Conntrack Sync Service API
 */

export interface ConntrackSyncInterface {
  name: string;
  port: string | null;
}

export interface ConntrackSyncFailoverMechanism {
  type: "vrrp" | "cluster";
  sync_group: string | null;
  cluster_group: string | null;
}

export interface ConntrackSyncConfig {
  accept_protocols: string[];
  disable_external_cache: boolean;
  expect_sync: string[];
  failover_mechanism: ConntrackSyncFailoverMechanism | null;
  interfaces: ConntrackSyncInterface[];
  listen_addresses: string[];
  mcast_group: string | null;
  event_listen_queue_size: string | null;
  sync_queue_size: string | null;
  startup_resync: boolean | null;
}

export interface ConntrackSyncCapabilities {
  version: string;
  instance_name: string;
  instance_id: string;
  has_cluster: boolean;
  has_listen_address: boolean;
  has_event_listen_queue_size: boolean;
  has_sync_queue_size: boolean;
  has_startup_resync: boolean;
  fields: Record<string, { supported: boolean; description: string }>;
}

export interface ConntrackSyncBatchOperation {
  op: string;
  value?: string;
}

export interface ConntrackSyncBatchRequest {
  item_name?: string;
  operations: ConntrackSyncBatchOperation[];
}
