import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ShopSettingsPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
          Shop Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Repair station information and configuration
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm">Repair Station Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Shop Name</Label>
              <Input
                defaultValue="Rocky Mountain Turbine Service"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Part 145 Certificate #</Label>
              <Input
                defaultValue="RMTS-145-2019-003"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input defaultValue="Grand Junction" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input defaultValue="CO" className="h-8 text-sm" />
            </div>
          </div>
          <Button size="sm" className="mt-2">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
