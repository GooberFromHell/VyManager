import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const colorVariants = {
  primary: { container: "bg-primary/10", icon: "text-primary" },
  blue: { container: "bg-blue-500/10", icon: "text-blue-500" },
  green: { container: "bg-green-500/10", icon: "text-green-500" },
  purple: { container: "bg-purple-500/10", icon: "text-purple-500" },
  amber: { container: "bg-amber-500/10", icon: "text-amber-500" },
  red: { container: "bg-red-500/10", icon: "text-red-500" },
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
    <Card className={cn("border-border transition-all duration-200 ease-[var(--ease-out-quart)] hover:shadow-md hover:shadow-primary/5 hover:border-primary/20", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              variant.container
            )}
          >
            <Icon className={cn("h-5 w-5", variant.icon)} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
