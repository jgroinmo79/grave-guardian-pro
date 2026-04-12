import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Flower2, ImageIcon } from "lucide-react";

const ARRANGEMENT_TYPES = ["bouquet", "saddle", "wreath", "potted", "easel"];
const OCCASION_OPTIONS = [
  { value: "mothers_day", label: "Mother's Day" },
  { value: "fathers_day", label: "Father's Day" },
  { value: "christmas", label: "Christmas" },
  { value: "memorial_day", label: "Memorial Day" },
  { value: "easter", label: "Easter" },
  { value: "general", label: "General" },
];

interface ArrangementForm {
  name: string;
  description: string;
  arrangement_type: string;
  occasion_tags: string[];
  gd_code: string;
  ffc_code: string;
  wholesale_price: string;
  retail_price: string;
  image_url: string;
  image_url_2: string;
  is_active: boolean;
}

const emptyForm: ArrangementForm = {
  name: "",
  description: "",
  arrangement_type: "",
  occasion_tags: [],
  gd_code: "",
  ffc_code: "",
  wholesale_price: "",
  retail_price: "",
  image_url: "",
  image_url_2: "",
  is_active: true,
};

export default function FlowerCatalog() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArrangementForm>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ["flower_arrangements_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flower_arrangements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: ArrangementForm & { id?: string }) => {
      const row = {
        name: payload.name.trim(),
        description: payload.description.trim() || null,
        arrangement_type: payload.arrangement_type || null,
        occasion_tags: payload.occasion_tags,
        gd_code: payload.gd_code.trim() || null,
        ffc_code: payload.ffc_code.trim() || null,
        wholesale_price: payload.wholesale_price ? parseFloat(payload.wholesale_price) : null,
        retail_price: parseFloat(payload.retail_price),
        image_url: payload.image_url || null,
        image_url_2: payload.image_url_2 || null,
        is_active: payload.is_active,
      };
      if (payload.id) {
        const { error } = await supabase
          .from("flower_arrangements")
          .update(row)
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("flower_arrangements")
          .insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flower_arrangements_admin"] });
      toast.success(editingId ? "Arrangement updated" : "Arrangement created");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("flower_arrangements")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flower_arrangements_admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setForm({
      name: a.name,
      description: a.description || "",
      arrangement_type: a.arrangement_type || "",
      occasion_tags: a.occasion_tags || [],
      gd_code: a.gd_code || "",
      ffc_code: a.ffc_code || "",
      wholesale_price: a.wholesale_price != null ? String(a.wholesale_price) : "",
      retail_price: String(a.retail_price),
      image_url: a.image_url || "",
      image_url_2: a.image_url_2 || "",
      is_active: a.is_active,
    });
    setEditingId(a.id);
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "image_url" | "image_url_2") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("flower-images")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("flower-images")
      .getPublicUrl(path);
    setForm((f) => ({ ...f, [field]: urlData.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const toggleOccasion = (tag: string) => {
    setForm((f) => ({
      ...f,
      occasion_tags: f.occasion_tags.includes(tag)
        ? f.occasion_tags.filter((t) => t !== tag)
        : [...f.occasion_tags, tag],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.retail_price || !form.gd_code.trim()) {
      toast.error("Name, GD Code, and retail price are required");
      return;
    }
    saveMutation.mutate({ ...form, id: editingId ?? undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Flower Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Manage flower arrangements for holiday placements
          </p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Arrangement
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : arrangements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Flower2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No arrangements yet. Add your first one above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {arrangements.map((a: any) => (
            <Card
              key={a.id}
              className={`overflow-hidden transition-opacity ${!a.is_active ? "opacity-50" : ""}`}
            >
              <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                {a.image_url ? (
                  <img
                    src={a.image_url}
                    alt={a.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{a.name}</h3>
                    {a.gd_code && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{a.gd_code}</p>
                    )}
                    {a.arrangement_type && (
                      <Badge variant="secondary" className="text-[10px] mt-1 capitalize">
                        {a.arrangement_type}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-bold text-primary whitespace-nowrap">
                    ${Number(a.retail_price).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={a.is_active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: a.id, is_active: checked })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {a.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Arrangement" : "Add Arrangement"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image 1 */}
            <div className="space-y-2">
              <Label>Image 1</Label>
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Preview 1"
                  className="w-full h-40 object-cover rounded-md"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "image_url")}
                disabled={uploading}
              />
            </div>

            {/* Image 2 */}
            <div className="space-y-2">
              <Label>Image 2 (optional)</Label>
              {form.image_url_2 && (
                <img
                  src={form.image_url_2}
                  alt="Preview 2"
                  className="w-full h-40 object-cover rounded-md"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "image_url_2")}
                disabled={uploading}
              />
              {uploading && (
                <p className="text-xs text-muted-foreground">Uploading…</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Spring Bouquet"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="A beautiful seasonal arrangement…"
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <Label>Arrangement Type</Label>
              <Select
                value={form.arrangement_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, arrangement_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ARRANGEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Occasions */}
            <div className="space-y-2">
              <Label>Occasion Tags</Label>
              <div className="grid grid-cols-2 gap-2">
                {OCCASION_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={form.occasion_tags.includes(o.value)}
                      onCheckedChange={() => toggleOccasion(o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            {/* GD Code */}
            <div className="space-y-1">
              <Label>GD Code *</Label>
              <Input
                value={form.gd_code}
                onChange={(e) => setForm((f) => ({ ...f, gd_code: e.target.value }))}
                placeholder="GD-MD-01"
                maxLength={20}
              />
            </div>

            {/* FFC Code */}
            <div className="space-y-1">
              <Label>FFC Code</Label>
              <Input
                value={form.ffc_code}
                onChange={(e) => setForm((f) => ({ ...f, ffc_code: e.target.value }))}
                placeholder="MD2890"
                maxLength={20}
              />
            </div>

            {/* Wholesale Cost */}
            <div className="space-y-1">
              <Label>Wholesale Cost</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.wholesale_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, wholesale_price: e.target.value }))
                }
                placeholder="21.99"
              />
            </div>

            {/* Retail Price */}
            <div className="space-y-1">
              <Label>Retail Price *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.retail_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, retail_price: e.target.value }))
                }
                placeholder="49.99"
              />
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label>Active</Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? "Saving…"
                : editingId
                ? "Update Arrangement"
                : "Create Arrangement"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
