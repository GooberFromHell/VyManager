/**
 * TypeScript types for Router Advertisement API
 */

export interface RouterAdvertPrefix {
  prefix: string;
  autonomous_flag: boolean | null;
  on_link_flag: boolean | null;
  preferred_lifetime: string | null;
  valid_lifetime: string | null;
}

export interface RouterAdvertRoute {
  prefix: string;
  lifetime: string | null;
  preference: string | null;
}

export interface RouterAdvertInterface {
  name: string;
  prefixes: RouterAdvertPrefix[];
  name_servers: string[];
  cur_hop_limit: string | null;
  default_lifetime: string | null;
  default_preference: string | null;
  link_mtu: string | null;
  managed_flag: boolean;
  other_config_flag: boolean;
  send_advert: boolean | null;
  interval_max: string | null;
  interval_min: string | null;
  reachable_time: string | null;
  retrans_timer: string | null;
  dnssl: string[];
  routes: RouterAdvertRoute[];
}

export interface RouterAdvertConfig {
  interfaces: RouterAdvertInterface[];
}

export interface RouterAdvertCapabilities {
  version: string;
  instance_name: string;
  instance_id: string;
  has_dnssl: boolean;
  has_route: boolean;
  has_send_advert_bool: boolean;
  fields: Record<string, { supported: boolean; description: string }>;
}

export interface RouterAdvertBatchOperation {
  op: string;
  value?: string;
}

export interface RouterAdvertBatchRequest {
  item_name?: string;
  operations: RouterAdvertBatchOperation[];
}
