"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Lock, Radio, Database } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { getAllWidgets, WidgetRegistration } from "./widget-registry";

interface AddCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCard: (cardType: string) => void;
  prometheusAvailable?: boolean;
}

const DATA_SOURCE_LABELS: Record<string, { label: string; icon: typeof Radio }> = {
  sse: { label: "Real-time Data", icon: Radio },
  prometheus: { label: "Prometheus Data", icon: Database },
  hybrid: { label: "Hybrid", icon: Radio },
};

export function AddCardModal({
  open,
  onOpenChange,
  onAddCard,
  prometheusAvailable = true,
}: AddCardModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { canRead, isLoading: permissionsLoading } = usePermissions();

  // Group widgets by data source
  const { sseWidgets, prometheusWidgets } = useMemo(() => {
    const all = getAllWidgets();
    return {
      sseWidgets: all.filter((w) => w.dataSource === "sse" || w.dataSource === "hybrid"),
      prometheusWidgets: all.filter((w) => w.dataSource === "prometheus"),
    };
  }, []);

  const handleAdd = () => {
    if (selectedType) {
      onAddCard(selectedType);
      setSelectedType(null);
      onOpenChange(false);
    }
  };

  const renderWidgetCard = (widget: WidgetRegistration, disabled: boolean) => {
    const Icon = widget.icon;
    const locked =
      !permissionsLoading &&
      !!widget.requiredPermission &&
      !canRead(widget.requiredPermission as FeatureGroup);
    const isDisabled = locked || disabled;
    const isSelected = selectedType === widget.type;

    const sourceInfo = DATA_SOURCE_LABELS[widget.dataSource];

    return (
      <Card
        key={widget.type}
        className={`transition-all relative ${
          isDisabled
            ? "opacity-50 cursor-not-allowed"
            : isSelected
            ? "border-primary ring-2 ring-primary ring-offset-2 cursor-pointer"
            : "hover:border-primary/50 cursor-pointer"
        }`}
        onClick={() => !isDisabled && setSelectedType(widget.type)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{widget.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {sourceInfo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <sourceInfo.icon className="h-3 w-3" />
                  {sourceInfo.label}
                </span>
              )}
              {locked && (
                <div
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                  title={`Requires ${widget.requiredPermission} read permission`}
                >
                  <Lock className="h-3 w-3" />
                  <span>No access</span>
                </div>
              )}
              {disabled && !locked && (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Requires Prometheus
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            {widget.description}
          </CardDescription>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Dashboard Card</DialogTitle>
          <DialogDescription>
            Select a card to add to your dashboard
          </DialogDescription>
        </DialogHeader>

        {/* Real-time Data widgets */}
        {sseWidgets.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Real-time Data
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {sseWidgets.map((widget) => renderWidgetCard(widget, false))}
            </div>
          </div>
        )}

        {/* Prometheus Data widgets */}
        {prometheusWidgets.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Prometheus Data
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {prometheusWidgets.map((widget) =>
                renderWidgetCard(widget, !prometheusAvailable)
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedType}>
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
