"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const AVIATION_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET) - America/New_York" },
  { value: "America/Chicago", label: "Central (CT) - America/Chicago" },
  { value: "America/Denver", label: "Mountain (MT) - America/Denver" },
  { value: "America/Phoenix", label: "Mountain (no DST) - America/Phoenix" },
  { value: "America/Los_Angeles", label: "Pacific (PT) - America/Los_Angeles" },
  { value: "America/Anchorage", label: "Alaska (AKT) - America/Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST) - Pacific/Honolulu" },
  { value: "UTC", label: "UTC / Zulu" },
] as const;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { org } = useCurrentOrg();
  const bootstrap = useMutation(api.onboarding.bootstrapOrganizationAndAdmin);

  const [organizationName, setOrganizationName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("US");
  const [timezone, setTimezone] = useState("America/Denver");
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
    if (!organizationName.trim() || !city.trim() || !state.trim() || !country.trim() || !timezone) {
      toast.error("Organization name, city, state, country, and timezone are required.");
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
        timezone,
        clerkOrganizationId: organization?.id,
      });
      toast.success("Organization created successfully.");
      navigate("/dashboard?setup=complete", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create organization.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        asChild
      >
        <Link to="/settings/shop">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Settings
        </Link>
      </Button>

      <Card className="max-w-lg border-border/60">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            New Organization
          </CardTitle>
          <CardDescription>
            Create a new organization to manage a separate repair station.
            {org?.name && (
              <span className="block mt-1 text-xs">
                You are currently in <strong>{org.name}</strong>.
              </span>
            )}
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

            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone *</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" aria-label="Timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {AVIATION_TIMEZONES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating organization..." : "Create Organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
