"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/session-store";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loadSession } = useSessionStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await loadSession();
      setIsLoading(false);
    };
    load();
  }, [loadSession]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Loading VyManager</p>
            <p className="text-xs text-muted-foreground mt-1">Initializing your session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
