/**
 * TypeScript types for TFTP Server Service API
 */

export interface TFTPServerConfig {
  directory: string | null;
  listen_addresses: string[];
  port: string | null;
  allow_upload: boolean | null;
}

export interface TFTPServerCapabilities {
  version: string;
  instance_name: string;
  instance_id: string;
  has_allow_upload: boolean;
  fields: {
    directory: { supported: boolean; description: string };
    listen_address: { supported: boolean; description: string };
    port: { supported: boolean; description: string };
    allow_upload: { supported: boolean; description: string };
  };
}

export interface TFTPServerBatchOperation {
  op: string;
  value?: string;
}

export interface TFTPServerBatchRequest {
  item_name?: string;
  operations: TFTPServerBatchOperation[];
}
