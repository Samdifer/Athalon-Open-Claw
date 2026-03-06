import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineStatusBanner } from "@/components/OfflineStatusBanner";
import { Skeleton } from "@/components/ui/skeleton";

function RouteContentFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full min-h-[200px]">
      <div className="flex flex-col gap-3 w-64">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <div className="flex flex-col flex-1 min-h-screen min-w-0">
        <TopBar />
        <OfflineStatusBanner />
        <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
          <Suspense fallback={<RouteContentFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <CommandPalette />
      <KeyboardShortcuts />
      <PWAInstallPrompt />
    </SidebarProvider>
  );
}
