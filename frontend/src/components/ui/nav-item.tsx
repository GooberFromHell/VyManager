import type { LucideIcon } from "lucide-react";
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
        "w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-all duration-150 group relative",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r" />
      )}
      <Icon
        className={cn(
          "h-3.5 w-3.5 flex-shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <div className="flex-1 min-w-0">
        <span className={cn("text-[0.8125rem] leading-tight", active && "font-medium")}>{name}</span>
        {description && !active && (
          <span className="text-[0.6875rem] text-muted-foreground block truncate">{description}</span>
        )}
      </div>
    </button>
  );
}
