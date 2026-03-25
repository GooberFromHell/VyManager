"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/fieldset";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, PowerOff } from "lucide-react";
import { powerService } from "@/lib/api/power";
import { ApiError } from "@/lib/types/api";

interface PoweroffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PoweroffModal({ open, onOpenChange, onSuccess }: PoweroffModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"now" | "at" | "in">("now");
  const [timeValue, setTimeValue] = useState("");
  const [minutesValue, setMinutesValue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let value: string | undefined;

      if (action === "at") {
        if (!timeValue.trim()) {
          setError("Please enter a time (HH:MM)");
          setLoading(false);
          return;
        }
        value = timeValue;
      } else if (action === "in") {
        if (!minutesValue.trim()) {
          setError("Please enter number of minutes");
          setLoading(false);
          return;
        }
        value = minutesValue;
      }

      await powerService.poweroff({ action, value });

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to execute poweroff");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAction("now");
    setTimeValue("");
    setMinutesValue("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PowerOff className="h-5 w-5 text-red-500" />
            Poweroff System
          </DialogTitle>
          <DialogDescription>
            Schedule or immediately power off the VyOS system. The system will shut down completely and require manual power-on to restart.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Poweroff Options */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Poweroff Options</p>
            <RadioGroup value={action} onValueChange={(value) => setAction(value as "now" | "at" | "in")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="now" id="now" />
                <label htmlFor="now" className="text-sm font-normal cursor-pointer">
                  Poweroff now (immediately without confirmation)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="at" id="at" />
                <label htmlFor="at" className="text-sm font-normal cursor-pointer">
                  Poweroff at specific time
                </label>
              </div>

              {action === "at" && (
                <div className="ml-6 mt-2">
                  <FormField
                    label="Time (HH:MM)"
                    htmlFor="time"
                    description="24-hour format. Hours: 00-23 (e.g., 19:30, 00:00 for midnight)"
                  >
                    <Input
                      id="time"
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      placeholder="19:30"
                    />
                  </FormField>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="in" id="in" />
                <label htmlFor="in" className="text-sm font-normal cursor-pointer">
                  Poweroff in X minutes
                </label>
              </div>

              {action === "in" && (
                <div className="ml-6 mt-2">
                  <FormField label="Minutes" htmlFor="minutes">
                    <Input
                      id="minutes"
                      type="number"
                      min="1"
                      value={minutesValue}
                      onChange={(e) => setMinutesValue(e.target.value)}
                      placeholder="5"
                    />
                  </FormField>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Warning */}
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-medium">Critical Warning</p>
                <p className="mt-1">
                  {action === "now"
                    ? "The system will power off immediately. All connections will be lost and the system will require manual power-on."
                    : "The system will power off at the scheduled time. All connections will be lost and the system will require manual power-on."}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? "Scheduling..." : action === "now" ? "Poweroff Now" : "Schedule Poweroff"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
