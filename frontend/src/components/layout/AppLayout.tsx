import { Sidebar } from "./Sidebar";
import { UnsavedChangesBanner } from "../config/UnsavedChangesBanner";
import { PowerActionBanner } from "../system/PowerActionBanner";
import { UnifiedView } from "../ui/unified-view";
import { useUnifiedView } from "@/contexts/UnifiedViewContext";
import { SearchBar } from "../ui/search-bar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { unifiedViewData, closeUnifiedView } = useUnifiedView();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with Search */}
        <header className="relative z-40 flex h-14 items-center justify-between border-b border-border px-6 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <SearchBar />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <PowerActionBanner />
          <UnsavedChangesBanner />
          <div className="flex-1 overflow-y-auto animate-page-in">
            {children}
          </div>
        </main>
      </div>

      {/* Unified View Dialog */}
      {unifiedViewData && (
        <UnifiedView
          isOpen={!!unifiedViewData}
          onClose={closeUnifiedView}
          type={unifiedViewData.type}
          data={unifiedViewData.data}
        />
      )}
    </div>
  );
}
