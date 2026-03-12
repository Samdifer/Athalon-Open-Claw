import { useState } from "react";
import { useMutation } from "convex/react";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2,
  Award,
  MapPin,
  Users,
  Wrench,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { AVIATION_TIMEZONES } from "@/src/shared/lib/timezones";

const MRO_TYPES = [
  { value: "part_145", label: "Part 145 — Repair Station" },
  { value: "part_135", label: "Part 135 — Air Carrier" },
  { value: "part_121", label: "Part 121 — Air Carrier" },
  { value: "part_91", label: "Part 91 — General Aviation" },
] as const;

const CAPABILITY_OPTIONS = [
  { id: "airframe", label: "Airframe" },
  { id: "powerplant", label: "Powerplant" },
  { id: "avionics", label: "Avionics / Instruments" },
  { id: "radio", label: "Radio / Communication" },
  { id: "accessory", label: "Accessories" },
  { id: "ndt", label: "Non-Destructive Testing (NDT)" },
  { id: "composite", label: "Composite Structures" },
  { id: "interior", label: "Aircraft Interior" },
  { id: "painting", label: "Painting / Finishing" },
  { id: "apu", label: "APU Maintenance" },
  { id: "landing_gear", label: "Landing Gear" },
  { id: "propeller", label: "Propeller" },
] as const;

type CapabilityId = (typeof CAPABILITY_OPTIONS)[number]["id"];

type WizardState = {
  orgName: string;
  orgType: string;
  faaNumber: string;
  locationName: string;
  locationAddress: string;
  locationCity: string;
  locationState: string;
  locationZip: string;
  locationTimezone: string;
  inviteEmails: string;
  capabilities: CapabilityId[];
};

const STEPS = [
  { number: 1, title: "Organization", icon: Building2 },
  { number: 2, title: "FAA Certificate", icon: Award },
  { number: 3, title: "Primary Location", icon: MapPin },
  { number: 4, title: "Team Members", icon: Users },
  { number: 5, title: "Capabilities", icon: Wrench },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = current > step.number;
        const active = current === step.number;
        return (
          <div key={step.number} className="flex items-center gap-1">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                done
                  ? "bg-primary text-primary-foreground"
                  : active
                    ? "bg-primary/20 text-primary border border-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
            </div>
            <span
              className={`text-xs hidden sm:block ${
                active ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {step.title}
            </span>
            {idx < STEPS.length - 1 && (
              <span className="flex-1 h-px bg-border mx-1 w-4 sm:w-8" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FirstRunWizard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { organization } = useOrganization();
  const bootstrap = useMutation(api.onboarding.bootstrapOrganizationAndAdmin);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<WizardState>({
    orgName: "",
    orgType: "part_145",
    faaNumber: "",
    locationName: "Main Shop",
    locationAddress: "",
    locationCity: "",
    locationState: "",
    locationZip: "",
    locationTimezone: "America/Denver",
    inviteEmails: "",
    capabilities: [],
  });

  function update<K extends keyof WizardState>(field: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  function toggleCapability(id: CapabilityId) {
    setState((prev) => ({
      ...prev,
      capabilities: prev.capabilities.includes(id)
        ? prev.capabilities.filter((c) => c !== id)
        : [...prev.capabilities, id],
    }));
  }

  function canAdvance(): boolean {
    if (step === 1) return state.orgName.trim().length > 0;
    if (step === 3)
      return (
        state.locationCity.trim().length > 0 &&
        state.locationState.trim().length > 0 &&
        state.locationTimezone.length > 0
      );
    return true;
  }

  async function handleFinish() {
    if (!state.orgName.trim() || !state.locationCity.trim() || !state.locationState.trim()) {
      toast.error("Organization name and location city/state are required.");
      return;
    }

    const legalName =
      user?.fullName?.trim() ||
      user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "Administrator";

    setSubmitting(true);
    try {
      await bootstrap({
        organizationName: state.orgName.trim(),
        legalName,
        city: state.locationCity.trim(),
        state: state.locationState.trim(),
        country: "US",
        timezone: state.locationTimezone,
        clerkOrganizationId: organization?.id,
      });
      toast.success("Organization set up successfully. Welcome to Athelon!");
      navigate("/dashboard?setup=complete", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create organization.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome to Athelon</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Let's get your repair station set up — this takes about 2 minutes.
          </p>
        </div>

        <StepIndicator current={step} />

        <Card className="border-border/60">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  Organization Basics
                </CardTitle>
                <CardDescription>Your repair station's name and certificate type.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="orgName">Organization Name *</Label>
                  <Input
                    id="orgName"
                    value={state.orgName}
                    onChange={(e) => update("orgName", e.target.value)}
                    placeholder="Rocky Mountain Turbine Service"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orgType">Certificate Type</Label>
                  <Select value={state.orgType} onValueChange={(v) => update("orgType", v)}>
                    <SelectTrigger id="orgType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MRO_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  FAA Certificate Number
                </CardTitle>
                <CardDescription>
                  Your Part 145 repair station certificate number. You can set this later in Settings
                  if you don't have it handy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="faaNumber">Certificate Number</Label>
                  <Input
                    id="faaNumber"
                    value={state.faaNumber}
                    onChange={(e) => update("faaNumber", e.target.value)}
                    placeholder="e.g., RMTS-145-2019-003"
                    className="font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional — you can add this later under Settings → Shop.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Primary Location
                </CardTitle>
                <CardDescription>Your main shop or hangar location.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="locName">Location Name</Label>
                  <Input
                    id="locName"
                    value={state.locationName}
                    onChange={(e) => update("locationName", e.target.value)}
                    placeholder="Main Shop"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="locAddress">Street Address</Label>
                  <Input
                    id="locAddress"
                    value={state.locationAddress}
                    onChange={(e) => update("locationAddress", e.target.value)}
                    placeholder="123 Airport Rd"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 col-span-1">
                    <Label htmlFor="locCity">City *</Label>
                    <Input
                      id="locCity"
                      value={state.locationCity}
                      onChange={(e) => update("locationCity", e.target.value)}
                      placeholder="Grand Junction"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1">
                    <Label htmlFor="locState">State *</Label>
                    <Input
                      id="locState"
                      value={state.locationState}
                      onChange={(e) => update("locationState", e.target.value)}
                      placeholder="CO"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1">
                    <Label htmlFor="locZip">ZIP</Label>
                    <Input
                      id="locZip"
                      value={state.locationZip}
                      onChange={(e) => update("locationZip", e.target.value)}
                      placeholder="81501"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="locTz">Timezone *</Label>
                  <Select
                    value={state.locationTimezone}
                    onValueChange={(v) => update("locationTimezone", v)}
                  >
                    <SelectTrigger id="locTz">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVIATION_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Invite Team Members
                </CardTitle>
                <CardDescription>
                  Add your team's email addresses to send invitations. You can invite more people
                  later from Settings → Users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inviteEmails">Email Addresses</Label>
                  <textarea
                    id="inviteEmails"
                    value={state.inviteEmails}
                    onChange={(e) => update("inviteEmails", e.target.value)}
                    placeholder={"tech1@example.com\ntech2@example.com"}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    One email per line. Invitations are sent from Settings → Users after setup.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {step === 5 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="w-4 h-4 text-muted-foreground" />
                  Capabilities
                </CardTitle>
                <CardDescription>
                  Select the services your MRO provides. These drive your Capabilities List (FAA
                  OpSpecs format) and can be updated any time in Settings → Capabilities.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CAPABILITY_OPTIONS.map((cap) => (
                    <label
                      key={cap.id}
                      className="flex items-center gap-2.5 rounded-md border border-border/60 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <Checkbox
                        checked={state.capabilities.includes(cap.id as CapabilityId)}
                        onCheckedChange={() => toggleCapability(cap.id as CapabilityId)}
                      />
                      <span className="text-sm">{cap.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <div className="flex items-center justify-between mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1 || submitting}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <p className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</p>

          {step < STEPS.length ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish} disabled={submitting}>
              {submitting ? "Setting up…" : "Finish Setup"}
              {!submitting && <Check className="w-4 h-4 ml-1" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
