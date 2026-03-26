"use client";

import { useFirstVisit } from "@/hooks/useFirstVisit";
import { CheckCircle2, X, Shield, Globe, Network } from "lucide-react";
import Link from "next/link";

export function WelcomeCard() {
  const { isFirstVisit, dismiss } = useFirstVisit("dashboard-welcome");

  if (!isFirstVisit) return null;

  return (
    <div className="col-span-full rounded-lg border border-primary/20 bg-primary/5 p-3 animate-fade-up">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Connected</h3>
            <p className="text-xs text-muted-foreground">Quick links to get started:</p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss welcome card"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 ml-6">
        <Link href="/system/services" className="group">
          <div className="flex items-center gap-2 rounded-md border border-border p-2 transition-colors hover:bg-accent">
            <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <div>
              <p className="text-xs font-medium text-foreground">Services</p>
              <p className="text-[0.625rem] text-muted-foreground">DNS, NTP, SSH</p>
            </div>
          </div>
        </Link>
        <Link href="/firewall/policies" className="group">
          <div className="flex items-center gap-2 rounded-md border border-border p-2 transition-colors hover:bg-accent">
            <Shield className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <div>
              <p className="text-xs font-medium text-foreground">Firewall</p>
              <p className="text-[0.625rem] text-muted-foreground">Rules, groups, zones</p>
            </div>
          </div>
        </Link>
        <Link href="/network/interfaces" className="group">
          <div className="flex items-center gap-2 rounded-md border border-border p-2 transition-colors hover:bg-accent">
            <Network className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <div>
              <p className="text-xs font-medium text-foreground">Network</p>
              <p className="text-[0.625rem] text-muted-foreground">Interfaces, NAT, DHCP</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
