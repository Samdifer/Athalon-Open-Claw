import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Image as ImageIcon,
  List,
  ListCollapse,
  PlaneTakeoff,
  Plus,
  Radar,
  Search,
  Star,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ExportCSVButton } from "@/src/shared/components/ExportCSVButton";
import { FaaLookupButton } from "@/components/faa/FaaLookupButton";
import { AddAircraftWizard } from "./_components/AddAircraftWizard";
import { LLPAlertBanner } from "./_components/LLPAlertBanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ScheduleFilter =
  | "all"
  | "in_work"
  | "next_3_months"
  | "next_6_months"
  | "next_12_months";

type FleetViewMode = "list" | "tiles" | "truncated";

function getStatusStyle(status: string): {
  color: string;
  dot: string;
  label: string;
} {
  const map: Record<string, { color: string; dot: string; label: string }> = {
    airworthy: {
      color: "bg-green-500/15 text-green-400 border-green-500/30",
      dot: "bg-green-400",
      label: "Airworthy",
    },
    airworthy_with_limitations: {
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      dot: "bg-amber-400",
      label: "Airworthy w/ Limitations",
    },
    in_maintenance: {
      color: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      dot: "bg-sky-400",
      label: "In Maintenance",
    },
    out_of_service: {
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      dot: "bg-amber-400",
      label: "Out of Service",
    },
    sold: {
      color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      dot: "bg-slate-400",
      label: "Sold",
    },
    destroyed: {
      color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      dot: "bg-slate-400",
      label: "Destroyed",
    },
  };
  return (
    map[status] ?? {
      color: "bg-muted text-muted-foreground border-border/30",
      dot: "bg-muted-foreground",
      label: status,
    }
  );
}

function classifyAircraftStyle(make?: string, model?: string): string {
  const text = `${make ?? ""} ${model ?? ""}`.toLowerCase();
  if (
    text.includes("king air") ||
    text.includes("pc-12") ||
    text.includes("tbm") ||
    text.includes("caravan")
  ) {
    return "Turboprop";
  }
  if (
    text.includes("citation cj") ||
    text.includes("citation m2") ||
    text.includes("phenom") ||
    text.includes("learjet") ||
    text.includes("honda jet")
  ) {
    return "Light Jet";
  }
  if (
    text.includes("global 7500") ||
    text.includes("global 6500") ||
    text.includes("g650") ||
    text.includes("g700") ||
    text.includes("falcon 8x") ||
    text.includes("falcon 7x")
  ) {
    return "Ultra Long Range";
  }
  if (
    text.includes("challenger 300") ||
    text.includes("challenger 350") ||
    text.includes("longitude") ||
    text.includes("praetor 600")
  ) {
    return "Super Mid Size";
  }
  if (
    text.includes("hawker") ||
    text.includes("citation xls") ||
    text.includes("mid size") ||
    text.includes("praetor 500")
  ) {
    return "Mid Size";
  }
  return "Other";
}

function isWithinNextMonths(targetDateMs: number | null | undefined, months: number): boolean {
  if (!targetDateMs) return false;
  const now = Date.now();
  if (targetDateMs < now) return false;
  const max = new Date(now);
  max.setMonth(max.getMonth() + months);
  return targetDateMs <= max.getTime();
}

function FleetCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-12 rounded-md flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FaaLookupDialog() {
  const [nNumber, setNNumber] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Radar className="w-3.5 h-3.5" />
          FAA Lookup
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>FAA Aircraft Registry Lookup</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Enter N-number (e.g. N12345)"
            value={nNumber}
            onChange={(e) => setNNumber(e.target.value)}
          />
          <FaaLookupButton registration={nNumber} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AircraftPhotoThumb({
  storageId,
  alt,
}: {
  storageId: Id<"_storage">;
  alt: string;
}) {
  const url = useQuery(api.documents.getDocumentUrl, { storageId });
  if (!url) {
    return <div className="w-14 h-10 rounded border border-border/60 bg-muted/40" />;
  }
  return (
    <img
      src={url}
      alt={alt}
      className="w-14 h-10 rounded border border-border/60 object-cover"
      loading="lazy"
    />
  );
}

function AircraftPhotoManagerDialog({
  organizationId,
  aircraftId,
  registration,
  imageCount,
}: {
  organizationId: Id<"organizations">;
  aircraftId: string;
  registration: string;
  imageCount: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadFeatured, setUploadFeatured] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [open, setOpen] = useState(false);

  const docs = useQuery(
    api.documents.listDocuments,
    open
      ? {
          attachedToTable: "aircraft",
          attachedToId: aircraftId,
        }
      : "skip",
  );

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveDocument = useMutation(api.documents.saveDocument);
  const markFeatured = useMutation(api.documents.markAircraftPhotoFeatured);

  const imageDocs = useMemo(() => {
    const rows = (docs ?? []).filter((doc) => doc.mimeType.startsWith("image/"));
    rows.sort((a, b) => b.uploadedAt - a.uploadedAt);
    return rows;
  }, [docs]);

  const selected = imageDocs[selectedIdx] ?? null;
  const selectedUrl = useQuery(
    api.documents.getDocumentUrl,
    selected ? { storageId: selected.storageId } : "skip",
  );

  const featuredIndex = imageDocs.findIndex((doc) =>
    (doc.description ?? "").toLowerCase().includes("[featured]"),
  );

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported.");
      return;
    }

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status}).`);
      const { storageId } = await response.json();

      const sanitizedRegistration = (registration || "AIRCRAFT").replace(/[^a-zA-Z0-9_-]/g, "");
      const fileName = `${sanitizedRegistration}_${Date.now()}_${file.name}`;
      const description = uploadFeatured ? "[featured] Fleet image" : "Fleet gallery image";

      const documentId = await saveDocument({
        organizationId,
        attachedToTable: "aircraft",
        attachedToId: aircraftId,
        storageId,
        fileName,
        fileSize: file.size,
        mimeType: file.type,
        documentType: "photo",
        description,
      });

      if (uploadFeatured) {
        await markFeatured({
          organizationId,
          aircraftId,
          documentId,
        });
      }

      toast.success("Aircraft photo uploaded.");
      setUploadFeatured(false);
      event.target.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSetFeatured(documentId: Id<"documents">) {
    try {
      await markFeatured({
        organizationId,
        aircraftId,
        documentId,
      });
      toast.success("Featured aircraft image updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set featured image.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5">
          <Camera className="w-3 h-3" />
          Photos ({imageCount})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aircraft Photos — {registration || "Unregistered"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={uploadFeatured}
                onChange={(e) => setUploadFeatured(e.target.checked)}
              />
              Upload as featured thumbnail
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="text-xs"
            />
          </div>

          {imageDocs.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No photos uploaded for this aircraft.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border border-border/60 rounded-md bg-muted/20 p-2">
                {selectedUrl ? (
                  <img
                    src={selectedUrl}
                    alt={`${registration} selected`}
                    className="w-full h-[280px] object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-[280px] rounded bg-muted/40" />
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {selected?.fileName}
                  </p>
                  {selected && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1.5"
                      onClick={() => handleSetFeatured(selected._id)}
                    >
                      <Star className="w-3 h-3" />
                      Set Featured
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setSelectedIdx((idx) =>
                      idx <= 0 ? Math.max(0, imageDocs.length - 1) : idx - 1,
                    )
                  }
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {imageDocs.map((doc, idx) => {
                    const isFeatured = idx === featuredIndex;
                    return (
                      <button
                        key={String(doc._id)}
                        onClick={() => setSelectedIdx(idx)}
                        className={`relative ${
                          idx === selectedIdx ? "ring-2 ring-primary rounded" : ""
                        }`}
                        title={isFeatured ? "Featured image" : "Aircraft image"}
                      >
                        <AircraftPhotoThumb storageId={doc.storageId} alt={doc.fileName} />
                        {isFeatured && (
                          <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5">
                            <Star className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setSelectedIdx((idx) =>
                      idx >= imageDocs.length - 1 ? 0 : idx + 1,
                    )
                  }
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FleetPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const fleet = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId } : "skip",
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [viewMode, setViewMode] = useState<FleetViewMode>("list");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [makeFilter, setMakeFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  // BUG-DOM-105: Fleet list had no sort control — always alphabetical by registration.
  // A DOM's first question each morning is "what's down today?" — they need to sort by
  // status (out-of-service / in-maintenance first) or by next scheduled date (soonest
  // due first) to quickly understand dispatch readiness. Scrolling through an alphabetical
  // list of 20 aircraft to identify the 2 that are down is friction that adds up daily.
  const [sortKey, setSortKey] = useState<"registration" | "status" | "next_scheduled">("registration");
  const [addAircraftOpen, setAddAircraftOpen] = useState(false);

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customers ?? []) {
      map.set(customer._id, customer.name);
    }
    return map;
  }, [customers]);

  const classOptions = useMemo(() => {
    const values = new Set<string>();
    for (const ac of fleet ?? []) {
      values.add(classifyAircraftStyle(ac.make, ac.model));
    }
    return [...values].sort();
  }, [fleet]);

  const makeOptions = useMemo(() => {
    const values = new Set<string>();
    for (const ac of fleet ?? []) {
      if (ac.make) values.add(ac.make);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [fleet]);

  const modelOptions = useMemo(() => {
    const values = new Set<string>();
    for (const ac of fleet ?? []) {
      if (makeFilter !== "all" && ac.make !== makeFilter) continue;
      if (ac.model) values.add(ac.model);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [fleet, makeFilter]);

  const filtered = useMemo(() => {
    const rows = fleet ?? [];
    return rows
      .filter((ac) => {
        const style = classifyAircraftStyle(ac.make, ac.model);
        const customerName = ac.customerId ? customerMap.get(ac.customerId) ?? "" : "";
        const searchBlob = `${ac.currentRegistration ?? ""} ${ac.serialNumber} ${customerName} ${ac.make} ${ac.model}`.toLowerCase();
        if (searchTerm.trim() && !searchBlob.includes(searchTerm.toLowerCase().trim())) return false;

        if (scheduleFilter === "in_work" && (ac.openWorkOrderCount ?? 0) <= 0) return false;
        if (scheduleFilter === "next_3_months" && !isWithinNextMonths(ac.nextScheduledStartDate, 3)) return false;
        if (scheduleFilter === "next_6_months" && !isWithinNextMonths(ac.nextScheduledStartDate, 6)) return false;
        if (scheduleFilter === "next_12_months" && !isWithinNextMonths(ac.nextScheduledStartDate, 12)) return false;

        if (classFilter !== "all" && style !== classFilter) return false;
        if (makeFilter !== "all" && ac.make !== makeFilter) return false;
        if (modelFilter !== "all" && ac.model !== modelFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortKey === "status") {
          // Priority order: out_of_service → in_maintenance → airworthy_with_limitations → airworthy → others
          const statusOrder: Record<string, number> = {
            out_of_service: 0,
            in_maintenance: 1,
            airworthy_with_limitations: 2,
            airworthy: 3,
          };
          const aOrd = statusOrder[a.status] ?? 4;
          const bOrd = statusOrder[b.status] ?? 4;
          if (aOrd !== bOrd) return aOrd - bOrd;
        } else if (sortKey === "next_scheduled") {
          // Soonest scheduled first; aircraft with no scheduled date sort to end
          const aMs = a.nextScheduledStartDate ?? Infinity;
          const bMs = b.nextScheduledStartDate ?? Infinity;
          if (aMs !== bMs) return aMs - bMs;
        }
        // Fallback: alphabetical by registration
        const aKey = (a.currentRegistration ?? a.serialNumber).toUpperCase();
        const bKey = (b.currentRegistration ?? b.serialNumber).toUpperCase();
        return aKey.localeCompare(bKey);
      });
  }, [classFilter, customerMap, fleet, makeFilter, modelFilter, scheduleFilter, searchTerm, sortKey]);

  const exportRows = useMemo(
    () =>
      filtered.map((ac) => ({
        registration: ac.currentRegistration ?? "",
        make: ac.make ?? "",
        model: ac.model ?? "",
        status: getStatusStyle(ac.status).label,
        totalTime: ac.totalTimeAirframeHours != null ? String(ac.totalTimeAirframeHours) : "",
        nextScheduled: ac.nextScheduledStartDate ? new Date(ac.nextScheduledStartDate).toISOString() : "",
      })),
    [filtered],
  );

  const totalCount = fleet?.length ?? 0;
  const filteredCount = filtered.length;
  const isFiltering =
    searchTerm.trim() !== "" ||
    scheduleFilter !== "all" ||
    classFilter !== "all" ||
    makeFilter !== "all" ||
    modelFilter !== "all";

  const renderTitle = (ac: any) => (
    <div className="flex items-center gap-2.5 flex-wrap">
      <span className="font-mono font-bold text-base text-foreground">
        {ac.currentRegistration ?? "Unregistered"}
      </span>
      <Badge className={`border text-[10px] ${getStatusStyle(ac.status).color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(ac.status).dot} mr-1`} />
        {getStatusStyle(ac.status).label}
      </Badge>
      <Badge variant="outline" className="text-[10px] border-border/60 text-muted-foreground">
        {classifyAircraftStyle(ac.make, ac.model)}
      </Badge>
      {(ac.openWorkOrderCount ?? 0) > 0 && (
        <Badge className="text-[10px] border border-sky-500/30 bg-sky-500/15 text-sky-400">
          {ac.openWorkOrderCount} in work
        </Badge>
      )}
    </div>
  );

  const renderMeta = (ac: any) => (
    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{ac.make} {ac.model}</span>
      <span>•</span>
      <span>S/N {ac.serialNumber}</span>
      {ac.customerId ? (
        <>
          <span>•</span>
          <span>{customerMap.get(ac.customerId) ?? "Customer"}</span>
        </>
      ) : null}
      {ac.nextScheduledStartDate ? (
        <>
          <span>•</span>
          <span>Next scheduled {new Date(ac.nextScheduledStartDate).toLocaleDateString("en-US", { timeZone: "UTC" })}</span>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Fleet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isFiltering
              ? `${filteredCount} of ${totalCount} aircraft`
              : `${totalCount} aircraft registered`}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <ExportCSVButton
            data={exportRows}
            columns={[
              { key: "registration", header: "Registration" },
              { key: "make", header: "Make" },
              { key: "model", header: "Model" },
              { key: "status", header: "Status" },
              { key: "totalTime", header: "Total Time" },
              { key: "nextScheduled", header: "Next Scheduled" },
            ]}
            fileName="fleet.csv"
            showDateFilter
            dateFieldKey="nextScheduled"
            className="gap-1.5 text-xs"
          />
          <FaaLookupDialog />
          <Button size="sm" className="flex-1 sm:flex-initial" onClick={() => setAddAircraftOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Aircraft
          </Button>
        </div>
      </div>

      <LLPAlertBanner />

      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_170px_170px_170px_170px_160px_auto] gap-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search N-number, serial, customer, make/model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-muted/30 border-border/60"
            />
          </div>

          <Select value={scheduleFilter} onValueChange={(v) => setScheduleFilter(v as ScheduleFilter)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Schedule window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All aircraft</SelectItem>
              <SelectItem value="in_work">Currently in work</SelectItem>
              <SelectItem value="next_3_months">Scheduled next 3 months</SelectItem>
              <SelectItem value="next_6_months">Scheduled next 6 months</SelectItem>
              <SelectItem value="next_12_months">Scheduled next 12 months</SelectItem>
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={(v) => setClassFilter(v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Aircraft class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={makeFilter}
            onValueChange={(v) => {
              setMakeFilter(v);
              setModelFilter("all");
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Make" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All makes</SelectItem>
              {makeOptions.map((make) => (
                <SelectItem key={make} value={make}>
                  {make}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={modelFilter} onValueChange={(v) => setModelFilter(v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All models</SelectItem>
              {modelOptions.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="registration">Sort: N-number</SelectItem>
              <SelectItem value="status">Sort: Status (down first)</SelectItem>
              <SelectItem value="next_scheduled">Sort: Next scheduled</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center justify-end gap-1">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
              title="List view"
              data-testid="fleet-view-list"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === "tiles" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("tiles")}
              title="Tile view"
              data-testid="fleet-view-tiles"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === "truncated" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("truncated")}
              title="Truncated list"
              data-testid="fleet-view-truncated"
            >
              <ListCollapse className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {!isLoaded && (
        <div className="grid gap-3">
          <FleetCardSkeleton />
          <FleetCardSkeleton />
          <FleetCardSkeleton />
        </div>
      )}

      {isLoaded && !orgId && (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <PlaneTakeoff className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No organization context available
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Ask your administrator to link your account to a technician profile.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoaded && orgId && fleet === undefined && (
        <div className="grid gap-3">
          <FleetCardSkeleton />
          <FleetCardSkeleton />
          <FleetCardSkeleton />
        </div>
      )}

      {fleet !== undefined && fleet.length === 0 && (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <PlaneTakeoff className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No aircraft in your fleet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Add your first aircraft to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {fleet !== undefined && fleet.length > 0 && filtered.length === 0 && (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <Search className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No aircraft match this filter</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Adjust the search or filters to see more results.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                // BUG-DOM-114: "Clear Filters" left sort mode untouched (e.g., "Status"),
                // so the list still looked non-default after reset. DOM users expect a
                // full return-to-baseline view when clearing all filters.
                setSearchTerm("");
                setScheduleFilter("all");
                setClassFilter("all");
                setMakeFilter("all");
                setModelFilter("all");
                setSortKey("registration");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {filtered.length > 0 && viewMode === "list" && (
        <div className="space-y-2" data-testid="fleet-view-list-container">
          {filtered.map((ac) => (
            <Card key={String(ac._id)} className="border-border/60 hover:border-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-28 h-20 rounded-md border border-border/60 bg-muted/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {ac.featuredImageUrl ? (
                      <img
                        src={ac.featuredImageUrl}
                        alt={`${ac.currentRegistration ?? ac.serialNumber} thumbnail`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    {renderTitle(ac)}
                    {renderMeta(ac)}
                    <div className="flex items-center gap-2 pt-1.5">
                      <AircraftPhotoManagerDialog
                        organizationId={orgId as Id<"organizations">}
                        aircraftId={String(ac._id)}
                        registration={ac.currentRegistration ?? ""}
                        imageCount={ac.galleryImageCount ?? 0}
                      />
                      <Button asChild size="sm" className="h-7 text-[11px]">
                        {/* BUG-DOM-109: Registration values can contain characters like "/" or spaces
                            (common with imported legacy tail formats). Unencoded route params break
                            navigation to fleet detail/logbook pages because react-router treats "/"
                            as a path separator. Always URL-encode the tail identifier. */}
                        <Link to={`/fleet/${encodeURIComponent(ac.currentRegistration ?? ac.serialNumber)}`}>
                          Open
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filtered.length > 0 && viewMode === "tiles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" data-testid="fleet-view-tiles-container">
          {filtered.map((ac) => (
            <Card key={String(ac._id)} className="border-border/60 hover:border-primary/30 transition-all">
              <CardContent className="p-3">
                <div className="w-full h-40 rounded-md border border-border/60 bg-muted/20 overflow-hidden flex items-center justify-center mb-2.5">
                  {ac.featuredImageUrl ? (
                    <img
                      src={ac.featuredImageUrl}
                      alt={`${ac.currentRegistration ?? ac.serialNumber} thumbnail`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="space-y-1.5">
                  {renderTitle(ac)}
                  {renderMeta(ac)}
                  <div className="flex items-center justify-between pt-1">
                    <AircraftPhotoManagerDialog
                      organizationId={orgId as Id<"organizations">}
                      aircraftId={String(ac._id)}
                      registration={ac.currentRegistration ?? ""}
                      imageCount={ac.galleryImageCount ?? 0}
                    />
                    <Button asChild size="sm" className="h-7 text-[11px]">
                      <Link to={`/fleet/${encodeURIComponent(ac.currentRegistration ?? ac.serialNumber)}`}>
                        Open
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filtered.length > 0 && viewMode === "truncated" && (
        <div className="border border-border/60 rounded-md divide-y divide-border/40" data-testid="fleet-view-truncated-container">
          {filtered.map((ac) => (
            <div key={String(ac._id)} className="px-3 py-2.5 flex items-center justify-between gap-3">
              {/* BUG-DOM-108: Truncated view omitted the status badge. A DOM scanning
                  the fleet in compact mode couldn't tell which aircraft were airworthy vs
                  in-maintenance vs out-of-service without switching to full list view.
                  Status is the single most important field for dispatch readiness. */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold">
                    {ac.currentRegistration ?? "Unregistered"}
                  </span>
                  <Badge className={`border text-[10px] ${getStatusStyle(ac.status).color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(ac.status).dot} mr-1`} />
                    {getStatusStyle(ac.status).label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-border/60">
                    {classifyAircraftStyle(ac.make, ac.model)}
                  </Badge>
                  {(ac.openWorkOrderCount ?? 0) > 0 && (
                    <span className="text-[10px] text-sky-500">
                      {ac.openWorkOrderCount} in work
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {ac.make} {ac.model} • S/N {ac.serialNumber}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <AircraftPhotoManagerDialog
                  organizationId={orgId as Id<"organizations">}
                  aircraftId={String(ac._id)}
                  registration={ac.currentRegistration ?? ""}
                  imageCount={ac.galleryImageCount ?? 0}
                />
                <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                  <Link to={`/fleet/${encodeURIComponent(ac.currentRegistration ?? ac.serialNumber)}`}>
                    Open
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddAircraftWizard
        open={addAircraftOpen}
        onOpenChange={setAddAircraftOpen}
      />
    </div>
  );
}
