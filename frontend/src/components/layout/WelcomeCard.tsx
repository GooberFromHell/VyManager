"use client";

import { useFirstVisit } from "@/hooks/useFirstVisit";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, X, Shield, Globe, Network } from "lucide-react";
import Link from "next/link";

export function WelcomeCard() {
  const { isFirstVisit, dismiss } = useFirstVisit("dashboard-welcome");

  if (!isFirstVisit) return null;

  return (
    <Card className="col-span-full border-primary/20 bg-primary/5 animate-fade-up">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">You&apos;re connected!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Here&apos;s what you can do with VyManager:
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss welcome card"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 ml-9">
          <Link href="/system/services" className="group">
            <div className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent">
              <Globe className="h-5 w-5 text-muted-foreground group-hover:text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Services</p>
                <p className="text-xs text-muted-foreground">DNS, NTP, SSH, and more</p>
              </div>
            </div>
          </Link>
          <Link href="/firewall/policies" className="group">
            <div className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent">
              <Shield className="h-5 w-5 text-muted-foreground group-hover:text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Firewall</p>
                <p className="text-xs text-muted-foreground">Rules, groups, and zones</p>
              </div>
            </div>
          </Link>
          <Link href="/network/interfaces" className="group">
            <div className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent">
              <Network className="h-5 w-5 text-muted-foreground group-hover:text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Network</p>
                <p className="text-xs text-muted-foreground">Interfaces, NAT, DHCP</p>
              </div>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
