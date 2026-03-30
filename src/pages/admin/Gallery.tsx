import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, Upload, GripVertical } from "lucide-react";
import { toast } from "sonner";

export default function AdminGallery() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState("");

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["gallery-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
      toast.success("Photo removed from gallery");
    },
    onError: () => toast.error("Failed to delete photo"),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `gallery/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("monument-photos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("monument-photos")
        .getPublicUrl(path);

      const maxOrder = photos.length > 0
        ? Math.max(...photos.map((p) => p.display_order))
        : -1;

      const { error: insertError } = await supabase.from("gallery_photos").insert({
        photo_url: urlData.publicUrl,
        alt_text: altText || "Before and after monument cleaning",
        display_order: maxOrder + 1,
      });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
      setAltText("");
      toast.success("Photo added to gallery");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Public Gallery</h1>
        <p className="text-sm text-muted-foreground">
          Manage before &amp; after photos displayed on the homepage.
        </p>
      </div>

      {/* Upload area */}
      <Card className="p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Add Photo</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Alt text / description (optional)"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            className="flex-1"
          />
          <label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button asChild disabled={uploading} className="cursor-pointer">
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading…" : "Upload Photo"}
              </span>
            </Button>
          </label>
        </div>
      </Card>

      {/* Current photos */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="text-muted-foreground text-sm">No gallery photos yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden relative group">
              <img
                src={photo.photo_url}
                alt={photo.alt_text}
                className="w-full h-48 object-cover"
              />
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {photo.alt_text || "No description"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(photo.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
