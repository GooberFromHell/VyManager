import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorAlert({
  title,
  message,
  onRetry,
  retryLabel = "Try Again",
  className,
}: ErrorAlertProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-destructive/50 bg-destructive/10 p-4 animate-fade-up",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          {title && (
            <p className="font-semibold text-destructive">{title}</p>
          )}
          <p className={cn("text-sm text-destructive", title && "mt-1")}>
            {message}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
