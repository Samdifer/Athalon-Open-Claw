"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const bootstrap = useMutation(api.onboarding.bootstrapOrganizationAndAdmin);

  const [organizationName, setOrganizationName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("US");
  const [submitting, setSubmitting] = useState(false);

  const legalNameFallback = useMemo(
    () =>
      user?.fullName?.trim() ||
      user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "Administrator",
    [user],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!organizationName.trim() || !city.trim() || !state.trim() || !country.trim()) {
      toast.error("Organization name, city, state, and country are required.");
      return;
    }

    setSubmitting(true);
    try {
      await bootstrap({
        organizationName: organizationName.trim(),
        legalName: (legalName.trim() || legalNameFallback).trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
      });
      toast.success("Organization setup complete.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete setup.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/60">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Complete Setup
          </CardTitle>
          <CardDescription>
            Finish your organization setup to unlock all app pages.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="organizationName">Organization Name *</Label>
              <Input
                id="organizationName"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Rocky Mountain Turbine Service"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="legalName">Your Legal Name</Label>
              <Input
                id="legalName"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder={legalNameFallback}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="US"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="CO"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Grand Junction"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Completing setup..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
