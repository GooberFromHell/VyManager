"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface JobLogPanelProps {
  logs: string[];
}

function getLogLineClass(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("failed")) {
    return "text-red-400";
  }
  if (lower.includes("warning")) {
    return "text-yellow-400";
  }
  if (lower.includes("complete") || lower.includes("success")) {
    return "text-green-400";
  }
  return "text-muted-foreground";
}

export function JobLogPanel({ logs }: JobLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  if (logs.length === 0) {
    return (
      <div className="rounded-md bg-muted/50 border border-border px-3 py-4">
        <p className="text-xs text-muted-foreground text-center">
          No log entries yet.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="rounded-md bg-muted/50 border border-border overflow-y-auto max-h-48"
    >
      <div className="p-3 space-y-0.5">
        {logs.map((line, i) => (
          <div
            key={i}
            className={cn("font-mono text-xs leading-relaxed", getLogLineClass(line))}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
