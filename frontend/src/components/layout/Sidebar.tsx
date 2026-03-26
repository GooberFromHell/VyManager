"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, LogOut, User, Building2, Power, PowerOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { navigation, type NavItem } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const { data: session } = useSession();
  const { activeSession, loadSession, disconnectFromInstance } = useSessionStore();
  const { canRead } = usePermissions();

  // Load active session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

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
  };

  // Initialize and update openItems based on current pathname
  useEffect(() => {
    const activeParents: string[] = [];
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => pathname === child.href);
        if (hasActiveChild) {
          activeParents.push(item.title);
        }
      }
    });
    setOpenItems(activeParents);
  }, [pathname]);

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  /**
   * Filter navigation items based on user permissions.
   * Only shows items if:
   * 1. No permission required, OR
   * 2. User has READ access to the required feature
   * 3. Special case: Unicast Protocols shows if user has any routing protocol permission
   */
  const filterNavigation = (items: NavItem[]): NavItem[] => {
    return items.map((item) => {
      // Filter children first
      if (item.children) {
        const visibleChildren = item.children.filter((child) => {
          // If no permission required, always show
          if (!child.requiredPermission) return true;

          // Special case for Unicast Protocols: show if user has UNICAST_PROTOCOLS
          // OR any individual routing protocol permission
          if (child.requiredPermission === FeatureGroup.UNICAST_PROTOCOLS) {
            return canRead(FeatureGroup.UNICAST_PROTOCOLS) ||
              canRead(FeatureGroup.BGP) ||
              canRead(FeatureGroup.OSPF) ||
              canRead(FeatureGroup.OSPFV3) ||
              canRead(FeatureGroup.ISIS) ||
              canRead(FeatureGroup.OPENFABRIC) ||
              canRead(FeatureGroup.RIP) ||
              canRead(FeatureGroup.RIPNG) ||
              canRead(FeatureGroup.BABEL);
          }

          // Special case for Static & Failover: show if user has STATIC_ROUTES OR FAILOVER
          if (child.requiredPermission === FeatureGroup.STATIC_ROUTES) {
            return canRead(FeatureGroup.STATIC_ROUTES) || canRead(FeatureGroup.FAILOVER);
          }

          // Special case for Routing Infrastructure: show if user has ROUTING_INFRASTRUCTURE
          // OR any individual infrastructure component permission
          if (child.requiredPermission === FeatureGroup.ROUTING_INFRASTRUCTURE) {
            return canRead(FeatureGroup.ROUTING_INFRASTRUCTURE) ||
              canRead(FeatureGroup.BFD) ||
              canRead(FeatureGroup.MPLS) ||
              canRead(FeatureGroup.SEGMENT_ROUTING) ||
              canRead(FeatureGroup.NHRP) ||
              canRead(FeatureGroup.RPKI);
          }

          // Special case for Multicast: show if user has MULTICAST
          // OR any individual multicast protocol permission
          if (child.requiredPermission === FeatureGroup.MULTICAST) {
            return canRead(FeatureGroup.MULTICAST) ||
              canRead(FeatureGroup.IGMP_PROXY) ||
              canRead(FeatureGroup.PIM) ||
              canRead(FeatureGroup.PIM6);
          }

          // Special cases for Firewall sub-features: show if user has FIREWALL OR the specific permission
          if (child.requiredPermission === FeatureGroup.FIREWALL_POLICIES) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_POLICIES);
          }
          if (child.requiredPermission === FeatureGroup.FIREWALL_BRIDGE) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_BRIDGE);
          }
          if (child.requiredPermission === FeatureGroup.FIREWALL_GROUPS) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_GROUPS);
          }
          if (child.requiredPermission === FeatureGroup.FIREWALL_ZONES) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_ZONES);
          }
          if (child.requiredPermission === FeatureGroup.FIREWALL_GLOBAL_OPTIONS) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_GLOBAL_OPTIONS);
          }
          if (child.requiredPermission === FeatureGroup.FIREWALL_FLOWTABLES) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_FLOWTABLES);
          }

          // Special cases for Routing Policies: show if user has ROUTING_POLICIES OR the specific permission
          if (child.requiredPermission === FeatureGroup.ACCESS_LIST) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.ACCESS_LIST);
          }
          if (child.requiredPermission === FeatureGroup.PREFIX_LIST) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.PREFIX_LIST);
          }
          if (child.requiredPermission === FeatureGroup.ROUTE_POLICY) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.ROUTE_POLICY);
          }
          if (child.requiredPermission === FeatureGroup.ROUTE_MAP) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.ROUTE_MAP);
          }
          if (child.requiredPermission === FeatureGroup.LOCAL_ROUTE) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.LOCAL_ROUTE);
          }
          if (child.requiredPermission === FeatureGroup.BGP_AS_PATH) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.BGP_AS_PATH);
          }
          if (child.requiredPermission === FeatureGroup.BGP_COMMUNITY) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.BGP_COMMUNITY);
          }
          if (child.requiredPermission === FeatureGroup.BGP_EXTENDED_COMMUNITY) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.BGP_EXTENDED_COMMUNITY);
          }
          if (child.requiredPermission === FeatureGroup.BGP_LARGE_COMMUNITY) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.BGP_LARGE_COMMUNITY);
          }

          // If permission required, check if user has READ access
          return canRead(child.requiredPermission);
        });

        // If all children are filtered out, hide the parent
        if (visibleChildren.length === 0) {
          return null;
        }

        return { ...item, children: visibleChildren };
      }

      // For items without children, check permission requirement
      if (item.requiredPermission && !canRead(item.requiredPermission)) {
        return null;
      }

      return item;
    }).filter((item): item is NavItem => item !== null);
  };

  const visibleNavigation = filterNavigation(navigation);

  return (
    <div className="flex h-screen w-56 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex h-11 items-center border-b border-border px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center">
            <Image
              src="/vy-icon.png"
              alt="VyOS Logo"
              width={28}
              height={28}
              className="object-contain"
              loader={({ src }) => src}
            />
          </div>
          <h1 className="text-sm font-bold text-foreground tracking-tight">VyManager</h1>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2 min-h-0">
        <nav className="space-y-0.5">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              item.children?.some(child => pathname === child.href);

            if (item.children) {
              const isOpen = openItems.includes(item.title);
              return (
                <Collapsible
                  key={item.title}
                  open={isOpen}
                  onOpenChange={() => toggleItem(item.title)}
                >
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                    <div className="flex items-center gap-2">
                      <Icon className={cn(
                        "h-3.5 w-3.5",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}>{item.title}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ease-[var(--ease-out-quart)]",
                        isOpen && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-0.5 space-y-0.5 pl-3">
                    {item.children.map((child) => {
                      const isChildActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "relative flex items-center gap-2 rounded-md px-2.5 py-1 text-[0.8125rem] transition-colors",
                            isChildActive
                              ? "bg-primary/10 text-foreground font-medium"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                          )}
                        >
                          {isChildActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-primary rounded-r" />
                          )}
                          <span className={cn(
                            "h-1 w-1 rounded-full",
                            isChildActive ? "bg-primary" : "bg-muted-foreground/30"
                          )} />
                          {child.title}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            return (
              <Link
                key={item.title}
                href={item.href!}
                className={cn(
                  "relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r" />
                )}
                <Icon className={cn(
                  "h-3.5 w-3.5",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-2.5 space-y-2 shrink-0">
        <ThemeSelector />

        {/* Active Instance */}
        {activeSession ? (
          <div className="rounded-md bg-primary/10 border border-primary/20 p-2">
            <div className="flex items-center gap-2 mb-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[0.6875rem] font-medium text-primary truncate">
                  {activeSession.instance_name}
                </p>
                <p className="text-[0.625rem] text-muted-foreground truncate">
                  {activeSession.site_name}
                </p>
              </div>
              <div className="relative" title="Connected">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-green-500 animate-ping opacity-40" />
              </div>
            </div>
            <Button
              onClick={async () => {
                await disconnectFromInstance();
                router.push("/sites");
              }}
              variant="outline"
              size="sm"
              className="w-full justify-center gap-1.5 text-[0.6875rem] h-7"
            >
              <PowerOff className="h-3 w-3" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="rounded-md bg-muted/50 border border-border p-2">
            <div className="flex items-center gap-2 mb-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-[0.6875rem] text-muted-foreground">No instance connected</p>
            </div>
            <Button
              onClick={() => router.push("/sites")}
              variant="default"
              size="sm"
              className="w-full justify-center gap-1.5 text-[0.6875rem] h-7"
            >
              <Power className="h-3 w-3" />
              Connect
            </Button>
          </div>
        )}

        {/* User */}
        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0">
            <User className="h-3 w-3 text-primary" />
          </div>
          <p className="text-[0.6875rem] font-medium text-foreground truncate flex-1">
            {session?.user?.name || session?.user?.email || "User"}
          </p>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            title="Logout"
          >
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
