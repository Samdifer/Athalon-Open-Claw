import { useState, Fragment } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Plane,
  Check,
  Loader2,
  Info,
  Plus,
  Users,
  Wrench,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  FaaLookupButton,
  type FaaLookupResult,
} from "@/components/faa/FaaLookupButton";

// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;

type AircraftCategory =
  | "normal"
  | "utility"
  | "acrobatic"
  | "limited"
  | "lsa"
  | "experimental"
  | "restricted"
  | "provisional";

type OperatingRegulation =
  | "part_91"
  | "part_135"
  | "part_121"
  | "part_137"
  | "part_91_135_mixed"
  | "pending_determination";

interface EngineFormData {
  make: string;
  model: string;
  serialNumber: string;
  position: string;
  totalTimeHours: string;
  timeSinceOverhaulHours: string;
  timeBetweenOverhaulLimit: string;
}

interface WizardFormData {
  nNumber: string;
  make: string;
  model: string;
  series: string;
  serialNumber: string;
  yearOfManufacture: string;
  ownerName: string;
  aircraftCategory: AircraftCategory;
  experimental: boolean;
  engineCount: string;
  maxGrossWeightLbs: string;
  baseLocation: string;
  operatingRegulation: OperatingRegulation | "";
  typeCertificateNumber: string;
  totalTimeAirframeHours: string;
  hobbsReading: string;
  totalLandingCycles: string;
  engines: EngineFormData[];
  faaEngineType: string;
  faaTypeAircraft: string;
  faaCertIssueDate: string;
  faaStatus: string;
  customerId: string;
}

const EMPTY_ENGINE: EngineFormData = {
  make: "",
  model: "",
  serialNumber: "",
  position: "",
  totalTimeHours: "",
  timeSinceOverhaulHours: "",
  timeBetweenOverhaulLimit: "",
};

function emptyFormData(): WizardFormData {
  return {
    nNumber: "",
    make: "",
    model: "",
    series: "",
    serialNumber: "",
    yearOfManufacture: "",
    ownerName: "",
    aircraftCategory: "normal",
    experimental: false,
    engineCount: "1",
    maxGrossWeightLbs: "",
    baseLocation: "",
    operatingRegulation: "",
    typeCertificateNumber: "",
    totalTimeAirframeHours: "",
    hobbsReading: "",
    totalLandingCycles: "",
    engines: [{ ...EMPTY_ENGINE }],
    faaEngineType: "",
    faaTypeAircraft: "",
    faaCertIssueDate: "",
    faaStatus: "",
    customerId: "",
  };
}

const AIRCRAFT_CATEGORIES: { value: AircraftCategory; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "utility", label: "Utility" },
  { value: "acrobatic", label: "Acrobatic" },
  { value: "limited", label: "Limited" },
  { value: "lsa", label: "Light Sport (LSA)" },
  { value: "experimental", label: "Experimental" },
  { value: "restricted", label: "Restricted" },
  { value: "provisional", label: "Provisional" },
];

const OPERATING_REGULATIONS: { value: OperatingRegulation; label: string }[] = [
  { value: "part_91", label: "Part 91" },
  { value: "part_135", label: "Part 135" },
  { value: "part_121", label: "Part 121" },
  { value: "part_137", label: "Part 137" },
  { value: "part_91_135_mixed", label: "Part 91/135 Mixed" },
  { value: "pending_determination", label: "Pending Determination" },
];

type CustomerType =
  | "individual"
  | "company"
  | "charter_operator"
  | "flight_school"
  | "government";

const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "charter_operator", label: "Charter Operator" },
  { value: "flight_school", label: "Flight School" },
  { value: "government", label: "Government" },
];

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { num: 1, label: "FAA Lookup" },
    { num: 2, label: "Review & Edit" },
    { num: 3, label: "Confirm" },
  ] as const;

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => (
        <Fragment key={s.num}>
          {i > 0 && (
            <div
              className={cn(
                "h-px w-8",
                current >= s.num ? "bg-primary" : "bg-border",
              )}
            />
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                current === s.num
                  ? "bg-primary text-primary-foreground"
                  : current > s.num
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {current > s.num ? <Check className="w-3 h-3" /> : s.num}
            </div>
            <span
              className={cn(
                "text-xs hidden sm:inline",
                current === s.num
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

// ─── Engine position helpers ─────────────────────────────────────────────────

function getEnginePositionLabel(index: number, total: number): string {
  if (total === 1) return "Single";
  if (total === 2) return index === 0 ? "Left" : "Right";
  return `#${index + 1}`;
}

// ─── Wizard Component ────────────────────────────────────────────────────────

interface AddAircraftWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAircraftWizard({
  open,
  onOpenChange,
}: AddAircraftWizardProps) {
  const { orgId } = useCurrentOrg();
  const createAircraft = useMutation(api.aircraft.create);
  const createEngine = useMutation(api.aircraft.createEngine);
  const createCustomer = useMutation(api.billingV4.createCustomer);
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId } : "skip",
  );

  const [step, setStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<WizardFormData>(emptyFormData());
  const [faaResult, setFaaResult] = useState<FaaLookupResult | null>(null);
  const [lookupNNumber, setLookupNNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer quick-add state
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddType, setQuickAddType] = useState<CustomerType>("individual");
  const [quickAddEmail, setQuickAddEmail] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  function resetWizard() {
    setStep(1);
    setFormData(emptyFormData());
    setFaaResult(null);
    setLookupNNumber("");
    setShowQuickAdd(false);
    setQuickAddName("");
    setQuickAddType("individual");
    setQuickAddEmail("");
  }

  function updateField<K extends keyof WizardFormData>(
    key: K,
    value: WizardFormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function updateEngine(index: number, field: keyof EngineFormData, value: string) {
    setFormData((prev) => {
      const engines = [...prev.engines];
      engines[index] = { ...engines[index], [field]: value };
      return { ...prev, engines };
    });
  }

  // Sync engine array size when engineCount changes
  function handleEngineCountChange(countStr: string) {
    const count = parseInt(countStr, 10) || 1;
    const clamped = Math.max(1, Math.min(count, 8));
    updateField("engineCount", String(clamped));

    setFormData((prev) => {
      const current = prev.engines;
      if (clamped > current.length) {
        const additions = Array.from(
          { length: clamped - current.length },
          () => ({ ...EMPTY_ENGINE }),
        );
        return { ...prev, engines: [...current, ...additions] };
      }
      if (clamped < current.length) {
        return { ...prev, engines: current.slice(0, clamped) };
      }
      return prev;
    });
  }

  // ── FAA Result Handling ──────────────────────────────────────────────────

  function handleFaaResult(result: FaaLookupResult) {
    setFaaResult(result);
  }

  function handleClaimAircraft() {
    if (!faaResult?.found) return;
    setFormData({
      ...emptyFormData(),
      nNumber: faaResult.nNumber ?? "",
      make: faaResult.manufacturer ?? "",
      model: faaResult.model ?? "",
      serialNumber: faaResult.serialNumber ?? "",
      yearOfManufacture: faaResult.yearOfManufacture
        ? String(faaResult.yearOfManufacture)
        : "",
      ownerName: faaResult.ownerName ?? "",
      faaEngineType: faaResult.engineType ?? "",
      faaTypeAircraft: faaResult.typeAircraft ?? "",
      faaCertIssueDate: faaResult.certIssueDate ?? "",
      faaStatus: faaResult.status ?? "",
    });
    setStep(2);
  }

  function handleEnterManually() {
    setFormData(emptyFormData());
    setStep(2);
  }

  // ── Validation ───────────────────────────────────────────────────────────

  function validateStep2(): string | null {
    if (!formData.make.trim()) return "Manufacturer/Make is required.";
    if (!formData.model.trim()) return "Model is required.";
    if (!formData.serialNumber.trim()) return "Serial Number is required.";
    if (!formData.totalTimeAirframeHours.trim())
      return "Total Time Airframe Hours is required.";
    const ttaf = parseFloat(formData.totalTimeAirframeHours);
    if (isNaN(ttaf) || ttaf < 0)
      return "TTAF must be a valid non-negative number.";
    return null;
  }

  function handleNextToConfirm() {
    const error = validateStep2();
    if (error) {
      toast.error(error);
      return;
    }
    setStep(3);
  }

  // ── Customer Quick-Add ───────────────────────────────────────────────────

  async function handleQuickAddCustomer() {
    if (!orgId || !quickAddName.trim()) return;
    setIsCreatingCustomer(true);
    try {
      const newId = await createCustomer({
        organizationId: orgId as Id<"organizations">,
        name: quickAddName.trim(),
        customerType: quickAddType,
        email: quickAddEmail.trim() || undefined,
      });
      updateField("customerId", newId as string);
      setShowQuickAdd(false);
      setQuickAddName("");
      setQuickAddType("individual");
      setQuickAddEmail("");
      setCustomerPopoverOpen(false);
      toast.success("Customer created");
    } catch (err) {
      toast.error("Failed to create customer", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsCreatingCustomer(false);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!orgId) return;
    setIsSubmitting(true);
    try {
      const aircraftId = await createAircraft({
        organizationId: orgId as Id<"organizations">,
        tailNumber: formData.nNumber.trim(),
        make: formData.make.trim(),
        model: formData.model.trim(),
        series: formData.series.trim() || undefined,
        serialNumber: formData.serialNumber.trim(),
        year: formData.yearOfManufacture
          ? parseInt(formData.yearOfManufacture, 10)
          : undefined,
        totalTimeAirframeHours: parseFloat(formData.totalTimeAirframeHours),
        customerId: formData.customerId
          ? (formData.customerId as Id<"customers">)
          : undefined,
        experimental: formData.experimental,
        aircraftCategory: formData.aircraftCategory,
        engineCount: parseInt(formData.engineCount, 10) || 1,
        maxGrossWeightLbs: formData.maxGrossWeightLbs
          ? parseFloat(formData.maxGrossWeightLbs)
          : undefined,
        baseLocation: formData.baseLocation.trim() || undefined,
        operatingRegulation: formData.operatingRegulation || undefined,
        ownerName: formData.ownerName.trim() || undefined,
        hobbsReading: formData.hobbsReading
          ? parseFloat(formData.hobbsReading)
          : undefined,
        totalLandingCycles: formData.totalLandingCycles
          ? parseInt(formData.totalLandingCycles, 10)
          : undefined,
        typeCertificateNumber:
          formData.typeCertificateNumber.trim() || undefined,
      });

      // Create engines
      for (const eng of formData.engines) {
        if (eng.make.trim() && eng.model.trim() && eng.serialNumber.trim()) {
          await createEngine({
            aircraftId,
            organizationId: orgId as Id<"organizations">,
            make: eng.make.trim(),
            model: eng.model.trim(),
            serialNumber: eng.serialNumber.trim(),
            position: eng.position || undefined,
            totalTimeHours: parseFloat(eng.totalTimeHours) || 0,
            timeSinceOverhaulHours: eng.timeSinceOverhaulHours
              ? parseFloat(eng.timeSinceOverhaulHours)
              : undefined,
            timeBetweenOverhaulLimit: eng.timeBetweenOverhaulLimit
              ? parseFloat(eng.timeBetweenOverhaulLimit)
              : undefined,
          });
        }
      }

      toast.success(
        `Aircraft ${formData.nNumber || formData.serialNumber} added to fleet`,
      );
      resetWizard();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to add aircraft", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  const selectedCustomer = customers?.find(
    (c) => (c._id as string) === formData.customerId,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetWizard();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Aircraft to Fleet</DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} />

        {/* ── Step 1: FAA Lookup ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter an N-number to look up aircraft information from the FAA
              registry, or enter details manually.
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="Enter N-number (e.g. N12345)"
                value={lookupNNumber}
                onChange={(e) => setLookupNNumber(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            </div>

            <FaaLookupButton
              registration={lookupNNumber}
              onResult={handleFaaResult}
            />

            {/* Claim Card */}
            {faaResult?.found && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-primary" />
                    <span className="font-mono font-bold text-lg">
                      {faaResult.nNumber}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      FAA Registry
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    {faaResult.manufacturer && (
                      <>
                        <span className="text-muted-foreground">
                          Manufacturer
                        </span>
                        <span className="font-medium">
                          {faaResult.manufacturer}
                        </span>
                      </>
                    )}
                    {faaResult.model && (
                      <>
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-medium">{faaResult.model}</span>
                      </>
                    )}
                    {faaResult.serialNumber && (
                      <>
                        <span className="text-muted-foreground">
                          Serial Number
                        </span>
                        <span className="font-medium font-mono">
                          {faaResult.serialNumber}
                        </span>
                      </>
                    )}
                    {faaResult.yearOfManufacture && (
                      <>
                        <span className="text-muted-foreground">Year</span>
                        <span className="font-medium">
                          {faaResult.yearOfManufacture}
                        </span>
                      </>
                    )}
                    {faaResult.ownerName && (
                      <>
                        <span className="text-muted-foreground">
                          Registered Owner
                        </span>
                        <span className="font-medium">
                          {faaResult.ownerName}
                        </span>
                      </>
                    )}
                    {faaResult.typeAircraft && (
                      <>
                        <span className="text-muted-foreground">
                          Aircraft Type
                        </span>
                        <span className="font-medium">
                          {faaResult.typeAircraft}
                        </span>
                      </>
                    )}
                    {faaResult.engineType && (
                      <>
                        <span className="text-muted-foreground">
                          Engine Type
                        </span>
                        <span className="font-medium">
                          {faaResult.engineType}
                        </span>
                      </>
                    )}
                    {faaResult.certIssueDate && (
                      <>
                        <span className="text-muted-foreground">
                          Cert Issue Date
                        </span>
                        <span className="font-medium">
                          {faaResult.certIssueDate}
                        </span>
                      </>
                    )}
                    {faaResult.status && (
                      <>
                        <span className="text-muted-foreground">
                          FAA Status
                        </span>
                        <span className="font-medium">{faaResult.status}</span>
                      </>
                    )}
                  </div>

                  <Button
                    className="w-full mt-2 gap-2"
                    size="lg"
                    onClick={handleClaimAircraft}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    This Is My Aircraft
                  </Button>
                </CardContent>
              </Card>
            )}

            <Separator />

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={handleEnterManually}
            >
              Skip lookup — Enter details manually
            </Button>
          </div>
        )}

        {/* ── Step 2: Review & Edit ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Section 1: Aircraft Identity */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Plane className="h-4 w-4 text-primary" />
                Aircraft Identity
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-nnumber">N-Number</Label>
                  <Input
                    id="wiz-nnumber"
                    value={formData.nNumber}
                    onChange={(e) => updateField("nNumber", e.target.value)}
                    placeholder="N12345"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-make">
                    Make <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="wiz-make"
                    value={formData.make}
                    onChange={(e) => updateField("make", e.target.value)}
                    placeholder="e.g. Cessna"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-model">
                    Model <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="wiz-model"
                    value={formData.model}
                    onChange={(e) => updateField("model", e.target.value)}
                    placeholder="e.g. 172"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-series">Series</Label>
                  <Input
                    id="wiz-series"
                    value={formData.series}
                    onChange={(e) => updateField("series", e.target.value)}
                    placeholder="e.g. S"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-serial">
                    Serial Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="wiz-serial"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      updateField("serialNumber", e.target.value)
                    }
                    placeholder="Manufacturer Serial Number"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-year">Year of Manufacture</Label>
                  <Input
                    id="wiz-year"
                    type="number"
                    min={1903}
                    max={new Date().getFullYear() + 1}
                    value={formData.yearOfManufacture}
                    onChange={(e) =>
                      updateField("yearOfManufacture", e.target.value)
                    }
                    placeholder="e.g. 2008"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Aircraft Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Aircraft Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Aircraft Category</Label>
                  <Select
                    value={formData.aircraftCategory}
                    onValueChange={(v) =>
                      updateField("aircraftCategory", v as AircraftCategory)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AIRCRAFT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Operating Regulation</Label>
                  <Select
                    value={formData.operatingRegulation}
                    onValueChange={(v) =>
                      updateField(
                        "operatingRegulation",
                        v as OperatingRegulation,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATING_REGULATIONS.map((reg) => (
                        <SelectItem key={reg.value} value={reg.value}>
                          {reg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-engine-count">Engine Count</Label>
                  <Input
                    id="wiz-engine-count"
                    type="number"
                    min={1}
                    max={8}
                    value={formData.engineCount}
                    onChange={(e) => handleEngineCountChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-gross-weight">
                    Max Gross Weight (lbs)
                  </Label>
                  <Input
                    id="wiz-gross-weight"
                    type="number"
                    min={0}
                    value={formData.maxGrossWeightLbs}
                    onChange={(e) =>
                      updateField("maxGrossWeightLbs", e.target.value)
                    }
                    placeholder="e.g. 2550"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-base">Base Location (ICAO)</Label>
                  <Input
                    id="wiz-base"
                    value={formData.baseLocation}
                    onChange={(e) =>
                      updateField("baseLocation", e.target.value)
                    }
                    placeholder="e.g. KJFK"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-tc">Type Certificate Number</Label>
                  <Input
                    id="wiz-tc"
                    value={formData.typeCertificateNumber}
                    onChange={(e) =>
                      updateField("typeCertificateNumber", e.target.value)
                    }
                    placeholder="e.g. A00009CH"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-owner">Registered Owner</Label>
                  <Input
                    id="wiz-owner"
                    value={formData.ownerName}
                    onChange={(e) => updateField("ownerName", e.target.value)}
                    placeholder="Owner name from registration"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Switch
                    id="wiz-experimental"
                    checked={formData.experimental}
                    onCheckedChange={(v) => updateField("experimental", v)}
                  />
                  <Label htmlFor="wiz-experimental" className="cursor-pointer">
                    Experimental
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: Time Tracking */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" />
                Time Tracking
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Time data is not available from FAA records. Enter current
                  values from the aircraft logbook.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-ttaf">
                    TTAF Hours <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="wiz-ttaf"
                    type="number"
                    min={0}
                    step="0.1"
                    value={formData.totalTimeAirframeHours}
                    onChange={(e) =>
                      updateField("totalTimeAirframeHours", e.target.value)
                    }
                    placeholder="e.g. 3847.2"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-hobbs">Hobbs Reading</Label>
                  <Input
                    id="wiz-hobbs"
                    type="number"
                    min={0}
                    step="0.1"
                    value={formData.hobbsReading}
                    onChange={(e) =>
                      updateField("hobbsReading", e.target.value)
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-cycles">Total Landing Cycles</Label>
                  <Input
                    id="wiz-cycles"
                    type="number"
                    min={0}
                    value={formData.totalLandingCycles}
                    onChange={(e) =>
                      updateField("totalLandingCycles", e.target.value)
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 4: Engine Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="h-4 w-4 text-primary" />
                Engine Information
              </div>

              {formData.faaEngineType && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    FAA registry indicates engine type:{" "}
                    <strong className="text-foreground">
                      {formData.faaEngineType}
                    </strong>
                    . Enter specific engine details below.
                  </span>
                </div>
              )}

              {formData.engines.map((eng, i) => {
                const count = parseInt(formData.engineCount, 10) || 1;
                const posLabel = getEnginePositionLabel(i, count);

                return (
                  <Card key={i} className="border-border/60">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          Engine {posLabel}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label>Make</Label>
                          <Input
                            value={eng.make}
                            onChange={(e) =>
                              updateEngine(i, "make", e.target.value)
                            }
                            placeholder="e.g. Lycoming"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Model</Label>
                          <Input
                            value={eng.model}
                            onChange={(e) =>
                              updateEngine(i, "model", e.target.value)
                            }
                            placeholder="e.g. IO-360-L2A"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Serial Number</Label>
                          <Input
                            value={eng.serialNumber}
                            onChange={(e) =>
                              updateEngine(i, "serialNumber", e.target.value)
                            }
                            placeholder="Engine S/N"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Total Time Hours</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.1"
                            value={eng.totalTimeHours}
                            onChange={(e) =>
                              updateEngine(i, "totalTimeHours", e.target.value)
                            }
                            placeholder="e.g. 1850.5"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>TSO Hours</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.1"
                            value={eng.timeSinceOverhaulHours}
                            onChange={(e) =>
                              updateEngine(
                                i,
                                "timeSinceOverhaulHours",
                                e.target.value,
                              )
                            }
                            placeholder="Optional"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>TBO Limit</Label>
                          <Input
                            type="number"
                            min={0}
                            value={eng.timeBetweenOverhaulLimit}
                            onChange={(e) =>
                              updateEngine(
                                i,
                                "timeBetweenOverhaulLimit",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. 2000"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Separator />

            {/* Section 5: Customer Association */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-primary" />
                Customer Association
              </div>

              <Popover
                open={customerPopoverOpen}
                onOpenChange={setCustomerPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-sm font-normal"
                  >
                    {selectedCustomer ? (
                      <span>
                        {selectedCustomer.name}
                        {selectedCustomer.companyName &&
                          ` — ${selectedCustomer.companyName}`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Select a customer...
                      </span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  {!showQuickAdd ? (
                    <Command>
                      <CommandInput placeholder="Search customers..." />
                      <CommandList>
                        <CommandEmpty>No customers found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              updateField("customerId", "");
                              setCustomerPopoverOpen(false);
                            }}
                          >
                            <span className="text-muted-foreground">
                              No Customer
                            </span>
                          </CommandItem>
                          {customers?.map((c) => (
                            <CommandItem
                              key={c._id}
                              value={`${c.name} ${c.companyName ?? ""}`}
                              onSelect={() => {
                                updateField("customerId", c._id as string);
                                setCustomerPopoverOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span>{c.name}</span>
                                {c.companyName && (
                                  <span className="text-xs text-muted-foreground">
                                    {c.companyName}
                                  </span>
                                )}
                                <Badge
                                  variant="outline"
                                  className="text-[9px] ml-auto"
                                >
                                  {c.customerType.replace(/_/g, " ")}
                                </Badge>
                              </div>
                              {(c._id as string) === formData.customerId && (
                                <Check className="h-3.5 w-3.5 ml-auto text-primary" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => setShowQuickAdd(true)}
                            className="text-primary"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Add New Customer
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  ) : (
                    <div className="p-3 space-y-3">
                      <p className="text-sm font-medium">Quick Add Customer</p>
                      <div className="space-y-1.5">
                        <Label htmlFor="qa-name">
                          Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="qa-name"
                          value={quickAddName}
                          onChange={(e) => setQuickAddName(e.target.value)}
                          placeholder="Customer name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Select
                          value={quickAddType}
                          onValueChange={(v) =>
                            setQuickAddType(v as CustomerType)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="qa-email">Email</Label>
                        <Input
                          id="qa-email"
                          type="email"
                          value={quickAddEmail}
                          onChange={(e) => setQuickAddEmail(e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowQuickAdd(false)}
                          disabled={isCreatingCustomer}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleQuickAddCustomer}
                          disabled={
                            isCreatingCustomer || !quickAddName.trim()
                          }
                        >
                          {isCreatingCustomer ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : null}
                          Create
                        </Button>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Step 2 Navigation */}
            <DialogFooter className="flex-row gap-2 sm:justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button onClick={handleNextToConfirm} className="gap-1">
                Next: Review
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step 3: Confirm & Submit ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Aircraft Identity Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Plane className="h-4 w-4 text-primary" />
                Aircraft Identity
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">N-Number</span>
                <span className="font-mono font-medium">
                  {formData.nNumber || "—"}
                </span>
                <span className="text-muted-foreground">Make / Model</span>
                <span className="font-medium">
                  {formData.make} {formData.model}
                  {formData.series ? ` ${formData.series}` : ""}
                </span>
                <span className="text-muted-foreground">Serial Number</span>
                <span className="font-mono font-medium">
                  {formData.serialNumber}
                </span>
                {formData.yearOfManufacture && (
                  <>
                    <span className="text-muted-foreground">Year</span>
                    <span className="font-medium">
                      {formData.yearOfManufacture}
                    </span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Details Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Aircraft Details
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium capitalize">
                  {formData.aircraftCategory.replace(/_/g, " ")}
                </span>
                <span className="text-muted-foreground">Experimental</span>
                <span className="font-medium">
                  {formData.experimental ? "Yes" : "No"}
                </span>
                <span className="text-muted-foreground">Engine Count</span>
                <span className="font-medium">{formData.engineCount}</span>
                {formData.maxGrossWeightLbs && (
                  <>
                    <span className="text-muted-foreground">
                      Max Gross Weight
                    </span>
                    <span className="font-medium">
                      {formData.maxGrossWeightLbs} lbs
                    </span>
                  </>
                )}
                {formData.baseLocation && (
                  <>
                    <span className="text-muted-foreground">Base Location</span>
                    <span className="font-mono font-medium">
                      {formData.baseLocation}
                    </span>
                  </>
                )}
                {formData.operatingRegulation && (
                  <>
                    <span className="text-muted-foreground">
                      Operating Regulation
                    </span>
                    <span className="font-medium">
                      {OPERATING_REGULATIONS.find(
                        (r) => r.value === formData.operatingRegulation,
                      )?.label ?? formData.operatingRegulation}
                    </span>
                  </>
                )}
                {formData.ownerName && (
                  <>
                    <span className="text-muted-foreground">
                      Registered Owner
                    </span>
                    <span className="font-medium">{formData.ownerName}</span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Time Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" />
                Time Tracking
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">TTAF Hours</span>
                <span className="font-mono font-medium">
                  {formData.totalTimeAirframeHours}
                </span>
                {formData.hobbsReading && (
                  <>
                    <span className="text-muted-foreground">Hobbs Reading</span>
                    <span className="font-mono font-medium">
                      {formData.hobbsReading}
                    </span>
                  </>
                )}
                {formData.totalLandingCycles && (
                  <>
                    <span className="text-muted-foreground">
                      Landing Cycles
                    </span>
                    <span className="font-mono font-medium">
                      {formData.totalLandingCycles}
                    </span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Engines Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="h-4 w-4 text-primary" />
                Engines
              </div>
              {formData.engines.some(
                (e) => e.make.trim() || e.model.trim(),
              ) ? (
                <div className="space-y-2">
                  {formData.engines.map((eng, i) => {
                    if (!eng.make.trim() && !eng.model.trim()) return null;
                    const count = parseInt(formData.engineCount, 10) || 1;
                    return (
                      <Card key={i} className="border-border/60">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {getEnginePositionLabel(i, count)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                            <span className="text-muted-foreground">
                              Make / Model
                            </span>
                            <span className="font-medium">
                              {eng.make} {eng.model}
                            </span>
                            {eng.serialNumber && (
                              <>
                                <span className="text-muted-foreground">
                                  S/N
                                </span>
                                <span className="font-mono font-medium">
                                  {eng.serialNumber}
                                </span>
                              </>
                            )}
                            {eng.totalTimeHours && (
                              <>
                                <span className="text-muted-foreground">
                                  Total Time
                                </span>
                                <span className="font-mono font-medium">
                                  {eng.totalTimeHours} hrs
                                </span>
                              </>
                            )}
                            {eng.timeSinceOverhaulHours && (
                              <>
                                <span className="text-muted-foreground">
                                  TSO
                                </span>
                                <span className="font-mono font-medium">
                                  {eng.timeSinceOverhaulHours} hrs
                                </span>
                              </>
                            )}
                            {eng.timeBetweenOverhaulLimit && (
                              <>
                                <span className="text-muted-foreground">
                                  TBO
                                </span>
                                <span className="font-mono font-medium">
                                  {eng.timeBetweenOverhaulLimit} hrs
                                </span>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No engine details provided. Engines can be added later from
                  the aircraft detail page.
                </p>
              )}
            </div>

            <Separator />

            {/* Customer Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-primary" />
                Customer
              </div>
              <p className="text-sm">
                {selectedCustomer ? (
                  <span className="font-medium">
                    {selectedCustomer.name}
                    {selectedCustomer.companyName &&
                      ` — ${selectedCustomer.companyName}`}
                    <Badge
                      variant="outline"
                      className="text-[9px] ml-2 align-middle"
                    >
                      {selectedCustomer.customerType.replace(/_/g, " ")}
                    </Badge>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    No customer assigned
                  </span>
                )}
              </p>
            </div>

            {/* Step 3 Navigation */}
            <DialogFooter className="flex-row gap-2 sm:justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to Edit
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !orgId}
                className="gap-1.5"
              >
                {isSubmitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isSubmitting ? "Adding..." : "Add Aircraft to Fleet"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
