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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
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
