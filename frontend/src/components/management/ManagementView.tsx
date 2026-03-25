"use client";

import { BackgroundJobsView } from "./BackgroundJobsView";

export function ManagementView() {
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border px-4 pt-2">
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary">
          Jobs
        </button>
        <button
          className="px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-50"
          disabled
        >
          Audit Log
        </button>
        <button
          className="px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-50"
          disabled
        >
          System Health
        </button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <BackgroundJobsView />
      </div>
    </div>
  );
}
