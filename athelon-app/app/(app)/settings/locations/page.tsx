"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Plus, MapPin, Building2, Phone, Mail, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CERT_TYPES = [
  { value: "part_145", label: "Part 145" },
  { value: "part_135", label: "Part 135" },
  { value: "part_121", label: "Part 121" },
  { value: "part_91", label: "Part 91" },
];

export default function ShopLocationsPage() {
  const { orgId: organizationId } = useCurrentOrg();
  const orgId = organizationId as Id<"organizations"> | undefined;
  const locations = useQuery(api.shopLocations.list, orgId ? { organizationId: orgId } : "skip");
  const createLocation = useMutation(api.shopLocations.create);
  const updateLocation = useMutation(api.shopLocations.update);
  const removeLocation = useMutation(api.shopLocations.remove);

  const [deactivateTarget, setDeactivateTarget] = useState<{ id: Id<"shopLocations">; name: string; certNumber?: string } | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [certType, setCertType] = useState<string>("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [capabilities, setCapabilities] = useState("");

  const resetForm = () => {
    setName(""); setCode(""); setAddress(""); setCity(""); setState(""); setZip("");
    setPhone(""); setEmail(""); setCertNumber(""); setCertType(""); setIsPrimary(false); setCapabilities("");
  };

  const handleCreate = async () => {
    if (!orgId || !name || !code) { toast.error("Name and code required"); return; }
    try {
      await createLocation({
        organizationId: orgId,
        name, code,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zip: zip || undefined,
        phone: phone || undefined,
        email: email || undefined,
        certificateNumber: certNumber || undefined,
        certificateType: certType ? certType as "part_145" | "part_135" | "part_121" | "part_91" : undefined,
        isPrimary: isPrimary || undefined,
        capabilities: capabilities ? capabilities.split(",").map((c) => c.trim()).filter(Boolean) : undefined,
      });
      toast.success("Location created");
      setShowCreate(false);
      resetForm();
    } catch {
      toast.error("Failed to create location");
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await removeLocation({ id: deactivateTarget.id });
      toast.success(`${deactivateTarget.name} deactivated`);
      setDeactivateTarget(null);
    } catch {
      toast.error("Failed to deactivate location");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleTogglePrimary = async (id: Id<"shopLocations">, current: boolean | undefined) => {
    try {
      await updateLocation({ id, isPrimary: !current });
      toast.success(current ? "Removed primary" : "Set as primary");
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> Shop Locations</h1>
          <p className="text-muted-foreground">Manage multi-shop locations and certificates</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Shop Location</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Hangar" /></div>
                <div><Label>Code *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MH1" /></div>
              </div>
              <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Airport Rd" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
                <div><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
                <div><Label>ZIP</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Certificate #</Label><Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} /></div>
                <div>
                  <Label>Certificate Type</Label>
                  <Select value={certType} onValueChange={setCertType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {CERT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Capabilities (comma-separated)</Label><Input value={capabilities} onChange={(e) => setCapabilities(e.target.value)} placeholder="Airframe, Powerplant, Avionics" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="primary" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                <Label htmlFor="primary">Primary location</Label>
              </div>
              <Button onClick={handleCreate} className="w-full">Create Location</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Map placeholder */}
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Map integration coming soon</p>
        </CardContent>
      </Card>

      {/* Location Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!locations && <p className="text-muted-foreground col-span-full">Loading...</p>}
        {locations?.length === 0 && <p className="text-muted-foreground col-span-full">No locations yet. Add your first shop location.</p>}
        {locations?.map((loc) => (
          <Card key={loc._id} className={!loc.isActive ? "opacity-50" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {loc.isPrimary && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  {loc.name}
                </CardTitle>
                <Badge variant="outline" className="font-mono">{loc.code}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loc.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(", ")}
                </p>
              )}
              {loc.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {loc.phone}</p>}
              {loc.email && <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {loc.email}</p>}
              {loc.certificateNumber && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{loc.certificateType?.replace("_", " ").toUpperCase()}</Badge>
                  <span className="text-sm font-mono">{loc.certificateNumber}</span>
                </div>
              )}
              {loc.capabilities && loc.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {loc.capabilities.map((cap) => <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>)}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => handleTogglePrimary(loc._id, loc.isPrimary)}>
                  <Star className={`h-3 w-3 ${loc.isPrimary ? "text-yellow-500" : ""}`} />
                </Button>
                {loc.isActive && (
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setDeactivateTarget({ id: loc._id, name: loc.name, certNumber: loc.certificateNumber })}>
                    Deactivate
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This location will be marked inactive and removed from scheduling and work order assignment.
              {deactivateTarget?.certNumber && (
                <> Certificate <span className="font-mono font-semibold">{deactivateTarget.certNumber}</span> will no longer be associated with active operations.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeactivating}
              onClick={handleDeactivate}
            >
              {isDeactivating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deactivating…</> : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
