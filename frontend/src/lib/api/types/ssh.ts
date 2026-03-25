/**
 * TypeScript types for SSH Service API
 */

export interface SSHAccessControl {
  allow_users: string[];
  deny_users: string[];
  allow_groups: string[];
  deny_groups: string[];
}

export interface SSHDynamicProtection {
  enabled: boolean;
  allow_from: string[];
  block_time: string | null;
  detect_time: string | null;
  threshold: string | null;
}

export interface SSHConfig {
  port: string | null;
  listen_addresses: string[];
  ciphers: string[];
  key_exchange: string[];
  mac: string[];
  disable_password_authentication: boolean;
  disable_host_validation: boolean;
  loglevel: string | null;
  client_keepalive_interval: string | null;
  vrf: string | null;
  access_control: SSHAccessControl;
  dynamic_protection: SSHDynamicProtection;
}

export interface SSHFieldCapability {
  supported: boolean;
  description: string;
}

export interface SSHCapabilities {
  version: string;
  cipher_key: string;
  has_fido: boolean;
  has_pubkey_accepted_algorithm: boolean;
  has_trusted_user_ca: boolean;
  instance_name?: string;
  instance_id?: string;
  fields: {
    port: SSHFieldCapability;
    listen_addresses: SSHFieldCapability;
    ciphers: SSHFieldCapability;
    key_exchange: SSHFieldCapability;
    mac: SSHFieldCapability;
    disable_password_authentication: SSHFieldCapability;
    disable_host_validation: SSHFieldCapability;
    loglevel: SSHFieldCapability;
    client_keepalive_interval: SSHFieldCapability;
    access_control: SSHFieldCapability;
    dynamic_protection: SSHFieldCapability;
    vrf: SSHFieldCapability;
    fido: SSHFieldCapability;
    pubkey_accepted_algorithm: SSHFieldCapability;
    trusted_user_ca: SSHFieldCapability;
  };
}

export interface SSHBatchOperation {
  op: string;
  value?: string;
}

export interface SSHBatchRequest {
  operations: SSHBatchOperation[];
}
