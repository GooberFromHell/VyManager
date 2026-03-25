"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fieldset, FormField } from "@/components/ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { OspfRedistribute, OspfCapabilities } from "@/lib/api/ospf";

interface OspfRedistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: OspfRedistribute) => Promise<void>;
  capabilities?: OspfCapabilities | null;
  existingProtocols: string[];
  routeMapNames?: string[];
}

export function OspfRedistributeModal({
  open,
  onOpenChange,
  onSubmit,
  capabilities,
  existingProtocols,
  routeMapNames = [],
}: OspfRedistributeModalProps) {
  const [protocol, setProtocol] = useState("");
  const [metric, setMetric] = useState("");
  const [metricType, setMetricType] = useState("");
  const [routeMap, setRouteMap] = useState("");
  const [tableId, setTableId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allProtocols = capabilities?.redistribute_protocols || [
    "connected", "static", "bgp", "kernel", "rip", "isis", "babel",
  ];

  const availableProtocols = allProtocols.filter(
    (p) => !existingProtocols.includes(p)
  );

  useEffect(() => {
    if (open) {
      setProtocol("");
      setMetric("");
      setMetricType("");
      setRouteMap("");
      setTableId("");
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!protocol) return "Please select a protocol";
    if (protocol === "table" && !tableId.trim()) return "Table ID is required";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const entry: OspfRedistribute = {
        protocol,
        metric: metric.trim() || null,
        metric_type: metricType || null,
        route_map: routeMap.trim() || null,
        table: protocol === "table" ? tableId.trim() : null,
      };

      await onSubmit(entry);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Route Redistribution</DialogTitle>
          <DialogDescription>
            Redistribute routes from another protocol into OSPF.
          </DialogDescription>
        </DialogHeader>

        <Fieldset>
          <FormField
            label="Protocol"
            htmlFor="ospf-redist-proto"
            required
          >
            <Select value={protocol} onValueChange={setProtocol}>
              <SelectTrigger id="ospf-redist-proto">
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent>
                {availableProtocols.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
                {!existingProtocols.includes("table") && (
                  <SelectItem value="table">table</SelectItem>
                )}
              </SelectContent>
            </Select>
          </FormField>

          {protocol === "table" && (
            <FormField
              label="Table ID"
              htmlFor="ospf-redist-table"
              required
            >
              <Input
                id="ospf-redist-table"
                type="number"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                placeholder="Routing table number"
              />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Metric"
              htmlFor="ospf-redist-metric"
            >
              <Input
                id="ospf-redist-metric"
                type="number"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder="Metric value"
              />
            </FormField>
            <FormField
              label="Metric Type"
              htmlFor="ospf-redist-metric-type"
            >
              <Select value={metricType} onValueChange={setMetricType}>
                <SelectTrigger id="ospf-redist-metric-type">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Type 1</SelectItem>
                  <SelectItem value="2">Type 2</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField
            label="Route Map"
            htmlFor="ospf-redist-route-map"
          >
            <Select
              value={routeMap}
              onValueChange={(v) => setRouteMap(v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="ospf-redist-route-map">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {routeMapNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </Fieldset>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Redistribute"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
