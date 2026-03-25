"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session-store";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { activeSession } = useSessionStore();

  useEffect(() => {
    if (!activeSession) {
      router.push("/sites");
    }
  }, [activeSession, router]);

  if (!activeSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No active connection</p>
            <p className="text-xs text-muted-foreground mt-1">Redirecting to site manager...</p>
          </div>
        </div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
