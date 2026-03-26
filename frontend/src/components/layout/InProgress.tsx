"use client";

import { Construction, Sparkles, Zap } from "lucide-react";

export function InProgress() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-center space-y-4 max-w-sm">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-5">
            <Construction className="h-10 w-10 text-primary mx-auto" />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-primary">
            In Progress
          </h2>
          <p className="text-muted-foreground text-sm">
            Building something great
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
            <span>Coming Soon</span>
          </div>
          <div className="w-px h-3 bg-border"></div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-blue-500" />
            <span>In Development</span>
          </div>
        </div>

        <div className="pt-3">
          <div className="h-0.5 w-full bg-border rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-primary to-primary/50 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
