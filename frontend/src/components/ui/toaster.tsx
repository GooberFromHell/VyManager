"use client";

import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToastStore } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start gap-3 p-4 rounded-lg shadow-lg border bg-card",
            toast.exiting
              ? "animate-slide-up-out"
              : "animate-in slide-in-from-bottom-5",
            toast.variant === "destructive" && "border-destructive/50 bg-destructive/10",
            toast.variant === "success" && "border-green-500/50 bg-green-500/10",
            toast.variant === "default" && "border-border"
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.variant === "success" && (
              <CheckCircle className="h-5 w-5 text-green-400" />
            )}
            {toast.variant === "destructive" && (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            {toast.variant === "default" && (
              <Info className="h-5 w-5 text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{toast.title}</p>
            {toast.description && (
              <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="flex-shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
