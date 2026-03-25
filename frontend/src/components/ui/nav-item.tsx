import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: LucideIcon;
  name: string;
  description?: string;
  active: boolean;
  onClick: () => void;
}

export function NavItem({
  icon: Icon,
  name,
  description,
  active,
  onClick,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 mt-0.5 flex-shrink-0",
          active ? "text-primary" : "text-muted-foreground"
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm text-foreground">{name}</span>
          {active && (
            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
          )}
        </div>
        {description && (
          <span className="text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </div>
    </button>
  );
}
