# Frontend Architecture Specification Output — VyOS Services Phase 1

## Services Page Layout Decision

**Recommendation: Sidebar navigation (Option B)**

With 11+ services planned, a top-level tab bar would become unwieldy and require horizontal scrolling or wrapping. The sidebar pattern (used by `static-failover/layout.tsx`) scales well, provides room for descriptions, and groups services visually. Each service gets its own child route under `/system/services/[service]`.

### Layout Structure

```
┌──────────────────┬──────────────────────────────────────┐
│ DNS Forwarding   │                                      │
│ NTP              │  Selected service management UI      │
│ SSH              │  (loaded via child route)             │
│ ─────────────    │                                      │
│ DHCP (future)    │                                      │
│ DHCP Relay       │                                      │
│ LLDP             │                                      │
│ SNMP             │                                      │
│ ...              │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### File Structure

```
frontend/src/app/(default)/(app)/system/services/
  layout.tsx           ← Sidebar layout (like static-failover/layout.tsx)
  page.tsx             ← Redirect to first available service
  dns-forwarding/
    page.tsx           ← DNS Forwarding service page
  ntp/
    page.tsx           ← NTP service page
  ssh/
    page.tsx           ← SSH service page

frontend/src/components/services/
  dns-forwarding/
    CreateDNSForwardingDomainModal.tsx
    EditDNSForwardingModal.tsx
    DeleteDNSForwardingDomainModal.tsx
  ntp/
    CreateNTPServerModal.tsx
    EditNTPSettingsModal.tsx
    DeleteNTPServerModal.tsx
  ssh/
    EditSSHSettingsModal.tsx

frontend/src/lib/api/
  dns-forwarding.ts
  ntp.ts
  ssh.ts

frontend/src/lib/api/types/
  dns-forwarding.ts
  ntp.ts
  ssh.ts
```

### Sidebar Layout Implementation (`layout.tsx`)

Follows the `static-failover/layout.tsx` pattern exactly:

```tsx
// Services available in the sidebar
const allServices = [
  {
    id: "dns-forwarding",
    name: "DNS Forwarding",
    description: "Forward DNS queries to upstream servers",
    icon: Globe,
    href: "/system/services/dns-forwarding",
    permission: FeatureGroup.DNS_FORWARDING,
  },
  {
    id: "ntp",
    name: "NTP",
    description: "Network Time Protocol server",
    icon: Clock,
    href: "/system/services/ntp",
    permission: FeatureGroup.NTP,
  },
  {
    id: "ssh",
    name: "SSH",
    description: "Secure Shell access configuration",
    icon: Terminal,
    href: "/system/services/ssh",
    permission: FeatureGroup.SSH,
  },
];
```

- Uses `usePermissions()` to filter services by `canRead(service.permission)`
- Redirects to first visible service if on base `/system/services` path
- Header icon: `Server` with title "Services" and subtitle "Manage VyOS services"

### Sidebar Navigation Update

The main `Sidebar.tsx` navigation needs to change the "System" entry from a single link to a collapsible group, or the existing "System" link at `/system/settings` should remain and a new "Services" sidebar entry is added. Given the current pattern where "System" is a single link to `/system/settings`, the simplest approach is:

Add "Services" as a new top-level sidebar entry (or as a child under a "System" collapsible):

```tsx
{
  title: "Services",
  href: "/system/services",
  icon: Server,  // or Cog
  requiredPermission: FeatureGroup.SERVICES,  // parent group
}
```

Alternatively, if keeping current structure, convert "System" to a collapsible:
```tsx
{
  title: "System",
  icon: Server,
  children: [
    { title: "Settings", href: "/system/settings", requiredPermission: FeatureGroup.SYSTEM },
    { title: "Services", href: "/system/services", requiredPermission: FeatureGroup.DNS_FORWARDING },
    // Show "Services" if user can read ANY service feature
  ],
}
```

**Recommendation:** Convert "System" to a collapsible with "Settings" and "Services" children. The permission check for "Services" should show if the user has READ access to any of `DNS_FORWARDING`, `NTP`, or `SSH`.

### New FeatureGroups Required

Add to both `frontend/src/lib/api/user-management.ts` and `backend/rbac_permissions.py`:

```typescript
// Services
DNS_FORWARDING = "DNS_FORWARDING",
NTP = "NTP",
SSH = "SSH",
```

---

## DNS Forwarding Frontend Spec

### Types (`frontend/src/lib/api/types/dns-forwarding.ts`)

```typescript
// Individual domain forwarding entry
export interface DNSDomainServer {
  address: string;
}

export interface DNSDomain {
  name: string;           // e.g., "example.com"
  servers: DNSDomainServer[];
  addnta: boolean;        // Add NTA (Negative Trust Anchor) for this domain
  recursion_desired: boolean;
}

// Main configuration response
export interface DNSForwardingConfig {
  listen_addresses: string[];       // Addresses the service listens on
  allow_from: string[];             // Networks allowed to query (CIDR)
  name_servers: string[];           // Upstream DNS server addresses
  domains: DNSDomain[];             // Domain-specific forwarding rules
  cache_size: number;               // DNS cache size (default: 10000)
  no_serve_rfc1918: boolean;        // Block private IP reverse lookups
  use_system_nameservers: boolean;  // Also use system name-server entries
  dnssec: string;                   // "auto" | "off" | "on"
  ignore_hosts_file: boolean;
}

// Capabilities response
export interface DNSForwardingFieldCapability {
  supported: boolean;
  description: string;
}

export interface DNSForwardingCapabilities {
  version: string;
  device_name?: string;
  fields: {
    listen_address: DNSForwardingFieldCapability;
    allow_from: DNSForwardingFieldCapability;
    name_server: DNSForwardingFieldCapability;
    domain: DNSForwardingFieldCapability;
    cache_size: DNSForwardingFieldCapability;
    no_serve_rfc1918: DNSForwardingFieldCapability;
    system: DNSForwardingFieldCapability;
    dnssec: DNSForwardingFieldCapability;
    ignore_hosts_file: DNSForwardingFieldCapability;
  };
}

// Batch operations
export interface DNSForwardingBatchOperation {
  op: string;
  value?: string;
}

export interface DNSForwardingBatchRequest {
  domain_name?: string;      // For domain-specific operations
  operations: DNSForwardingBatchOperation[];
}
```

### API Service (`frontend/src/lib/api/dns-forwarding.ts`)

```typescript
class DNSForwardingService {
  // Standard endpoints
  async getCapabilities(): Promise<DNSForwardingCapabilities>;
  async getConfig(refresh?: boolean): Promise<DNSForwardingConfig>;
  async refreshConfig(): Promise<VyOSResponse>;

  // Batch operations
  async batchConfigure(request: DNSForwardingBatchRequest): Promise<VyOSResponse>;

  // Convenience methods (build operations internally)
  async updateGlobalSettings(config: {
    listen_addresses?: string[];
    allow_from?: string[];
    name_servers?: string[];
    cache_size?: number;
    no_serve_rfc1918?: boolean;
    use_system_nameservers?: boolean;
    dnssec?: string;
    ignore_hosts_file?: boolean;
    // delete flags
    delete_listen_addresses?: string[];
    delete_allow_from?: string[];
    delete_name_servers?: string[];
    delete_cache_size?: boolean;
  }): Promise<VyOSResponse>;

  async createDomain(
    name: string,
    servers: string[],
    addnta?: boolean,
    recursion_desired?: boolean
  ): Promise<VyOSResponse>;

  async updateDomain(
    name: string,
    servers?: string[],
    addnta?: boolean,
    recursion_desired?: boolean
  ): Promise<VyOSResponse>;

  async deleteDomain(name: string): Promise<VyOSResponse>;
}

export const dnsForwardingService = new DNSForwardingService();
```

**Endpoint mappings:**
| Method | Endpoint |
|--------|----------|
| `getCapabilities()` | `GET /vyos/dns-forwarding/capabilities` |
| `getConfig()` | `GET /vyos/dns-forwarding/config` |
| `batchConfigure()` | `POST /vyos/dns-forwarding/batch` |
| `refreshConfig()` | `POST /vyos/config/refresh` |

### Components (`frontend/src/components/services/dns-forwarding/`)

#### 1. `EditDNSForwardingModal.tsx`

**Purpose:** Edit global DNS forwarding settings (listen addresses, allow-from networks, upstream servers, cache size, options).

**Props:**
```typescript
interface EditDNSForwardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: DNSForwardingConfig;
  capabilities: DNSForwardingCapabilities | null;
}
```

**Form fields:**
- Listen Addresses (multi-value IP input, add/remove)
- Allow From Networks (multi-value CIDR input, add/remove)
- Upstream Name Servers (multi-value IP input, add/remove)
- Cache Size (number input, default 10000)
- DNSSEC (select: auto / off / on)
- No Serve RFC1918 (checkbox)
- Use System Nameservers (checkbox)
- Ignore Hosts File (checkbox)

**Validation:**
- Listen addresses: valid IPv4/IPv6
- Allow-from: valid CIDR notation
- Name servers: valid IPv4/IPv6
- Cache size: positive integer

#### 2. `CreateDNSForwardingDomainModal.tsx`

**Purpose:** Add a new domain-specific forwarding rule.

**Props:**
```typescript
interface CreateDNSForwardingDomainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: DNSForwardingCapabilities | null;
  existingDomains: string[];  // To prevent duplicates
}
```

**Form fields:**
- Domain Name (text input, e.g., "example.com")
- DNS Servers (multi-value IP input, at least 1 required)
- ADDNTA — Add Negative Trust Anchor (checkbox)
- Recursion Desired (checkbox)

**Validation:**
- Domain: valid domain name, not already existing
- Servers: at least one valid IP address

#### 3. `DeleteDNSForwardingDomainModal.tsx`

**Purpose:** Confirm deletion of a domain forwarding rule.

**Props:**
```typescript
interface DeleteDNSForwardingDomainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  domainName: string;
}
```

Standard delete confirmation pattern (same as `DeleteDHCPModal`).

### Page Layout (`dns-forwarding/page.tsx`)

```
┌─────────────────────────────────────────────────────────┐
│ DNS Forwarding                          [Edit] [Refresh]│
│ Configure DNS forwarding service                        │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────────┐ │
│ │ Global Settings     │ │ Upstream Servers             │ │
│ │ Listen: 10.0.0.1    │ │ 8.8.8.8                     │ │
│ │ Cache: 10000        │ │ 1.1.1.1                     │ │
│ │ DNSSEC: auto        │ │                              │ │
│ │ RFC1918: No         │ │                              │ │
│ │ System NS: Yes      │ │                              │ │
│ └─────────────────────┘ └─────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Allow From Networks                                 │ │
│ │ 10.0.0.0/8, 192.168.0.0/16                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Domain Forwarding Rules                     [+ Add]     │
│ ┌────────────┬──────────────┬───────┬────────┬────────┐ │
│ │ Domain     │ Servers      │ ADDNTA│ Recurs │ Actions│ │
│ ├────────────┼──────────────┼───────┼────────┼────────┤ │
│ │ example.com│ 10.1.1.53    │  Yes  │  No    │ [E][D] │ │
│ │ corp.local │ 10.2.2.53    │  No   │  Yes   │ [E][D] │ │
│ └────────────┴──────────────┴───────┴────────┴────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Layout details:**
- Top section: Summary cards showing global settings and upstream servers (read-only display)
- "Edit" button opens `EditDNSForwardingModal` for global settings
- "Allow From" displayed as badge list
- Bottom section: Domain forwarding table with create/edit/delete actions
- Permission check: `canWrite(FeatureGroup.DNS_FORWARDING)` to show action buttons
- Loading state: `LoadingSpinner` component
- Error state: destructive alert box
- Empty state: info message with "Configure DNS Forwarding" button

---

## NTP Frontend Spec

### Types (`frontend/src/lib/api/types/ntp.ts`)

```typescript
// NTP server entry
export interface NTPServer {
  address: string;       // Server hostname or IP
  noselect: boolean;     // Mark as noselect
  prefer: boolean;       // Mark as preferred
  pool: boolean;         // Treat as pool (multiple servers)
}

// Main configuration response
export interface NTPConfig {
  servers: NTPServer[];
  listen_addresses: string[];
  allow_clients: string[];      // Networks allowed to query (CIDR)
  vrf?: string;
}

// Capabilities response
export interface NTPFieldCapability {
  supported: boolean;
  description: string;
}

export interface NTPCapabilities {
  version: string;
  device_name?: string;
  fields: {
    server: NTPFieldCapability;
    listen_address: NTPFieldCapability;
    allow_client: NTPFieldCapability;
    vrf: NTPFieldCapability;
    noselect: NTPFieldCapability;
    prefer: NTPFieldCapability;
    pool: NTPFieldCapability;
  };
}

// Batch operations
export interface NTPBatchOperation {
  op: string;
  value?: string;
}

export interface NTPBatchRequest {
  server_address?: string;
  operations: NTPBatchOperation[];
}
```

### API Service (`frontend/src/lib/api/ntp.ts`)

```typescript
class NTPService {
  async getCapabilities(): Promise<NTPCapabilities>;
  async getConfig(refresh?: boolean): Promise<NTPConfig>;
  async refreshConfig(): Promise<VyOSResponse>;
  async batchConfigure(request: NTPBatchRequest): Promise<VyOSResponse>;

  // Convenience methods
  async addServer(
    address: string,
    options?: { noselect?: boolean; prefer?: boolean; pool?: boolean }
  ): Promise<VyOSResponse>;

  async updateServer(
    address: string,
    options: { noselect?: boolean; prefer?: boolean; pool?: boolean }
  ): Promise<VyOSResponse>;

  async deleteServer(address: string): Promise<VyOSResponse>;

  async updateSettings(config: {
    listen_addresses?: string[];
    allow_clients?: string[];
    vrf?: string;
    delete_listen_addresses?: string[];
    delete_allow_clients?: string[];
    delete_vrf?: boolean;
  }): Promise<VyOSResponse>;
}

export const ntpService = new NTPService();
```

**Endpoint mappings:**
| Method | Endpoint |
|--------|----------|
| `getCapabilities()` | `GET /vyos/ntp/capabilities` |
| `getConfig()` | `GET /vyos/ntp/config` |
| `batchConfigure()` | `POST /vyos/ntp/batch` |
| `refreshConfig()` | `POST /vyos/config/refresh` |

### Components (`frontend/src/components/services/ntp/`)

#### 1. `CreateNTPServerModal.tsx`

**Purpose:** Add a new NTP server.

**Props:**
```typescript
interface CreateNTPServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: NTPCapabilities | null;
  existingServers: string[];  // Prevent duplicates
}
```

**Form fields:**
- Server Address (text input — hostname or IP)
- Pool (checkbox — treat as pool)
- Prefer (checkbox — mark as preferred)
- Noselect (checkbox — mark as noselect)

**Validation:**
- Address: valid hostname or IPv4/IPv6 address, not already existing
- Pool and Prefer are mutually informational (VyOS allows both but it's unusual)

#### 2. `EditNTPSettingsModal.tsx`

**Purpose:** Edit NTP global settings (listen addresses, allowed clients, VRF).

**Props:**
```typescript
interface EditNTPSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: NTPConfig;
  capabilities: NTPCapabilities | null;
}
```

**Form fields:**
- Listen Addresses (multi-value IP input)
- Allow Clients (multi-value CIDR input)
- VRF (text input, optional)

**Validation:**
- Listen addresses: valid IPv4/IPv6
- Allow clients: valid CIDR notation

#### 3. `DeleteNTPServerModal.tsx`

**Purpose:** Confirm deletion of an NTP server.

**Props:**
```typescript
interface DeleteNTPServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  serverAddress: string;
}
```

Standard delete confirmation pattern.

### Page Layout (`ntp/page.tsx`)

```
┌─────────────────────────────────────────────────────────┐
│ NTP                                     [Edit] [Refresh]│
│ Network Time Protocol server configuration              │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Settings                                            │ │
│ │ Listen: 0.0.0.0        VRF: (none)                  │ │
│ │ Allowed Clients: 10.0.0.0/8, 192.168.0.0/16        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ NTP Servers                                 [+ Add]     │
│ ┌──────────────────┬──────┬────────┬──────────┬───────┐ │
│ │ Server           │ Pool │ Prefer │ Noselect │Actions│ │
│ ├──────────────────┼──────┼────────┼──────────┼───────┤ │
│ │ 0.pool.ntp.org   │ Yes  │  No    │   No     │[E][D] │ │
│ │ 1.pool.ntp.org   │ Yes  │  No    │   No     │[E][D] │ │
│ │ time.google.com  │ No   │  Yes   │   No     │[E][D] │ │
│ └──────────────────┴──────┴────────┴──────────┴───────┘ │
└─────────────────────────────────────────────────────────┘
```

**Layout details:**
- Top: Settings card showing listen addresses, allowed clients, VRF (read-only)
- "Edit" button opens `EditNTPSettingsModal` for global settings
- Bottom: NTP servers table with pool/prefer/noselect badges
- Each server row has edit (pencil) and delete (trash) action buttons
- Edit on a server row opens a small inline edit or modal to toggle pool/prefer/noselect
- Permission check: `canWrite(FeatureGroup.NTP)` for action buttons
- Empty state: "No NTP servers configured" with "Add Server" button

---

## SSH Frontend Spec

### Types (`frontend/src/lib/api/types/ssh.ts`)

```typescript
// SSH configuration response
export interface SSHConfig {
  port: number;                          // Default: 22
  listen_addresses: string[];
  disable_password_authentication: boolean;
  disable_host_validation: boolean;
  loglevel: string;                      // "INFO" | "DEBUG" | "VERBOSE" | "QUIET" | etc.
  client_keepalive_interval: number;     // Seconds
  ciphers: string[];
  key_exchange: string[];
  mac: string[];
  access_control: {
    allow_users: string[];
    deny_users: string[];
  };
  vrf?: string;
}

// Capabilities response
export interface SSHFieldCapability {
  supported: boolean;
  description: string;
}

export interface SSHCapabilities {
  version: string;
  device_name?: string;
  fields: {
    port: SSHFieldCapability;
    listen_address: SSHFieldCapability;
    disable_password_authentication: SSHFieldCapability;
    disable_host_validation: SSHFieldCapability;
    loglevel: SSHFieldCapability;
    client_keepalive_interval: SSHFieldCapability;
    ciphers: SSHFieldCapability;
    key_exchange: SSHFieldCapability;
    mac: SSHFieldCapability;
    access_control: SSHFieldCapability;
    vrf: SSHFieldCapability;
  };
  available_ciphers: string[];
  available_key_exchanges: string[];
  available_macs: string[];
  available_loglevels: string[];
}

// Batch operations
export interface SSHBatchOperation {
  op: string;
  value?: string;
}

export interface SSHBatchRequest {
  operations: SSHBatchOperation[];
}
```

### API Service (`frontend/src/lib/api/ssh.ts`)

```typescript
class SSHService {
  async getCapabilities(): Promise<SSHCapabilities>;
  async getConfig(refresh?: boolean): Promise<SSHConfig>;
  async refreshConfig(): Promise<VyOSResponse>;
  async batchConfigure(request: SSHBatchRequest): Promise<VyOSResponse>;

  // Convenience method for updating all SSH settings at once
  async updateSettings(config: {
    port?: number;
    listen_addresses?: string[];
    disable_password_authentication?: boolean;
    disable_host_validation?: boolean;
    loglevel?: string;
    client_keepalive_interval?: number;
    ciphers?: string[];
    key_exchange?: string[];
    mac?: string[];
    allow_users?: string[];
    deny_users?: string[];
    vrf?: string;
    // delete flags
    delete_port?: boolean;
    delete_listen_addresses?: string[];
    delete_loglevel?: boolean;
    delete_client_keepalive_interval?: boolean;
    delete_ciphers?: string[];
    delete_key_exchange?: string[];
    delete_mac?: string[];
    delete_allow_users?: string[];
    delete_deny_users?: string[];
    delete_vrf?: boolean;
  }): Promise<VyOSResponse>;
}

export const sshService = new SSHService();
```

**Endpoint mappings:**
| Method | Endpoint |
|--------|----------|
| `getCapabilities()` | `GET /vyos/ssh/capabilities` |
| `getConfig()` | `GET /vyos/ssh/config` |
| `batchConfigure()` | `POST /vyos/ssh/batch` |
| `refreshConfig()` | `POST /vyos/config/refresh` |

### Components (`frontend/src/components/services/ssh/`)

#### 1. `EditSSHSettingsModal.tsx`

**Purpose:** Edit all SSH settings. SSH is a single-instance service (no create/delete of multiple items), so it uses one comprehensive edit modal.

**Props:**
```typescript
interface EditSSHSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: SSHConfig;
  capabilities: SSHCapabilities | null;
}
```

**Form fields organized into tabs within the modal:**

**Tab 1: General**
- Port (number input, 1-65535, default 22)
- Listen Addresses (multi-value IP input)
- VRF (text input, optional)
- Log Level (select from available_loglevels)
- Client Keepalive Interval (number input, seconds)

**Tab 2: Authentication**
- Disable Password Authentication (checkbox)
- Disable Host Validation (checkbox)
- Allowed Users (multi-value text input)
- Denied Users (multi-value text input)

**Tab 3: Cryptography**
- Ciphers (multi-select from available_ciphers)
- Key Exchange Algorithms (multi-select from available_key_exchanges)
- MAC Algorithms (multi-select from available_macs)

**Validation:**
- Port: integer 1-65535
- Listen addresses: valid IPv4/IPv6
- Users: non-empty strings
- At least keep default crypto options if clearing

### Page Layout (`ssh/page.tsx`)

SSH is a single-config service (not a list of items), so it uses a form/card layout similar to `system/settings`:

```
┌─────────────────────────────────────────────────────────┐
│ SSH                                     [Edit] [Refresh]│
│ Secure Shell access configuration                       │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌────────────────────────────┐ │
│ │ General              │ │ Authentication             │ │
│ │ Port: 22             │ │ Password Auth: Enabled     │ │
│ │ Listen: 0.0.0.0      │ │ Host Validation: Enabled   │ │
│ │ Log Level: INFO       │ │                            │ │
│ │ Keepalive: 60s        │ │ Allowed Users:             │ │
│ │ VRF: (none)           │ │   vyos, admin              │ │
│ └──────────────────────┘ │ Denied Users:              │ │
│                          │   (none)                    │ │
│ ┌──────────────────────┐ └────────────────────────────┘ │
│ │ Cryptography         │                                │
│ │ Ciphers:             │                                │
│ │   aes256-gcm@...     │                                │
│ │   chacha20-poly...   │                                │
│ │ Key Exchange:        │                                │
│ │   curve25519-sha256  │                                │
│ │ MACs:                │                                │
│ │   hmac-sha2-256-etm  │                                │
│ └──────────────────────┘                                │
└─────────────────────────────────────────────────────────┘
```

**Layout details:**
- Three info cards: General, Authentication, Cryptography
- All displayed as read-only cards showing current configuration
- Single "Edit" button in header opens `EditSSHSettingsModal`
- Crypto values shown as badge lists
- Permission check: `canWrite(FeatureGroup.SSH)` for the Edit button
- Empty/unconfigured state: "SSH service not configured" with setup prompt

---

## Common Patterns

### Modal Submission Pattern

All modals follow this pattern (matching existing DHCP modals):

```typescript
const handleSubmit = async () => {
  setLoading(true);
  setError(null);
  try {
    // 1. Build operations
    const operations = buildOperations(formState);
    // 2. Call API (refreshConfig is called internally by batchConfigure)
    await service.batchConfigure({ operations });
    // 3. Close modal and trigger parent refresh
    onOpenChange(false);
    onSuccess();
  } catch (err) {
    setError((err as ApiError).message || "Operation failed");
  } finally {
    setLoading(false);
  }
};
```

### Page Data Loading Pattern

```typescript
const loadData = async () => {
  try {
    setError(null);
    const [configData, capabilitiesData] = await Promise.all([
      service.getConfig(),
      service.getCapabilities(),
    ]);
    setConfig(configData);
    setCapabilities(capabilitiesData);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to load configuration");
  } finally {
    setLoading(false);
  }
};
```

### Permission Checks

```typescript
const { canRead, canWrite, isLoading: permissionsLoading } = usePermissions();
const isReadOnly = !canWrite(FeatureGroup.DNS_FORWARDING); // per-service

// Hide action buttons when read-only
{!isReadOnly && (
  <Button onClick={() => setEditOpen(true)}>
    <Pencil className="h-4 w-4 mr-2" /> Edit
  </Button>
)}
```

### Multi-Value Input Pattern

For fields like listen addresses, name servers, etc., reuse the pattern from DHCP modals:

```tsx
// Array of values with add/remove buttons
{values.map((value, index) => (
  <div key={index} className="flex gap-2">
    <Input
      value={value}
      onChange={(e) => updateValue(index, e.target.value)}
      placeholder="Enter value..."
    />
    <Button variant="ghost" size="icon" onClick={() => removeValue(index)}>
      <X className="h-4 w-4" />
    </Button>
  </div>
))}
<Button variant="outline" size="sm" onClick={addValue}>
  <Plus className="h-4 w-4 mr-1" /> Add
</Button>
```

### Batch Operations Summary

Each service's `batchConfigure()` method internally calls `refreshConfig()` after success (matching DHCP pattern). The convenience methods (e.g., `updateGlobalSettings`, `addServer`) build the operations array and delegate to `batchConfigure()`.

---

## Implementation Order

1. **Types files** — Define all TypeScript interfaces first
2. **API service files** — Implement service classes with endpoint mappings
3. **Services layout** — Convert `system/services/page.tsx` to sidebar layout
4. **SSH page + modal** — Simplest service (single-config, one modal)
5. **NTP page + modals** — Medium complexity (server list + settings)
6. **DNS Forwarding page + modals** — Most complex (global settings + domain table)
7. **Sidebar navigation update** — Add "Services" entry to main sidebar
8. **FeatureGroup additions** — Add DNS_FORWARDING, NTP, SSH to both frontend and backend enums
