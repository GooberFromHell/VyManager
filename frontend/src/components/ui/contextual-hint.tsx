"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextualHintProps {
  children: React.ReactNode;
  onDismiss: () => void;
  className?: string;
}

export function ContextualHint({ children, onDismiss, className }: ContextualHintProps) {
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = () => {
    setDismissing(true);
    setTimeout(() => onDismiss(), 200);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm transition-opacity duration-200 animate-fade-up",
        dismissing && "opacity-0",
        className
      )}
    >
      <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 text-muted-foreground">{children}</div>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        aria-label="Dismiss hint"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
