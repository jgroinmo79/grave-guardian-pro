import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, ArrowLeft, Save, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONUMENT_PRICES, ADD_ONS, CARE_PLANS, SEASONAL_BUNDLES } from "@/lib/pricing";
import PhotoUpload from "@/components/admin/PhotoUpload";
import ServiceLogForm from "@/components/admin/ServiceLogForm";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type MonumentType = Database["public"]["Enums"]["monument_type"];
type MaterialType = Database["public"]["Enums"]["material_type"];
type OfferType = Database["public"]["Enums"]["offer_type"];

const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "scheduled", "in_progress", "completed", "cancelled"];
const MONUMENT_TYPES: MonumentType[] = ["single_marker", "double_marker", "single_slant", "single_upright", "double_slant", "double_upright", "grave_ledger"];
const MATERIALS: MaterialType[] = ["granite", "marble", "bronze", "mixed"];

const AdminOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order-detail", id],
    queryFn: async () => {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`*, monuments (*)`)
        .eq("id", id!)
        .single();
      if (orderError) throw orderError;

      // Fetch profile separately since there's no FK from orders to profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, phone, address, city, state, zip")
        .eq("user_id", orderData.user_id)
        .single();

      return { ...orderData, profiles: profileData };
    },
    enabled: !!id,
  });

  // Order fields
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [offer, setOffer] = useState<OfferType>("A");
  const [basePrice, setBasePrice] = useState("");
  const [travelFee, setTravelFee] = useState("");
  const [addOnsTotal, setAddOnsTotal] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [isVeteran, setIsVeteran] = useState(false);
  const [notes, setNotes] = useState("");
  const [addOns, setAddOns] = useState<string[]>([]);
  const [bundleId, setBundleId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  // Monument fields
  const [cemeteryName, setCemeteryName] = useState("");
  const [monumentType, setMonumentType] = useState<MonumentType>("single_marker");
  const [material, setMaterial] = useState<MaterialType>("granite");
  const [estimatedMiles, setEstimatedMiles] = useState("");
  const [section, setSection] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [approximateHeight, setApproximateHeight] = useState("");
  const [condMoss, setCondMoss] = useState(false);
  const [condChipping, setCondChipping] = useState(false);
  const [condLeaning, setCondLeaning] = useState(false);
  const [condFaded, setCondFaded] = useState(false);
  const [condNotCleaned, setCondNotCleaned] = useState(false);
  const [knownDamage, setKnownDamage] = useState(false);

  // Customer fields
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custCity, setCustCity] = useState("");
  const [custState, setCustState] = useState("");
  const [custZip, setCustZip] = useState("");

  useEffect(() => {
    if (!order) return;
    const m = order.monuments as any;
    const p = order.profiles as any;

    setStatus(order.status);
    setOffer(order.offer);
    setBasePrice(String(order.base_price));
    setTravelFee(String(order.travel_fee));
    setAddOnsTotal(String(order.add_ons_total ?? 0));
    setBundlePrice(String(order.bundle_price ?? 0));
    setTotalPrice(String(order.total_price));
    setIsVeteran(order.is_veteran ?? false);
    setNotes(order.notes ?? "");
    setBundleId(order.bundle_id ?? "");
    setScheduledDate(order.scheduled_date ?? "");
    
    // Parse add_ons
    const parsedAddOns = Array.isArray(order.add_ons) ? (order.add_ons as string[]) : [];
    setAddOns(parsedAddOns);

    if (m) {
      setCemeteryName(m.cemetery_name ?? "");
      setMonumentType(m.monument_type);
      setMaterial(m.material);
      setEstimatedMiles(String(m.estimated_miles ?? 0));
      setSection(m.section ?? "");
      setLotNumber(m.lot_number ?? "");
      setApproximateHeight(m.approximate_height ?? "");
      setCondMoss(m.condition_moss_algae ?? false);
      setCondChipping(m.condition_chipping ?? false);
      setCondLeaning(m.condition_leaning ?? false);
      setCondFaded(m.condition_faded_inscription ?? false);
      setCondNotCleaned(m.condition_not_cleaned ?? false);
      setKnownDamage(m.known_damage ?? false);
    }

    if (p) {
      setCustName(p.full_name ?? "");
      setCustEmail(p.email ?? "");
      setCustPhone(p.phone ?? "");
      setCustAddress(p.address ?? "");
      setCustCity(p.city ?? "");
      setCustState(p.state ?? "");
      setCustZip(p.zip ?? "");
    }
  }, [order]);

  // Auto-save status and scheduled date immediately
  const quickSave = useMutation({
    mutationFn: async (fields: { status?: OrderStatus; scheduled_date?: string | null }) => {
      const { error } = await supabase
        .from("orders")
        .update(fields)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-scheduled-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-unscheduled-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-calendar-orders"] });
      toast({ title: "Saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    },
  });

  const handleStatusChange = (v: string) => {
    setStatus(v as OrderStatus);
    quickSave.mutate({ status: v as OrderStatus });
  };

  const handleDateChange = (v: string) => {
    setScheduledDate(v);
    quickSave.mutate({ scheduled_date: v || null });
  };

  const saveAll = useMutation({
    mutationFn: async () => {
      // Update order
      const { error: orderErr } = await supabase
        .from("orders")
        .update({
          status,
          offer,
          base_price: Number(basePrice),
          travel_fee: Number(travelFee),
          add_ons_total: Number(addOnsTotal),
          bundle_price: Number(bundlePrice),
          total_price: Number(totalPrice),
          is_veteran: isVeteran,
          notes: notes || null,
          add_ons: addOns as any,
          bundle_id: bundleId || null,
          scheduled_date: scheduledDate || null,
        })
        .eq("id", id!);
      if (orderErr) throw orderErr;

      // Update monument
      const monumentId = (order?.monuments as any)?.id;
      if (monumentId) {
        const { error: monErr } = await supabase
          .from("monuments")
          .update({
            cemetery_name: cemeteryName,
            monument_type: monumentType,
            material,
            estimated_miles: Number(estimatedMiles),
            section: section || null,
            lot_number: lotNumber || null,
            approximate_height: approximateHeight || null,
            condition_moss_algae: condMoss,
            condition_chipping: condChipping,
            condition_leaning: condLeaning,
            condition_faded_inscription: condFaded,
            condition_not_cleaned: condNotCleaned,
            known_damage: knownDamage,
          })
          .eq("id", monumentId);
        if (monErr) throw monErr;
      }

      // Update customer profile
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          full_name: custName || null,
          email: custEmail || null,
          phone: custPhone || null,
          address: custAddress || null,
          city: custCity || null,
          state: custState || null,
          zip: custZip || null,
        })
        .eq("user_id", order!.user_id);
      if (profErr) throw profErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      toast({ title: "All changes saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return <p className="text-muted-foreground">Order not found.</p>;
  }

  const toggleAddOn = (addonId: string) => {
    setAddOns((prev) =>
      prev.includes(addonId) ? prev.filter((a) => a !== addonId) : [...prev, addonId]
    );
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orders")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">View / Change Order</h1>
          <p className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8)}</p>
        </div>
        <Button
          className="ml-auto gap-2"
          onClick={() => saveAll.mutate()}
          disabled={saveAll.isPending}
        >
          {saveAll.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Changes
        </Button>
      </div>

      {/* ORDER DETAILS */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-display font-semibold text-lg">Order Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 text-sm capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm capitalize">{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Scheduled Date</Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Offer</Label>
            <Select value={offer} onValueChange={(v) => setOffer(v as OfferType)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Standard Clean</SelectItem>
                <SelectItem value="B">Restoration Clean</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Base Price</Label>
            <Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Travel Fee</Label>
            <Input type="number" value={travelFee} onChange={(e) => setTravelFee(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Add-ons Total</Label>
            <Input type="number" value={addOnsTotal} onChange={(e) => setAddOnsTotal(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bundle Price</Label>
            <Input type="number" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Total Price</Label>
            <Input type="number" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} className="h-9 text-sm font-semibold" />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Checkbox checked={isVeteran} onCheckedChange={(c) => setIsVeteran(!!c)} id="veteran" />
            <Label htmlFor="veteran" className="text-xs">Veteran Discount</Label>
          </div>
        </div>

        {/* Bundle selection */}
        <div className="space-y-1.5">
          <Label className="text-xs">Seasonal Bundle</Label>
          <Select value={bundleId || "none"} onValueChange={(v) => setBundleId(v === "none" ? "" : v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No bundle</SelectItem>
              {SEASONAL_BUNDLES.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.label} (${b.price})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add-ons */}
        <div className="space-y-2">
          <Label className="text-xs">Add-ons</Label>
          <div className="grid grid-cols-2 gap-2">
            {ADD_ONS.map((addon) => (
              <div key={addon.id} className="flex items-center gap-2">
                <Checkbox
                  checked={addOns.includes(addon.id)}
                  onCheckedChange={() => toggleAddOn(addon.id)}
                  id={`addon-${addon.id}`}
                />
                <Label htmlFor={`addon-${addon.id}`} className="text-xs">
                  {addon.label} {addon.price > 0 ? `($${addon.price})` : ""}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Admin Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="text-sm min-h-[60px]" placeholder="Internal notes…" />
        </div>

        {order.stripe_payment_status && (
          <p className="text-xs text-muted-foreground">
            Stripe Payment: <span className="font-medium">{order.stripe_payment_status}</span>
          </p>
        )}
      </section>

      {/* MONUMENT DETAILS */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-display font-semibold text-lg">Monument Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Cemetery Name</Label>
            <Input value={cemeteryName} onChange={(e) => setCemeteryName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Monument Type</Label>
            <Select value={monumentType} onValueChange={(v) => setMonumentType(v as MonumentType)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-sm">
                    {MONUMENT_PRICES[t]?.label ?? t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Material</Label>
            <Select value={material} onValueChange={(v) => setMaterial(v as MaterialType)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATERIALS.map((m) => (
                  <SelectItem key={m} value={m} className="text-sm capitalize">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Estimated Miles</Label>
            <Input type="number" value={estimatedMiles} onChange={(e) => setEstimatedMiles(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Section</Label>
            <Input value={section} onChange={(e) => setSection(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lot Number</Label>
            <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Approx Height</Label>
            <Input value={approximateHeight} onChange={(e) => setApproximateHeight(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label className="text-xs">Conditions</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: "Moss / Algae", checked: condMoss, set: setCondMoss },
              { label: "Chipping", checked: condChipping, set: setCondChipping },
              { label: "Leaning", checked: condLeaning, set: setCondLeaning },
              { label: "Faded Inscription", checked: condFaded, set: setCondFaded },
              { label: "Not Cleaned Recently", checked: condNotCleaned, set: setCondNotCleaned },
              { label: "Known Damage", checked: knownDamage, set: setKnownDamage },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-2">
                <Checkbox checked={c.checked} onCheckedChange={(v) => c.set(!!v)} />
                <span className="text-xs">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOMER INFO */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-display font-semibold text-lg">Customer Info</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Full Name</Label>
            <Input value={custName} onChange={(e) => setCustName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={custEmail} onChange={(e) => setCustEmail(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <Input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Address</Label>
            <Input value={custAddress} onChange={(e) => setCustAddress(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">City</Label>
            <Input value={custCity} onChange={(e) => setCustCity(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">State</Label>
            <Input value={custState} onChange={(e) => setCustState(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Zip</Label>
            <Input value={custZip} onChange={(e) => setCustZip(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
      </section>

      {/* BEFORE PHOTOS (Customer) */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-display font-semibold text-lg">Before Photos</h2>
        <p className="text-xs text-muted-foreground">Photos provided by the customer during intake</p>
        <CustomerPhotosGallery monumentId={(order.monuments as any)?.id || order.monument_id} />
      </section>

      {/* FINISHED PHOTOS (Technician) */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-display font-semibold text-lg">Finished Photos</h2>
        <p className="text-xs text-muted-foreground">Photos uploaded by the technician after service</p>
        <PhotoUpload
          monumentId={(order.monuments as any)?.id || order.monument_id}
          orderId={order.id}
          userId={order.user_id}
        />
      </section>

      {/* SERVICE LOG */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-display font-semibold text-lg">Add Service Log</h2>
        <ServiceLogForm
          monumentId={(order.monuments as any)?.id || order.monument_id}
          orderId={order.id}
          userId={order.user_id}
        />
        <AdminServiceLogsList monumentId={(order.monuments as any)?.id || order.monument_id} />
      </section>
    </div>
  );
};

function CustomerPhotosGallery({ monumentId }: { monumentId: string }) {
  const { data: photos } = useQuery({
    queryKey: ["customer-before-photos", monumentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_records")
        .select("*")
        .eq("monument_id", monumentId)
        .eq("description", "Client upload — intake")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!photos?.length) {
    return <p className="text-xs text-muted-foreground italic">No customer photos uploaded.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div key={photo.id} className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={photo.photo_url}
            alt="Customer before photo"
            className="w-full aspect-square object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

function AdminServiceLogsList({ monumentId }: { monumentId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: logs } = useQuery({
    queryKey: ["admin-service-logs", monumentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_logs")
        .select("*")
        .eq("monument_id", monumentId)
        .order("service_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateShareLink = useMutation({
    mutationFn: async (logId: string) => {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const { error } = await supabase
        .from("service_logs")
        .update({ share_token: token } as any)
        .eq("id", logId);
      if (error) throw error;
      return token;
    },
    onSuccess: (token) => {
      queryClient.invalidateQueries({ queryKey: ["admin-service-logs", monumentId] });
      const url = `${window.location.origin}/report/${token}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Share link copied to clipboard" });
    },
    onError: (err: Error) => {
      toast({ title: "Error generating link", description: err.message, variant: "destructive" });
    },
  });

  const copyLink = (token: string, logId: string) => {
    const url = `${window.location.origin}/report/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(logId);
    toast({ title: "Link copied" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!logs?.length) return null;

  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <h3 className="text-sm font-semibold text-muted-foreground">Previous Service Logs</h3>
      {logs.map((log) => (
        <div key={log.id} className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">{new Date(log.service_date).toLocaleDateString()}</p>
            <div className="flex items-center gap-1.5">
              {log.time_spent_minutes && <p className="text-[10px] text-muted-foreground">{log.time_spent_minutes} min</p>}
              {(log as any).share_token ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 px-2"
                  onClick={() => copyLink((log as any).share_token, log.id)}
                >
                  {copiedId === log.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedId === log.id ? "Copied" : "Copy Link"}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 px-2"
                  onClick={() => generateShareLink.mutate(log.id)}
                  disabled={generateShareLink.isPending}
                >
                  <Share2 className="w-3 h-3" /> Share
                </Button>
              )}
            </div>
          </div>
          {(log.services_performed as string[])?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(log.services_performed as string[]).map((s: string) => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{s}</span>
              ))}
            </div>
          )}
          {log.public_notes && <p className="text-[10px] text-muted-foreground">Public: {log.public_notes}</p>}
          {log.private_notes && <p className="text-[10px] text-accent italic">Private: {log.private_notes}</p>}
        </div>
      ))}
    </div>
  );
}

export default AdminOrderDetail;
