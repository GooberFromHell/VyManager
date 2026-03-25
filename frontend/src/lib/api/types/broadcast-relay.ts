/**
 * TypeScript types for Broadcast Relay Service API
 */

export interface BroadcastRelayInstance {
  id: string;
  description: string | null;
  interfaces: string[];
  address: string | null;
  port: string | null;
  disabled: boolean;
}

export interface BroadcastRelayConfig {
  relays: BroadcastRelayInstance[];
}

export interface BroadcastRelayCapabilities {
  version: string;
  instance_name: string;
  instance_id: string;
  fields: {
    description: { supported: boolean; description: string };
    interface: { supported: boolean; description: string };
    address: { supported: boolean; description: string };
    port: { supported: boolean; description: string };
    disable: { supported: boolean; description: string };
  };
}

export interface BroadcastRelayBatchOperation {
  op: string;
  value?: string;
}

export interface BroadcastRelayBatchRequest {
  item_name?: string;
  operations: BroadcastRelayBatchOperation[];
}
