"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Plus,
  Building2,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceType =
  | "repair"
  | "overhaul"
  | "test"
  | "calibration"
  | "inspection"
  | "fabrication"
  | "cleaning"
  | "plating"
  | "painting"
  | "ndt"
  | "other";

type VendorServiceOption = {
  id: string;
  serviceName: string;
  serviceType: ServiceType;
  description?: string;
  estimatedCost?: number;
};

type VendorOption = {
  id: string;
  name: string;
  type: string;
  isApproved: boolean;
  services: VendorServiceOption[];
};

export type AttachmentDetails = {
  vendorId: string;
  vendorName: string;
  vendorServiceId?: string;
  serviceName: string;
  serviceType?: string;
  estimatedCost?: number;
  notes?: string;
  status:
    | "planned"
    | "sent_for_work"
    | "in_progress"
    | "completed"
    | "cancelled";
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (details: AttachmentDetails) => void;
  taskCardId: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  repair: "Repair",
  overhaul: "Overhaul",
  test: "Test",
  calibration: "Calibration",
  inspection: "Inspection",
  fabrication: "Fabrication",
  cleaning: "Cleaning",
  plating: "Plating",
  painting: "Painting",
  ndt: "NDT",
  other: "Other",
};

const VENDOR_TYPE_LABEL: Record<string, string> = {
  parts_supplier: "Parts Supplier",
  contract_maintenance: "Contract Maintenance",
  calibration_lab: "Calibration Lab",
  DER: "DER",
  consumables_supplier: "Consumables",
  service_provider: "Service Provider",
  other: "Other",
};

function getServiceTypeBadgeClass(serviceType: ServiceType): string {
  switch (serviceType) {
    case "ndt":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
    case "repair":
    case "overhaul":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "calibration":
    case "inspection":
      return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30";
    case "fabrication":
    case "cleaning":
    case "plating":
    case "painting":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "test":
    case "other":
    default:
      return "bg-muted text-muted-foreground border-muted-foreground/30";
  }
}

const STATUS_OPTIONS: { value: AttachmentDetails["status"]; label: string }[] =
  [
    { value: "planned", label: "Planned" },
    { value: "sent_for_work", label: "Sent for Work" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

const INITIAL_DEMO_VENDORS: VendorOption[] = [
  {
    id: "v-1",
    name: "Southwest NDT Services",
    type: "service_provider",
    isApproved: true,
    services: [
      {
        id: "vs-1",
        serviceName: "Fluorescent Penetrant Inspection",
        serviceType: "ndt",
        estimatedCost: 275,
      },
      {
        id: "vs-2",
        serviceName: "Magnetic Particle Inspection",
        serviceType: "ndt",
        estimatedCost: 195,
      },
    ],
  },
  {
    id: "v-2",
    name: "Rocky Mountain Component Repair",
    type: "contract_maintenance",
    isApproved: true,
    services: [
      {
        id: "vs-3",
        serviceName: "Brake Assembly Overhaul",
        serviceType: "overhaul",
        description: "Cleveland/Goodyear",
        estimatedCost: 450,
      },
    ],
  },
  {
    id: "v-3",
    name: "Summit Avionics Calibration Lab",
    type: "calibration_lab",
    isApproved: true,
    services: [
      {
        id: "vs-4",
        serviceName: "Altimeter Calibration",
        serviceType: "calibration",
        estimatedCost: 185,
      },
      {
        id: "vs-5",
        serviceName: "Transponder Certification",
        serviceType: "calibration",
        estimatedCost: 225,
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

type ModalView =
  | { kind: "search" }
  | {
      kind: "detail";
      vendorId: string;
      vendorName: string;
      service?: VendorServiceOption;
    };

export function VendorServicePickerModal({
  open,
  onOpenChange,
  onAttach,
}: Props) {
  // View state
  const [view, setView] = useState<ModalView>({ kind: "search" });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>(INITIAL_DEMO_VENDORS);

  // Quick-create vendor state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorType, setNewVendorType] = useState("service_provider");
  const [newVendorContact, setNewVendorContact] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");

  // Attachment detail state
  const [detailServiceName, setDetailServiceName] = useState("");
  const [detailServiceType, setDetailServiceType] = useState<ServiceType>("other");
  const [detailStatus, setDetailStatus] = useState<AttachmentDetails["status"]>("planned");
  const [detailCost, setDetailCost] = useState("");
  const [detailNotes, setDetailNotes] = useState("");

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter((v) => v.name.toLowerCase().includes(q));
  }, [vendors, searchQuery]);

  function resetModal() {
    setView({ kind: "search" });
    setSearchQuery("");
    setExpandedVendorId(null);
    setShowCreateForm(false);
    resetCreateForm();
    resetDetailForm();
  }

  function resetCreateForm() {
    setNewVendorName("");
    setNewVendorType("service_provider");
    setNewVendorContact("");
    setNewVendorPhone("");
  }

  function resetDetailForm() {
    setDetailServiceName("");
    setDetailServiceType("other");
    setDetailStatus("planned");
    setDetailCost("");
    setDetailNotes("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetModal();
    onOpenChange(next);
  }

  function handleSelectService(vendor: VendorOption, service: VendorServiceOption) {
    setDetailServiceName(service.serviceName);
    setDetailServiceType(service.serviceType);
    setDetailCost(service.estimatedCost?.toString() ?? "");
    setDetailStatus("planned");
    setDetailNotes("");
    setView({
      kind: "detail",
      vendorId: vendor.id,
      vendorName: vendor.name,
      service,
    });
  }

  function handleCreateVendor() {
    const id = `v-new-${Date.now()}`;
    const newVendor: VendorOption = {
      id,
      name: newVendorName.trim(),
      type: newVendorType,
      isApproved: false,
      services: [],
    };
    setVendors((prev) => [...prev, newVendor]);
    resetCreateForm();
    setShowCreateForm(false);
    // Open detail view for new vendor with no pre-selected service
    setDetailServiceName("");
    setDetailServiceType("other");
    setDetailCost("");
    setDetailStatus("planned");
    setDetailNotes("");
    setView({ kind: "detail", vendorId: id, vendorName: newVendor.name });
  }

  function handleAttach() {
    if (view.kind !== "detail") return;
    const costNum = detailCost.trim() ? parseFloat(detailCost) : undefined;
    onAttach({
      vendorId: view.vendorId,
      vendorName: view.vendorName,
      vendorServiceId: view.service?.id,
      serviceName: detailServiceName.trim(),
      serviceType: detailServiceType,
      estimatedCost: costNum !== undefined && !isNaN(costNum) ? costNum : undefined,
      notes: detailNotes.trim() || undefined,
      status: detailStatus,
    });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4" />
            {view.kind === "search"
              ? "Attach Vendor Service"
              : `Attach service from ${view.vendorName}`}
          </DialogTitle>
        </DialogHeader>

        {/* ─── View 1: Vendor Search ─── */}
        {view.kind === "search" && (
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendors..."
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Vendor list */}
            <div className="space-y-0 divide-y divide-border/40">
              {filteredVendors.map((vendor) => {
                const isExpanded = expandedVendorId === vendor.id;
                return (
                  <div key={vendor.id}>
                    {/* Vendor row */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 py-2.5 px-1 text-left hover:bg-muted/20 transition-colors"
                      onClick={() =>
                        setExpandedVendorId(isExpanded ? null : vendor.id)
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-foreground flex-1 truncate">
                        {vendor.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] text-muted-foreground border-border/50"
                      >
                        {VENDOR_TYPE_LABEL[vendor.type] ?? vendor.type}
                      </Badge>
                      {vendor.isApproved && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30"
                        >
                          AVL
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {vendor.services.length} svc
                      </span>
                    </button>

                    {/* Expanded services */}
                    {isExpanded && (
                      <div className="ml-6 mb-2 space-y-1">
                        {vendor.services.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic py-1.5 pl-1">
                            No services defined
                          </p>
                        ) : (
                          vendor.services.map((svc) => (
                            <div
                              key={svc.id}
                              className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/10 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-foreground">
                                  {svc.serviceName}
                                </span>
                                {svc.description && (
                                  <span className="text-[10px] text-muted-foreground ml-1.5">
                                    ({svc.description})
                                  </span>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-[10px] border flex-shrink-0 ${getServiceTypeBadgeClass(svc.serviceType)}`}
                              >
                                {SERVICE_TYPE_LABEL[svc.serviceType]}
                              </Badge>
                              {svc.estimatedCost !== undefined && (
                                <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                                  ${svc.estimatedCost}
                                </span>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectService(vendor, svc);
                                }}
                              >
                                Select
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick-create vendor */}
            <div className="border-t border-border/40 pt-3">
              {!showCreateForm ? (
                <button
                  type="button"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1.5"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create new vendor
                </button>
              ) : (
                <div className="space-y-2 p-3 rounded-md border border-border/60 bg-muted/20">
                  <p className="text-xs font-medium text-foreground">
                    New Vendor
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">
                        Vendor Name *
                      </label>
                      <Input
                        value={newVendorName}
                        onChange={(e) => setNewVendorName(e.target.value)}
                        placeholder="Vendor name"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">
                        Type
                      </label>
                      <Select
                        value={newVendorType}
                        onValueChange={setNewVendorType}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(VENDOR_TYPE_LABEL).map(
                            ([value, label]) => (
                              <SelectItem
                                key={value}
                                value={value}
                                className="text-xs"
                              >
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">
                        Contact Name
                      </label>
                      <Input
                        value={newVendorContact}
                        onChange={(e) => setNewVendorContact(e.target.value)}
                        placeholder="Optional"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">
                        Contact Phone
                      </label>
                      <Input
                        value={newVendorPhone}
                        onChange={(e) => setNewVendorPhone(e.target.value)}
                        placeholder="Optional"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setShowCreateForm(false);
                        resetCreateForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!newVendorName.trim()}
                      onClick={handleCreateVendor}
                    >
                      Save & Continue
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── View 2: Attachment Details ─── */}
        {view.kind === "detail" && (
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  Service Name *
                </label>
                <Input
                  value={detailServiceName}
                  onChange={(e) => setDetailServiceName(e.target.value)}
                  placeholder="Name of the service"
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    Service Type
                  </label>
                  <Select
                    value={detailServiceType}
                    onValueChange={(val) =>
                      setDetailServiceType(val as ServiceType)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(SERVICE_TYPE_LABEL) as [
                          ServiceType,
                          string,
                        ][]
                      ).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    Status
                  </label>
                  <Select
                    value={detailStatus}
                    onValueChange={(val) =>
                      setDetailStatus(val as AttachmentDetails["status"])
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  Estimated Cost
                </label>
                <Input
                  value={detailCost}
                  onChange={(e) => setDetailCost(e.target.value)}
                  type="number"
                  placeholder="0.00"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  Notes
                </label>
                <Textarea
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={3}
                  className="text-xs bg-muted/30 border-border/60 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Footer ─── */}
        <DialogFooter className="gap-2 sm:gap-0">
          {view.kind === "detail" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 mr-auto"
              onClick={() => {
                resetDetailForm();
                setView({ kind: "search" });
              }}
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </Button>
          )}
          {view.kind === "detail" && (
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!detailServiceName.trim()}
              onClick={handleAttach}
            >
              Attach Service
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
