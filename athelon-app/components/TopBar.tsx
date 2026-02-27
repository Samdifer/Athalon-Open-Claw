import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function TopBar() {
  const [commandOpen, setCommandOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const runCommand = (path: string) => {
    setCommandOpen(false);
    navigate(path);
  };

  // Cmd+K opens command palette — useEffect ensures proper cleanup on unmount
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <header className="h-12 flex items-center gap-2 px-4 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Search trigger */}
        <Button
          variant="outline"
          onClick={() => setCommandOpen(true)}
          className="h-8 w-64 justify-start gap-2 text-muted-foreground font-normal text-xs border-border/60 bg-muted/30 hover:bg-muted/50"
          aria-label="Open search palette (Cmd+K)"
          aria-haspopup="dialog"
        >
          <Search className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Search work orders, aircraft...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 relative"
            aria-label="Notifications (2 unread)"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 p-0 text-[9px] flex items-center justify-center"
              aria-hidden="true"
            >
              2
            </Badge>
          </Button>
        </div>
      </header>

      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search work orders, aircraft, parts..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Work Orders">
            <CommandItem
              value="WO-2026-0041 N192AK 100-hour Inspection In Progress"
              onSelect={() => runCommand("/work-orders/WO-2026-0041")}
              className="gap-2"
            >
              <span className="font-mono text-xs text-muted-foreground">
                WO-2026-0041
              </span>
              <span>N192AK — 100-hr Inspection</span>
              <Badge variant="outline" className="ml-auto text-[10px]">
                In Progress
              </Badge>
            </CommandItem>
            <CommandItem
              value="WO-2026-0039 N76LS Main Rotor AOG On Hold"
              onSelect={() => runCommand("/work-orders/WO-2026-0039")}
              className="gap-2"
            >
              <span className="font-mono text-xs text-muted-foreground">
                WO-2026-0039
              </span>
              <span>N76LS — Main Rotor AOG</span>
              <Badge
                variant="outline"
                className="ml-auto text-[10px] text-amber-400 border-amber-500/40"
              >
                On Hold
              </Badge>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Aircraft">
            <CommandItem
              value="N192AK Cessna 172S"
              onSelect={() => runCommand("/fleet/N192AK")}
              className="gap-2"
            >
              <span className="font-mono font-medium text-sm">N192AK</span>
              <span className="text-muted-foreground">Cessna 172S</span>
            </CommandItem>
            <CommandItem
              value="N76LS Bell 206B-III"
              onSelect={() => runCommand("/fleet/N76LS")}
              className="gap-2"
            >
              <span className="font-mono font-medium text-sm">N76LS</span>
              <span className="text-muted-foreground">Bell 206B-III</span>
            </CommandItem>
            <CommandItem
              value="N416AB Cessna 208B Grand Caravan"
              onSelect={() => runCommand("/fleet/N416AB")}
              className="gap-2"
            >
              <span className="font-mono font-medium text-sm">N416AB</span>
              <span className="text-muted-foreground">
                Cessna 208B Grand Caravan
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
