import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const AdminSignups = () => {
  const { user, loading } = useAuth();
  const qc = useQueryClient();

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const { data: signups = [], isLoading } = useQuery({
    queryKey: ["email-signups"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_signups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; email: string; created_at: string }[];
    },
    enabled: !!isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("email_signups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-signups"] });
      toast.success("Signup removed");
    },
  });

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#141414" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#C9976B" }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: "#141414" }}>
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Cinzel, serif", color: "#E8E4DF" }}
        >
          Email Signups
        </h1>
        <p className="text-sm mb-6" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#6B6B6B" }}>
          {signups.length} total signup{signups.length !== 1 ? "s" : ""}
        </p>

        {isLoading ? (
          <p style={{ color: "#6B6B6B" }}>Loading…</p>
        ) : signups.length === 0 ? (
          <p style={{ color: "#6B6B6B" }}>No signups yet.</p>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #6B6B6B" }}>
            <table className="w-full text-sm" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              <thead>
                <tr style={{ backgroundColor: "#2C2C2C" }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#C9976B", fontFamily: "Cinzel, serif", fontSize: "11px", letterSpacing: "0.1em" }}>Email</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#C9976B", fontFamily: "Cinzel, serif", fontSize: "11px", letterSpacing: "0.1em" }}>Date</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid #2C2C2C" }}>
                    <td className="px-4 py-3" style={{ color: "#E8E4DF" }}>{s.email}</td>
                    <td className="px-4 py-3" style={{ color: "#6B6B6B" }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteMutation.mutate(s.id)}
                        className="hover:text-red-400 transition-colors"
                        style={{ color: "#6B6B6B" }}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSignups;
