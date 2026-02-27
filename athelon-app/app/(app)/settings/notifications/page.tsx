"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrgContext } from "@/components/OrgContextProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const NOTIFICATION_TYPES = [
  { key: "wo_status_change", label: "Work Order Status Changes", description: "When a work order changes status (opened, closed, etc.)" },
  { key: "assignment", label: "Task Assignments", description: "When you are assigned to a work order or task" },
  { key: "quote_approved", label: "Quote Approved", description: "When a customer approves a quote" },
  { key: "quote_declined", label: "Quote Declined", description: "When a customer declines a quote" },
  { key: "invoice_overdue", label: "Invoice Overdue", description: "When an invoice becomes overdue" },
  { key: "invoice_paid", label: "Invoice Paid", description: "When an invoice is fully paid" },
  { key: "discrepancy_critical", label: "Critical Discrepancies", description: "When a mandatory/critical discrepancy is opened" },
  { key: "part_received", label: "Parts Received", description: "When ordered parts are received" },
  { key: "task_completed", label: "Task Completed", description: "When a task card is completed" },
  { key: "rts_ready", label: "Return to Service", description: "When aircraft is released to customer" },
  { key: "system", label: "System Notifications", description: "General system updates and alerts" },
] as const;

export default function NotificationPreferencesPage() {
  const { orgId } = useOrgContext();
  const prefs = useQuery(api.notifications.getPreferences);
  const updatePreferences = useMutation(api.notifications.updatePreferences);

  const disabledTypes = prefs?.disabledTypes ?? [];

  const handleToggle = async (type: string, enabled: boolean) => {
    if (!orgId) return;
    const newDisabled = enabled
      ? disabledTypes.filter((t) => t !== type)
      : [...disabledTypes, type];

    try {
      await updatePreferences({ organizationId: orgId, disabledTypes: newDisabled });
      toast.success(enabled ? "Notification enabled" : "Notification disabled");
    } catch {
      toast.error("Failed to update preferences");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Preferences</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose which notifications you want to receive.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Types</CardTitle>
          <CardDescription>Toggle notifications on or off by category.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_TYPES.map((nt) => {
            const isEnabled = !disabledTypes.includes(nt.key);
            return (
              <div key={nt.key} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="space-y-0.5">
                  <Label htmlFor={`notif-${nt.key}`} className="text-sm font-medium cursor-pointer">
                    {nt.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{nt.description}</p>
                </div>
                <Switch
                  id={`notif-${nt.key}`}
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleToggle(nt.key, checked)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
