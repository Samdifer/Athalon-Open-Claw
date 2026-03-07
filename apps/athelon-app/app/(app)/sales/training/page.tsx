"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SalesTrainingPage() {
  return (
    <div className="space-y-4" data-testid="sales-training-page">
      <div>
        <h1 className="text-2xl font-semibold">Sales Training</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Placeholder route for sales enablement content and team playbooks.
        </p>
      </div>

      <Card className="border-border/60" data-testid="sales-training-placeholder">
        <CardHeader>
          <CardTitle>Content coming soon</CardTitle>
          <CardDescription>
            Team B can expand this area with role-based curricula, scripts, and certification paths.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This route is now active and ready for future Sales Training modules.
        </CardContent>
      </Card>
    </div>
  );
}
