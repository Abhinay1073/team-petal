import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

interface Member { id: string; full_name: string | null; email: string | null; role: "admin" | "member"; }

const Team = () => {
  const { isAdmin, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const merged: Member[] = (profiles ?? []).map((p) => {
      const isAdminUser = (roles ?? []).some((r: any) => r.user_id === p.id && r.role === "admin");
      return { ...p, role: isAdminUser ? "admin" : "member" };
    });
    setMembers(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const promote = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) toast.error(error.message); else { toast.success("Promoted to admin"); load(); }
  };

  const demote = async (userId: string) => {
    if (userId === user?.id && !confirm("Remove your own admin rights?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) toast.error(error.message); else { toast.success("Admin role removed"); load(); }
  };

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground mt-1">Manage roles and access. Promote trusted users to admin.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card className="shadow-card divide-y">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  {m.role === "admin" ? <Shield className="h-5 w-5 text-accent-foreground" /> : <UserIcon className="h-5 w-5 text-accent-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.full_name || "Unnamed"}{m.id === user?.id && " (you)"}</p>
                  <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={m.role === "admin" ? "default" : "secondary"} className={m.role === "admin" ? "bg-gradient-primary" : ""}>
                  {m.role}
                </Badge>
                {m.role === "member" ? (
                  <Button size="sm" variant="outline" onClick={() => promote(m.id)}>Make admin</Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => demote(m.id)}>Demote</Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-4 bg-accent/30 border-accent text-sm">
        <p className="font-medium text-accent-foreground">First-time setup</p>
        <p className="text-muted-foreground mt-1">
          Since all new accounts start as Members, the very first admin must be promoted directly in your backend's user_roles table. Once you have one admin, you can promote others from this page.
        </p>
      </Card>
    </div>
  );
};

export default Team;
