import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Trash2, Eye, EyeOff } from "lucide-react";

interface PhotoUploadProps {
  monumentId: string;
  orderId?: string;
  userId: string;
}

const PhotoUpload = ({ monumentId, orderId, userId }: PhotoUploadProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");

  const { data: photos } = useQuery({
    queryKey: ["admin-monument-photos", monumentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_records")
        .select("*")
        .eq("monument_id", monumentId)
        .neq("description", "Client upload — intake")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${monumentId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("monument-photos")
          .upload(path, file);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("monument-photos")
          .getPublicUrl(path);

        const { error: recordErr } = await supabase.from("photo_records").insert({
          monument_id: monumentId,
          order_id: orderId || null,
          user_id: userId,
          photo_url: urlData.publicUrl,
          description: description || null,
          taken_at: new Date().toISOString(),
          client_visible: true,
        });
        if (recordErr) throw recordErr;
      }

      queryClient.invalidateQueries({ queryKey: ["admin-monument-photos", monumentId] });
      queryClient.invalidateQueries({ queryKey: ["monument-photos", monumentId] });
      toast({ title: `${files.length} photo(s) uploaded` });
      setDescription("");
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase.from("photo_records").delete().eq("id", photoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-monument-photos", monumentId] });
      queryClient.invalidateQueries({ queryKey: ["monument-photos", monumentId] });
      toast({ title: "Photo deleted" });
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ photoId, visible }: { photoId: string; visible: boolean }) => {
      const { error } = await supabase.from("photo_records").update({ client_visible: visible } as any).eq("id", photoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-monument-photos", monumentId] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs">Description (optional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-sm" placeholder="e.g. Before cleaning - front" />
        </div>
        <div className="relative">
          <Button size="sm" className="gap-1.5" disabled={uploading}>
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload Photos
          </Button>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={uploading}
          />
        </div>
      </div>

      {photos && photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-border">
              <img
                src={photo.photo_url}
                alt={photo.description || "Monument photo"}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                {photo.description && (
                  <p className="text-[10px] text-center text-foreground">{photo.description}</p>
                )}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={() => toggleVisibility.mutate({ photoId: photo.id, visible: !(photo as any).client_visible })}
                  >
                    {(photo as any).client_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {(photo as any).client_visible ? "Visible" : "Hidden"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={() => deletePhoto.mutate(photo.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {(photo as any).client_visible && (
                <div className="absolute top-1 left-1 bg-primary/90 text-primary-foreground text-[8px] px-1.5 py-0.5 rounded-full font-semibold">
                  <Eye className="w-2.5 h-2.5 inline mr-0.5" />Client
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
