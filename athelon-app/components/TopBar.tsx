import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Sun, Moon, Check, CheckCheck, AlertTriangle, FileText, Wrench, Package, ClipboardCheck, Users, Info } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  wo_status_change: Wrench,
  quote_approved: Check,
  quote_declined: AlertTriangle,
  invoice_overdue: AlertTriangle,
  invoice_paid: FileText,
  discrepancy_critical: AlertTriangle,
  part_received: Package,
  task_completed: ClipboardCheck,
  rts_ready: Check,
  assignment: Users,
  system: Info,
};

export function TopBar() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const unreadCount = useQuery(api.notifications.countUnread) ?? 0;
  const notifications = useQuery(api.notifications.listMyNotifications, { limit: 20 }) ?? [];
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const runCommand = (path: string) => {
    setCommandOpen(false);
    navigate(path);
  };

  const handleNotificationClick = async (notif: { _id: Id<"notifications">; linkTo?: string; read: boolean }) => {
    if (!notif.read) {
      await markAsRead({ notificationId: notif._id });
    }
    if (notif.linkTo) {
      setNotifOpen(false);
      navigate(notif.linkTo);
    }
  };

  // Cmd+K opens command palette
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
          className="h-8 w-8 sm:w-64 justify-start gap-2 text-muted-foreground font-normal text-xs border-border/60 bg-muted/30 hover:bg-muted/50"
          aria-label="Open search palette (Cmd+K)"
          aria-haspopup="dialog"
        >
          <Search className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Search work orders, aircraft...</span>
          <kbd className="ml-auto pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
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

          {/* Notifications Bell */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-0.5 -right-0.5 h-4 min-w-4 p-0 text-[9px] flex items-center justify-center animate-pulse"
                    aria-hidden="true"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 sm:w-96 p-0 max-h-[70vh] overflow-hidden"
              align="end"
              sideOffset={8}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => markAllRead({})}
                  >
                    <CheckCheck className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="overflow-y-auto max-h-[calc(70vh-56px)]">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const IconComponent = NOTIFICATION_ICONS[notif.type] ?? Bell;
                    return (
                      <button
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left px-4 py-3 border-b border-border/30 hover:bg-muted/50 transition-colors flex gap-3 items-start ${
                          !notif.read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                          notif.type === "discrepancy_critical" || notif.type === "invoice_overdue"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium truncate">{notif.title}</span>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                            {timeAgo(notif.createdAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
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
