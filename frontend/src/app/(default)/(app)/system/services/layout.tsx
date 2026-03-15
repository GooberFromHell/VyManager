"use client";

import { useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Globe, Clock, Terminal, Server, ChevronRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type ServiceType = "dns-forwarding" | "ntp" | "ssh";

const allServices = [
  { id: "dns-forwarding" as ServiceType, name: "DNS Forwarding", description: "Forward DNS queries to upstream servers", icon: Globe, href: "/system/services/dns-forwarding", permission: FeatureGroup.DNS_FORWARDING },
  { id: "ntp" as ServiceType, name: "NTP", description: "Network Time Protocol server", icon: Clock, href: "/system/services/ntp", permission: FeatureGroup.NTP },
  { id: "ssh" as ServiceType, name: "SSH", description: "Secure Shell access configuration", icon: Terminal, href: "/system/services/ssh", permission: FeatureGroup.SSH },
];

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { canRead, isLoading } = usePermissions();

  const services = useMemo(() => {
    if (isLoading) return [];
    return allServices.filter((service) => canRead(service.permission));
  }, [canRead, isLoading]);

  // Redirect to first visible service if on the base path or on a service the user can't access
  useEffect(() => {
    if (isLoading || services.length === 0) return;
    const onVisibleService = services.some((s) => pathname === s.href);
    if (!onVisibleService) {
      router.replace(services[0].href);
    }
  }, [pathname, services, isLoading, router]);

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex h-full">
        {/* Left Sidebar - Service Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Server className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Services</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage VyOS network services
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Service List */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-3">
              {services.map((service) => {
                const Icon = service.icon;
                const active = isActive(service.href);
                return (
                  <button
                    key={service.id}
                    onClick={() => router.push(service.href)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-3 transition-all",
                      active
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1.5",
                        active ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          active ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={cn(
                            "font-medium text-sm",
                            active ? "text-foreground" : "text-foreground"
                          )}>
                            {service.name}
                          </span>
                          {active && (
                            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {service.description}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {children}
        </div>
    </div>
  );
}
