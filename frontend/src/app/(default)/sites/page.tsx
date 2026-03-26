"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Search,
  ChevronRight,
  Server,
  MoreVertical,
  Pencil,
  Trash2,
  LogOut,
  User,
  Download,
  Upload,
  LayoutGrid,
  Table,
  KeyRound,
  Layers,
  Network,
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { Site, Instance, InstanceStatus, sessionService } from "@/lib/api/session";
import { useSessionStore } from "@/store/session-store";
import { InstanceCard } from "@/components/sites/InstanceCard";
import { InstanceTableView } from "@/components/sites/InstanceTableView";
import { CreateSiteModal } from "@/components/sites/CreateSiteModal";
import { EditSiteModal } from "@/components/sites/EditSiteModal";
import { DeleteSiteModal } from "@/components/sites/DeleteSiteModal";
import { CreateInstanceModal } from "@/components/sites/CreateInstanceModal";
import { EditInstanceModal } from "@/components/sites/EditInstanceModal";
import { MoveInstanceModal } from "@/components/sites/MoveInstanceModal";
import { DeleteInstanceModal } from "@/components/sites/DeleteInstanceModal";
import { ImportCSVModal } from "@/components/session/ImportCSVModal";
import { SiteToolsSection } from "@/components/sites/SiteToolsSection";
import { UserManagement } from "@/components/user-management/UserManagement";
import { AuthenticationSettings } from "@/components/authentication/AuthenticationSettings";
import { ManagementView } from "@/components/management/ManagementView";
import { useJobPolling } from "@/hooks/useJobPolling";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/types/api";

type NavSection = "sites" | "user-management" | "authentication" | "management";

export default function SitesPage() {
  const router = useRouter();

  // Auth session
  const { data: session } = useSession();

  // Zustand store
  const { activeSession, loadSession, connectToInstance, disconnectFromInstance } =
    useSessionStore();

  // Navigation state
  const [selectedSection, setSelectedSection] = useState<NavSection>("sites");
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  // Local state
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [instanceSearchQuery, setInstanceSearchQuery] = useState("");
  const [instanceViewMode, setInstanceViewMode] = useState<"cards" | "table">("cards");

  // Instance state
  const [instances, setInstances] = useState<Instance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [instanceStatuses, setInstanceStatuses] = useState<Record<string, InstanceStatus>>({});
  const [statusLoading, setStatusLoading] = useState(false);

  // Modal states
  const [createSiteOpen, setCreateSiteOpen] = useState(false);
  const [editSiteOpen, setEditSiteOpen] = useState(false);
  const [deleteSiteOpen, setDeleteSiteOpen] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState<Site | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [instanceCount, setInstanceCount] = useState(0);

  // Instance modals
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false);
  const [editInstanceOpen, setEditInstanceOpen] = useState(false);
  const [moveInstanceOpen, setMoveInstanceOpen] = useState(false);
  const [deleteInstanceOpen, setDeleteInstanceOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);

  // CSV import/export
  const [importCSVOpen, setImportCSVOpen] = useState(false);

  // Job polling for Management badge
  const { runningCount } = useJobPolling({ enabled: true, pollInterval: 10000 });

  useEffect(() => {
    loadData();
  }, []);

  // Auto-select first site when sites load
  useEffect(() => {
    if (sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0]);
    }
  }, [sites, selectedSite]);

  // Load instances when site is selected
  useEffect(() => {
    if (selectedSite) {
      setInstanceStatuses({});
      loadInstances(selectedSite.id);
    } else {
      setInstances([]);
      setInstanceStatuses({});
    }
  }, [selectedSite]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sitesData] = await Promise.all([
        sessionService.listSites(),
        loadSession(),
      ]);
      setSites(sitesData);
    } catch (err) {
      setError((err as ApiError).message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const checkStatuses = useCallback(async (siteId: string) => {
    setStatusLoading(true);
    try {
      const statuses = await sessionService.checkSiteStatus(siteId);
      const statusMap: Record<string, InstanceStatus> = {};
      statuses.forEach((s) => {
        statusMap[s.instance_id] = s;
      });
      setInstanceStatuses(statusMap);
    } catch (err) {
      console.error("Failed to check instance statuses:", err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadInstances = async (siteId: string) => {
    setInstancesLoading(true);
    try {
      const data = await sessionService.listInstances(siteId);
      setInstances(data);
      checkStatuses(siteId);
    } catch (err) {
      console.error("Error loading instances:", err);
      setInstances([]);
    } finally {
      setInstancesLoading(false);
    }
  };

  const handleConnect = async (instanceId: string) => {
    await connectToInstance(instanceId);
    // Redirect to dashboard on successful connection
    router.push("/");
    // Note: If connection fails, error will propagate to InstanceCard component
  };

  const handleDisconnect = async () => {
    await disconnectFromInstance();
  };

  const handleEditSite = (site: Site) => {
    setSiteToEdit(site);
    setEditSiteOpen(true);
  };

  const handleDeleteSite = async (site: Site) => {
    // Count instances for this site
    try {
      const instances = await sessionService.listInstances(site.id);
      setInstanceCount(instances.length);
    } catch {
      setInstanceCount(0);
    }
    setSiteToDelete(site);
    setDeleteSiteOpen(true);
  };

  const handleLogout = async () => {
    // Disconnect from instance before logging out to clean up active_sessions
    if (activeSession) {
      try {
        await disconnectFromInstance();
      } catch (err) {
        // Continue with logout even if disconnect fails
        console.error("Failed to disconnect from instance:", err);
      }
    }
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const handleEditInstance = (instance: Instance) => {
    setSelectedInstance(instance);
    setEditInstanceOpen(true);
  };

  const handleMoveInstance = (instance: Instance) => {
    setSelectedInstance(instance);
    setMoveInstanceOpen(true);
  };

  const handleDeleteInstance = (instance: Instance) => {
    setSelectedInstance(instance);
    setDeleteInstanceOpen(true);
  };

  const handleSiteSuccess = () => {
    loadData();
  };

  const handleInstanceSuccess = () => {
    if (selectedSite) {
      loadInstances(selectedSite.id);
    }
    loadSession();
  };

  const handleExportCSV = async () => {
    try {
      await sessionService.exportCSV();
    } catch (err) {
      console.error("Export failed:", err);
      setError((err as ApiError).message || "Failed to export CSV");
    }
  };

  const handleImportSuccess = () => {
    loadData();
  };

  const filteredSites = sites.filter((site) => {
    const query = searchQuery.toLowerCase();
    return (
      site.name.toLowerCase().includes(query) ||
      site.description?.toLowerCase().includes(query)
    );
  });

  const filteredInstances = instances.filter((instance) => {
    const query = instanceSearchQuery.toLowerCase();
    return (
      instance.name.toLowerCase().includes(query) ||
      instance.host.toLowerCase().includes(query) ||
      instance.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Navigation */}
      <div className="w-64 border-r border-border bg-card flex flex-col h-full">
        <div className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center">
              <Image
                src="/vy-icon.png"
                alt="VyOS Logo"
                width={32}
                height={32}
                className="object-contain"
                loader={({ src }) => src}
              />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Site Manager</h2>
            </div>
          </div>
        </div>

        <Separator />

        {/* Navigation Items */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 py-2">
            {/* Sites */}
            <button
              onClick={() => setSelectedSection("sites")}
              className={cn(
                "w-full text-left rounded-lg px-3 py-2 transition-all duration-200 ease-[var(--ease-out-quart)]",
                selectedSection === "sites"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "hover:bg-accent/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-md p-1.5",
                  selectedSection === "sites" ? "bg-primary/10" : "bg-muted"
                )}>
                  <Building2 className={cn(
                    "h-4 w-4",
                    selectedSection === "sites" ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className="font-medium text-sm">Sites</span>
                {selectedSection === "sites" && (
                  <ChevronRight className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>
            </button>

            {/* User Management */}
            <button
              onClick={() => setSelectedSection("user-management")}
              className={cn(
                "w-full text-left rounded-lg px-3 py-2 transition-all duration-200 ease-[var(--ease-out-quart)]",
                selectedSection === "user-management"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "hover:bg-accent/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-md p-1.5",
                  selectedSection === "user-management" ? "bg-primary/10" : "bg-muted"
                )}>
                  <Users className={cn(
                    "h-4 w-4",
                    selectedSection === "user-management" ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className="font-medium text-sm">User Management</span>
                {selectedSection === "user-management" && (
                  <ChevronRight className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>
            </button>

            {/* Authentication */}
            <button
              onClick={() => setSelectedSection("authentication")}
              className={cn(
                "w-full text-left rounded-lg px-3 py-2 transition-all duration-200 ease-[var(--ease-out-quart)]",
                selectedSection === "authentication"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "hover:bg-accent/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-md p-1.5",
                  selectedSection === "authentication" ? "bg-primary/10" : "bg-muted"
                )}>
                  <KeyRound className={cn(
                    "h-4 w-4",
                    selectedSection === "authentication" ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className="font-medium text-sm">Authentication</span>
                {selectedSection === "authentication" && (
                  <ChevronRight className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>
            </button>

            {/* Management */}
            <button
              onClick={() => setSelectedSection("management")}
              className={cn(
                "w-full text-left rounded-lg px-3 py-2 transition-all duration-200 ease-[var(--ease-out-quart)]",
                selectedSection === "management"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "hover:bg-accent/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-md p-1.5",
                  selectedSection === "management" ? "bg-primary/10" : "bg-muted"
                )}>
                  <Layers className={cn(
                    "h-4 w-4",
                    selectedSection === "management" ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className="font-medium text-sm">Management</span>
                {runningCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pulse px-1">
                    {runningCount}
                  </span>
                )}
                {selectedSection === "management" && runningCount === 0 && (
                  <ChevronRight className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>
            </button>
          </div>
        </ScrollArea>

        {/* User Info & Logout */}
        <div className="border-t border-border p-3">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {session?.user?.name || session?.user?.email || "User"}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-center gap-2 text-xs"
              size="sm"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Middle Submenu - Site List */}
      {selectedSection === "sites" && (
        <div className="w-72 shrink-0 border-r border-border bg-card flex flex-col h-full overflow-hidden">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Sites</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sites.length} {sites.length === 1 ? "site" : "sites"}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={loadData}
                disabled={loading}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sites..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Add Site Button */}
            <Button
              className="w-full mt-3 gap-2"
              onClick={() => setCreateSiteOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Site
            </Button>

            {/* Import/Export Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setImportCSVOpen(true)}
              >
                <Upload className="h-3 w-3" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExportCSV}
              >
                <Download className="h-3 w-3" />
                Export
              </Button>
            </div>
          </div>

          <Separator />

          {/* Site List */}
          <ScrollArea className="flex-1 px-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="p-4">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to load sites</span>
                </div>
              </div>
            ) : filteredSites.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No sites found" : "No sites yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-1 py-2">
                {filteredSites.map((site) => (
                  <div
                    key={site.id}
                    className={cn(
                      "w-full rounded-lg transition-all duration-200 ease-[var(--ease-out-quart)] relative group",
                      selectedSite?.id === site.id
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <button
                      onClick={() => setSelectedSite(site)}
                      className="w-full text-left px-3 py-2 pr-10"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-0.5 rounded-md p-1.5",
                          selectedSite?.id === site.id ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Building2 className={cn(
                            "h-4 w-4",
                            selectedSite?.id === site.id ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {site.name}
                            </span>
                            {selectedSite?.id === site.id && (
                              <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                          {site.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {site.description}
                            </p>
                          )}
                          {site.proxy_host_id && (
                            <div className="flex items-center gap-1 mt-1">
                              <Network className="h-3 w-3 text-primary/70 shrink-0" />
                              <span className="text-xs text-primary/70 truncate">
                                Proxy configured
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Site Management Dropdown */}
                    {site.role === "ADMIN" && (
                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSite(site);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Site
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSite(site);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Site
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Right Main Content - Instances */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedSection === "sites" && selectedSite ? (
          <>
            {/* Header */}
            <div className="px-4 pt-4 pb-3 animate-fade-up" key={selectedSite.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-foreground truncate">
                    {selectedSite.name}
                  </h1>
                  {selectedSite.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedSite.description}
                    </p>
                  )}
                  {selectedSite.proxy_host_id && (() => {
                    const proxyInstance = instances.find(
                      (i) => i.id === selectedSite.proxy_host_id
                    );
                    return (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Network className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          Proxy host:{" "}
                          <span className="font-medium text-foreground/80 font-mono">
                            {proxyInstance
                              ? `${proxyInstance.name} (${proxyInstance.host})`
                              : "Configured"}
                          </span>
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {selectedSite.role === "ADMIN" && (
                    <Button
                      className="gap-2"
                      onClick={() => setCreateInstanceOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Add Instance
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Toolbar */}
            {instances.length > 0 && (
              <div className="flex items-center gap-3 px-4 pb-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search instances..."
                    className="pl-9"
                    value={instanceSearchQuery}
                    onChange={(e) => setInstanceSearchQuery(e.target.value)}
                  />
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                  <Button
                    variant={instanceViewMode === "cards" ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => setInstanceViewMode("cards")}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={instanceViewMode === "table" ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => setInstanceViewMode("table")}
                  >
                    <Table className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Refresh Status */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => selectedSite && checkStatuses(selectedSite.id)}
                  disabled={statusLoading || !selectedSite}
                  title="Refresh instance status"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", statusLoading && "animate-spin")} />
                </Button>
              </div>
            )}

            {/* Instances Grid/Table */}
            <div className="flex-1 overflow-auto p-4">
              {instancesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : instances.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <div className="text-center">
                    <Server className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      No Instances
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      No instances configured for this site yet.
                    </p>
                    {selectedSite.role === "ADMIN" && (
                      <Button onClick={() => setCreateInstanceOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Instance
                      </Button>
                    )}
                  </div>
                </div>
              ) : filteredInstances.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <div className="text-center">
                    <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      No Instances Found
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No instances match your search query.
                    </p>
                  </div>
                </div>
              ) : instanceViewMode === "table" ? (
                <InstanceTableView
                  instances={filteredInstances}
                  isActiveInstance={(id) => activeSession?.instance_id === id}
                  userRole={selectedSite.role}
                  statusMap={instanceStatuses}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onEdit={handleEditInstance}
                  onMove={handleMoveInstance}
                  onDelete={handleDeleteInstance}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredInstances.map((instance, index) => (
                    <div
                      key={instance.id}
                      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                      className="animate-fade-up opacity-0 [animation-fill-mode:both]"
                    >
                      <InstanceCard
                        instance={instance}
                        isActive={activeSession?.instance_id === instance.id}
                        userRole={selectedSite.role}
                        reachabilityStatus={instanceStatuses[instance.id]?.status}
                        latencyMs={instanceStatuses[instance.id]?.latency_ms}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        onEdit={handleEditInstance}
                        onMove={handleMoveInstance}
                        onDelete={handleDeleteInstance}
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedSite && instances.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border/50">
                  <SiteToolsSection
                    siteId={selectedSite.id}
                    siteName={selectedSite.name}
                    userRole={selectedSite.role}
                  />
                </div>
              )}
            </div>
          </>
        ) : selectedSection === "user-management" ? (
          <div className="flex-1 overflow-auto p-4">
            <UserManagement />
          </div>
        ) : selectedSection === "authentication" ? (
          <div className="flex-1 overflow-auto p-4">
            <AuthenticationSettings />
          </div>
        ) : selectedSection === "management" ? (
          <div className="flex-1 overflow-auto">
            <ManagementView />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                Select a Site
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose a site from the list to view its instances
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Site Modals */}
      <CreateSiteModal
        open={createSiteOpen}
        onOpenChange={setCreateSiteOpen}
        onSuccess={handleSiteSuccess}
      />
      <EditSiteModal
        open={editSiteOpen}
        onOpenChange={setEditSiteOpen}
        onSuccess={handleSiteSuccess}
        site={siteToEdit}
      />
      <DeleteSiteModal
        open={deleteSiteOpen}
        onOpenChange={setDeleteSiteOpen}
        onSuccess={handleSiteSuccess}
        site={siteToDelete}
        instanceCount={instanceCount}
      />

      {/* Instance Modals */}
      {selectedSite && (
        <>
          <CreateInstanceModal
            open={createInstanceOpen}
            onOpenChange={setCreateInstanceOpen}
            onSuccess={handleInstanceSuccess}
            site={selectedSite}
          />
          <EditInstanceModal
            open={editInstanceOpen}
            onOpenChange={setEditInstanceOpen}
            onSuccess={handleInstanceSuccess}
            instance={selectedInstance}
            sites={sites}
          />
          <MoveInstanceModal
            open={moveInstanceOpen}
            onOpenChange={setMoveInstanceOpen}
            onSuccess={handleInstanceSuccess}
            instance={selectedInstance}
            currentSite={selectedSite}
            allSites={sites}
          />
          <DeleteInstanceModal
            open={deleteInstanceOpen}
            onOpenChange={setDeleteInstanceOpen}
            onSuccess={handleInstanceSuccess}
            instance={selectedInstance}
            userRole={selectedSite.role}
          />
        </>
      )}

      {/* CSV Import Modal */}
      <ImportCSVModal
        open={importCSVOpen}
        onOpenChange={setImportCSVOpen}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
