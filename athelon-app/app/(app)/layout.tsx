import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { OrgContextProvider } from "@/components/OrgContextProvider";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

export function AppLayout() {
  return (
    <OrgContextProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <div className="flex flex-col flex-1 min-h-screen min-w-0">
          <TopBar />
          <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
        <CommandPalette />
        <KeyboardShortcuts />
      </SidebarProvider>
    </OrgContextProvider>
  );
}
