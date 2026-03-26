import { cn } from "@/lib/utils";

interface SplitLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SplitLayout({
  sidebar,
  children,
  className,
}: SplitLayoutProps) {
  return (
    <div className={cn("flex h-full", className)}>
      <div className="w-56 border-r border-border bg-sidebar flex flex-col h-full shrink-0">
        {sidebar}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
