"use client";

import { useState, useRef } from "react";
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
import { Fieldset, FieldsetDivider, FormField } from "@/components/ui/fieldset";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Server,
  XCircle,
} from "lucide-react";
import {
  sessionService,
  Site,
  ProvisioningEvent,
} from "@/lib/api/session";

interface CreateInstanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  site: Site | null;
}

interface ProvisioningStep {
  step: string;
  status: "pending" | "running" | "complete" | "failed";
  message: string;
  detail?: string;
}

const INITIAL_STEPS: ProvisioningStep[] = [
  { step: "connecting", status: "pending", message: "Connecting to router via SSH" },
  { step: "detecting_version", status: "pending", message: "Detecting VyOS version" },
  { step: "generating_credentials", status: "pending", message: "Generating API key and SSH keypair" },
  { step: "configuring", status: "pending", message: "Entering configuration mode" },
  { step: "enabling_https", status: "pending", message: "Enabling HTTPS API" },
  { step: "configuring_api_key", status: "pending", message: "Configuring API key" },
  { step: "enabling_rest_api", status: "pending", message: "Enabling REST API" },
  { step: "enabling_graphql", status: "pending", message: "Enabling GraphQL" },
  { step: "configuring_ssh_key", status: "pending", message: "Configuring SSH key authentication" },
  { step: "committing", status: "pending", message: "Committing configuration" },
  { step: "saving", status: "pending", message: "Saving configuration" },
  { step: "verifying", status: "pending", message: "Verifying API connectivity" },
];

function StepIcon({ status }: { status: ProvisioningStep["status"] }) {
  switch (status) {
    case "pending":
      return <Circle className="h-4 w-4 text-muted-foreground/40" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

export function CreateInstanceModal({
  open,
  onOpenChange,
  onSuccess,
  site,
}: CreateInstanceModalProps) {
  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [host, setHost] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [sshUsername, setSshUsername] = useState("vyos");
  const [sshPassword, setSshPassword] = useState("");

  // UI state
  const [phase, setPhase] = useState<"form" | "provisioning">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provisioningSteps, setProvisioningSteps] = useState<ProvisioningStep[]>([]);
  const [provisioningDone, setProvisioningDone] = useState(false);
  const [provisioningSuccess, setProvisioningSuccess] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setHost("");
    setSshPort("22");
    setSshUsername("vyos");
    setSshPassword("");
    setPhase("form");
    setLoading(false);
    setError(null);
    setProvisioningSteps([]);
    setProvisioningDone(false);
    setProvisioningSuccess(false);
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site) return;

    // Validation
    if (!name.trim()) {
      setError("Router name is required");
      return;
    }
    if (!host.trim()) {
      setError("Host is required");
      return;
    }
    if (!sshUsername.trim()) {
      setError("SSH username is required");
      return;
    }
    if (!sshPassword) {
      setError("SSH password is required");
      return;
    }

    const sshPortNum = parseInt(sshPort);
    if (isNaN(sshPortNum) || sshPortNum < 1 || sshPortNum > 65535) {
      setError("SSH port must be between 1 and 65535");
      return;
    }

    setLoading(true);
    setError(null);
    setPhase("provisioning");
    setProvisioningSteps(INITIAL_STEPS.map((s) => ({ ...s })));

    try {
      // Step 1: Create the instance in the database
      const instance = await sessionService.createInstance({
        site_id: site.id,
        name: name.trim(),
        description: description.trim() || null,
        host: host.trim(),
        ssh_port: sshPortNum,
      });

      // Step 2: Start SSE provisioning
      const cleanup = sessionService.provisionInstance(
        instance.id,
        sshUsername.trim(),
        sshPassword,
        (event: ProvisioningEvent) => {
          setProvisioningSteps((prev) =>
            prev.map((s) =>
              s.step === event.step
                ? {
                    ...s,
                    status: event.status as ProvisioningStep["status"],
                    message: event.message,
                    detail: event.detail,
                  }
                : s,
            ),
          );

          if (event.step === "complete" && event.status === "complete") {
            setProvisioningSuccess(true);
            setProvisioningDone(true);
            setLoading(false);
          }
          if (event.status === "failed") {
            setProvisioningDone(true);
            setProvisioningSuccess(false);
            setError(event.message);
            setLoading(false);
          }
        },
        (errorMsg: string) => {
          setError(errorMsg);
          setProvisioningDone(true);
          setLoading(false);
        },
        () => {
          // Stream ended — if not already marked done (e.g. success event handled it)
          setProvisioningDone((prev) => {
            if (!prev) setLoading(false);
            return true;
          });
        },
      );

      cleanupRef.current = cleanup;
    } catch (err) {
      setError(
        (err as { message?: string }).message || "Failed to create instance",
      );
      setPhase("form");
      setLoading(false);
    }
  };

  if (!site) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        {phase === "form" ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Add Router</DialogTitle>
                  <DialogDescription>
                    Add a VyOS router to {site.name}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-2">
                {error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  </div>
                )}

                <Fieldset>
                  <FormField label="Router Name" htmlFor="name" required>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., vyos-edge-01"
                      disabled={loading}
                      autoFocus
                    />
                  </FormField>

                  <FormField label="Description" htmlFor="description">
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
                      disabled={loading}
                    />
                  </FormField>
                </Fieldset>

                <FieldsetDivider />

                <Fieldset label="Connection">
                  <FormField
                    label="Host"
                    htmlFor="host"
                    description="IP address or hostname of the VyOS router"
                    required
                  >
                    <Input
                      id="host"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="192.168.1.1"
                      disabled={loading}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="SSH Username" htmlFor="sshUsername" required>
                      <Input
                        id="sshUsername"
                        value={sshUsername}
                        onChange={(e) => setSshUsername(e.target.value)}
                        placeholder="vyos"
                        disabled={loading}
                      />
                    </FormField>

                    <FormField label="SSH Port" htmlFor="sshPort">
                      <Input
                        id="sshPort"
                        type="number"
                        value={sshPort}
                        onChange={(e) => setSshPort(e.target.value)}
                        placeholder="22"
                        min="1"
                        max="65535"
                        disabled={loading}
                      />
                    </FormField>
                  </div>

                  <FormField label="SSH Password" htmlFor="sshPassword" required>
                    <Input
                      id="sshPassword"
                      type="password"
                      value={sshPassword}
                      onChange={(e) => setSshPassword(e.target.value)}
                      placeholder="Enter SSH password"
                      disabled={loading}
                    />
                  </FormField>
                </Fieldset>

                <p className="text-xs text-muted-foreground">
                  SSH credentials are used only during setup and are never stored.
                </p>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Add Router"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Setting up router</DialogTitle>
                  <DialogDescription>{name}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-2">
              <div className="space-y-1 max-h-[350px] overflow-y-auto">
                {provisioningSteps.map((step) => (
                  <div
                    key={step.step}
                    className="flex items-start gap-3 py-1.5 px-1"
                  >
                    <div className="mt-0.5">
                      <StepIcon status={step.status} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${
                          step.status === "pending"
                            ? "text-muted-foreground/60"
                            : step.status === "failed"
                              ? "text-destructive"
                              : "text-foreground"
                        }`}
                      >
                        {step.message}
                      </p>
                      {step.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {provisioningDone && provisioningSuccess && (
                <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-400">
                      Router configured successfully. You can now connect to it.
                    </p>
                  </div>
                </div>
              )}

              {provisioningDone && !provisioningSuccess && error && (
                <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-destructive">{error}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        The instance was created but provisioning failed. You can
                        retry from the instance settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              {provisioningDone ? (
                <Button
                  onClick={() => {
                    handleClose();
                    onSuccess();
                  }}
                >
                  {provisioningSuccess ? "Done" : "Close"}
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Provisioning...
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
