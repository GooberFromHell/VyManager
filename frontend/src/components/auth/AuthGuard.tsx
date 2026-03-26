"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession, authClient } from "@/lib/auth-client";

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Client-side authentication guard.
 *
 * - Checks the session on mount via `useSession()`.
 * - Redirects to `/login` when the session is null / expired.
 * - Revalidates every 60 seconds and on tab refocus (`visibilitychange`).
 * - Renders children only when a valid session is confirmed.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const revalidate = useCallback(async () => {
    try {
      const result = await authClient.getSession();
      if (!result.data?.session) {
        router.replace("/login");
      }
    } catch {
      // Network error — don't redirect, let the next heartbeat retry
    }
  }, [router]);

  // Heartbeat interval
  useEffect(() => {
    heartbeatRef.current = setInterval(revalidate, HEARTBEAT_INTERVAL_MS);
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [revalidate]);

  // Revalidate on tab refocus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        revalidate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [revalidate]);

  // Redirect to login if session is confirmed absent
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  // Still loading — show spinner or custom fallback
  if (isPending) {
    return (
      <>
        {fallback ?? (
          <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Verifying session...
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Session absent — render nothing while redirect fires
  if (!session?.user) {
    return null;
  }

  // Session valid — render protected content
  return <>{children}</>;
}
