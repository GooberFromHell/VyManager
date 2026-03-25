"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import { getWidget } from "./widget-registry";

// ============================================================================
// Types
// ============================================================================

interface WidgetConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgetType: string;
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
  span: number;
  height: number;
  onSpanChange: (span: number) => void;
  onHeightChange: (height: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

const WIDTH_OPTIONS = [
  { value: "3", label: "25% (3 cols)" },
  { value: "4", label: "33% (4 cols)" },
  { value: "6", label: "50% (6 cols)" },
  { value: "8", label: "66% (8 cols)" },
  { value: "12", label: "100% (12 cols)" },
] as const;

const HEIGHT_OPTIONS = [
  { value: "1", label: "Compact" },
  { value: "2", label: "Standard" },
  { value: "3", label: "Tall" },
] as const;

// ============================================================================
// Component
// ============================================================================

export function WidgetConfigDrawer({
  open,
  onOpenChange,
  widgetType,
  config,
  onConfigChange,
  span,
  height,
  onSpanChange,
  onHeightChange,
}: WidgetConfigDrawerProps) {
  const widget = getWidget(widgetType);

  if (!widget) return null;

  const Icon = widget.icon;
  const ConfigPanel = widget.configPanel;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            {widget.name}
          </SheetTitle>
          <SheetDescription>{widget.description}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-6 pb-6">
          {/* ----------------------------------------------------------------
            * Common layout options
            * -------------------------------------------------------------- */}
          <Fieldset label="Layout">
            <FormField label="Width" htmlFor="widget-width">
              <Select
                value={String(span)}
                onValueChange={(v) => onSpanChange(Number(v))}
              >
                <SelectTrigger id="widget-width" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDTH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Height" htmlFor="widget-height">
              <Select
                value={String(height)}
                onValueChange={(v) => onHeightChange(Number(v))}
              >
                <SelectTrigger id="widget-height" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEIGHT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </Fieldset>

          <FieldsetDivider />

          {/* ----------------------------------------------------------------
            * Widget-specific configuration
            * -------------------------------------------------------------- */}
          {ConfigPanel ? (
            <Fieldset label="Widget Settings">
              <ConfigPanel config={config} onChange={onConfigChange} />
            </Fieldset>
          ) : (
            <p className="text-xs text-muted-foreground">
              No additional configuration available for this widget.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
