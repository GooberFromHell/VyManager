"use client";

import { useState, useEffect } from "react";
import { RebootModal } from "@/components/system/RebootModal";
import { PoweroffModal } from "@/components/system/PoweroffModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Power, PowerOff, Settings as SettingsIcon, Server } from "lucide-react";
import { systemService, type SystemConfig, type PerformanceOption } from "@/lib/api/system";
import { useToast } from "@/hooks/useToast";

const DEFAULT_PERFORMANCE_OPTION: PerformanceOption = {
  value: "default",
  label: "Default (not set)",
  description: "No performance tuning",
};

export default function SettingsPage() {
  const [rebootModalOpen, setRebootModalOpen] = useState(false);
  const [poweroffModalOpen, setPoweroffModalOpen] = useState(false);

  const handleRebootSuccess = () => {
    // Modal will close automatically
    // Optionally show a toast notification
  };

  const handlePoweroffSuccess = () => {
    // Modal will close automatically
    // Optionally show a toast notification
  };

  return (
    <>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system power and configuration settings
          </p>
        </div>

        {/* System Options Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">System</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Performance
              </CardTitle>
              <CardDescription>
                Tune system for throughput, latency, power save, or virtualization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemConfigLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <FormField label="Performance profile" htmlFor="performance-select" description="Save config to make the change persistent.">
                  <Select
                    value={systemConfig?.performance ?? ""}
                    onValueChange={handlePerformanceChange}
                    disabled={performanceSaving}
                  >
                    <SelectTrigger id="performance-select" className="w-full max-w-sm">
                      <SelectValue placeholder="Default (not set)" />
                    </SelectTrigger>
                    <SelectContent>
                      {performanceOptions.map((opt) => (
                        <SelectItem key={opt.value || "default"} value={opt.value} title={opt.description}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Power Management Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Power Management</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Reboot Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-5 w-5 text-orange-500" />
                  Reboot System
                </CardTitle>
                <CardDescription>
                  Restart the VyOS system to apply changes or troubleshoot issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setRebootModalOpen(true)}
                >
                  <Power className="h-4 w-4 mr-2" />
                  Schedule Reboot
                </Button>
              </CardContent>
            </Card>

            {/* Poweroff Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PowerOff className="h-5 w-5 text-red-500" />
                  Poweroff System
                </CardTitle>
                <CardDescription>
                  Completely shut down the VyOS system (requires manual power-on)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPoweroffModalOpen(true)}
                >
                  <PowerOff className="h-4 w-4 mr-2" />
                  Schedule Poweroff
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RebootModal
        open={rebootModalOpen}
        onOpenChange={setRebootModalOpen}
        onSuccess={handleRebootSuccess}
      />
      <PoweroffModal
        open={poweroffModalOpen}
        onOpenChange={setPoweroffModalOpen}
        onSuccess={handlePoweroffSuccess}
      />
    </>
  );
}
