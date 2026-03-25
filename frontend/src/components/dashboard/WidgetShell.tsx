"use client";

import React from "react";
import { LucideIcon, Settings, X, Loader2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// Types
// ============================================================================

interface WidgetShellProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  editMode: boolean;
  span: number;
  height: number;
  onSpanChange?: (span: number) => void;
  onHeightChange?: (height: number) => void;
  onRemove?: () => void;
  onConfigure?: () => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SPAN_OPTIONS = [
  { value: 3, label: "3 columns" },
  { value: 4, label: "4 columns" },
  { value: 6, label: "6 columns" },
  { value: 8, label: "8 columns" },
  { value: 12, label: "12 columns" },
] as const;

const HEIGHT_OPTIONS = [
  { value: 1, label: "1 row" },
  { value: 2, label: "2 rows" },
  { value: 3, label: "3 rows" },
] as const;

// ============================================================================
// Component
// ============================================================================

export function WidgetShell({
  title,
  icon: Icon,
  children,
  editMode,
  span,
  height,
  onSpanChange,
  onHeightChange,
  onRemove,
  onConfigure,
  loading = false,
  error = null,
  className,
}: WidgetShellProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden animate-fade-up",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>

        {editMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Span options */}
              <DropdownMenuLabel>Width</DropdownMenuLabel>
              {SPAN_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={`span-${opt.value}`}
                  onClick={() => onSpanChange?.(opt.value)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{opt.label}</span>
                    {span === opt.value && (
                      <span className="ml-2 text-primary">&#10003;</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {/* Height options */}
              <DropdownMenuLabel>Height</DropdownMenuLabel>
              {HEIGHT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={`height-${opt.value}`}
                  onClick={() => onHeightChange?.(opt.value)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{opt.label}</span>
                    {height === opt.value && (
                      <span className="ml-2 text-primary">&#10003;</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {/* Configure */}
              {onConfigure && (
                <DropdownMenuItem onClick={onConfigure}>
                  <Settings className="h-4 w-4" />
                  <span>Configure</span>
                </DropdownMenuItem>
              )}

              {/* Remove */}
              {onRemove && (
                <DropdownMenuItem variant="destructive" onClick={onRemove}>
                  <X className="h-4 w-4" />
                  <span>Remove</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <div className="relative p-4 pt-2">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
