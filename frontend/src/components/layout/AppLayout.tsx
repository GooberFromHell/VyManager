import { Sidebar } from "./Sidebar";
import { UnsavedChangesBanner } from "../config/UnsavedChangesBanner";
import { PowerActionBanner } from "../system/PowerActionBanner";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <PowerActionBanner />
        <UnsavedChangesBanner />
        <div className="flex-1 overflow-y-auto animate-page-in">
          {children}
        </div>
      </main>

    </div>
  );
}
