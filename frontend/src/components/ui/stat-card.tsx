import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const colorVariants = {
  primary: { container: "bg-primary/10", icon: "text-primary", border: "border-l-primary/40" },
  blue: { container: "bg-blue-500/10", icon: "text-blue-500", border: "border-l-blue-500/40" },
  green: { container: "bg-green-500/10", icon: "text-green-500", border: "border-l-green-500/40" },
  purple: { container: "bg-purple-500/10", icon: "text-purple-500", border: "border-l-purple-500/40" },
  amber: { container: "bg-amber-500/10", icon: "text-amber-500", border: "border-l-amber-500/40" },
  red: { container: "bg-red-500/10", icon: "text-red-500", border: "border-l-red-500/40" },
} as const;

interface StatCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  color?: keyof typeof colorVariants;
  className?: string;
}

export function StatCard({
  icon: Icon,
  value,
  label,
  color = "primary",
  className,
}: StatCardProps) {
  const variant = colorVariants[color];

  return (
    <div className={cn(
      "rounded-lg border border-border border-l-2 bg-card p-3 transition-all duration-200 ease-[var(--ease-out-quart)] hover:shadow-md hover:shadow-primary/5 hover:border-primary/20",
      variant.border,
      className
    )}>
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            variant.container
          )}
        >
          <Icon className={cn("h-4 w-4", variant.icon)} />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-[0.6875rem] text-muted-foreground mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}
