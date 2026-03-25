"use client";

import { useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SplitLayout } from "@/components/ui/split-layout";
import { NavItem } from "@/components/ui/nav-item";
import { Globe, Clock, Terminal, ArrowLeftRight, Network, Radio, Eye, Wifi, FileUp, RefreshCw } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type ServiceType = "dns-forwarding" | "ntp" | "ssh" | "dhcp-relay" | "dhcpv6-server" | "lldp" | "snmp" | "router-advert" | "tftp-server" | "broadcast-relay" | "conntrack-sync";

const allServices = [
  { id: "dns-forwarding" as ServiceType, name: "DNS Forwarding", description: "Forward DNS queries to upstream servers", icon: Globe, href: "/system/services/dns-forwarding", permission: FeatureGroup.DNS_FORWARDING },
  { id: "ntp" as ServiceType, name: "NTP", description: "Network Time Protocol server", icon: Clock, href: "/system/services/ntp", permission: FeatureGroup.NTP },
  { id: "ssh" as ServiceType, name: "SSH", description: "Secure Shell access configuration", icon: Terminal, href: "/system/services/ssh", permission: FeatureGroup.SSH },
  { id: "dhcp-relay" as ServiceType, name: "DHCP Relay", description: "Relay DHCP requests to upstream servers", icon: ArrowLeftRight, href: "/system/services/dhcp-relay", permission: FeatureGroup.DHCP_RELAY },
  { id: "dhcpv6-server" as ServiceType, name: "DHCPv6 Server", description: "IPv6 address assignment via DHCPv6", icon: Network, href: "/system/services/dhcpv6-server", permission: FeatureGroup.DHCPV6_SERVER },
  { id: "lldp" as ServiceType, name: "LLDP", description: "Link Layer Discovery Protocol", icon: Eye, href: "/system/services/lldp", permission: FeatureGroup.LLDP },
  { id: "snmp" as ServiceType, name: "SNMP", description: "Simple Network Management Protocol", icon: Radio, href: "/system/services/snmp", permission: FeatureGroup.SNMP },
  { id: "router-advert" as ServiceType, name: "Router Advertisement", description: "IPv6 router advertisement (radvd)", icon: Wifi, href: "/system/services/router-advert", permission: FeatureGroup.ROUTER_ADVERT },
  { id: "tftp-server" as ServiceType, name: "TFTP Server", description: "Trivial File Transfer Protocol server", icon: FileUp, href: "/system/services/tftp-server", permission: FeatureGroup.TFTP_SERVER },
  { id: "broadcast-relay" as ServiceType, name: "Broadcast Relay", description: "UDP broadcast relay across interfaces", icon: ArrowLeftRight, href: "/system/services/broadcast-relay", permission: FeatureGroup.BROADCAST_RELAY },
  { id: "conntrack-sync" as ServiceType, name: "Conntrack Sync", description: "Connection tracking synchronization", icon: RefreshCw, href: "/system/services/conntrack-sync", permission: FeatureGroup.CONNTRACK_SYNC },
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
    <SplitLayout
      sidebar={
        <>
          <div className="flex h-16 items-center border-b px-6 shrink-0">
            <h2 className="text-lg font-semibold text-foreground">Services</h2>
          </div>
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-3">
              {services.map((service) => (
                <NavItem
                  key={service.id}
                  icon={service.icon}
                  name={service.name}
                  description={service.description}
                  active={isActive(service.href)}
                  onClick={() => router.push(service.href)}
                />
              ))}
            </div>
          </ScrollArea>
        </>
      }
    >
      {children}
    </SplitLayout>
  );
}
