import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, FolderKanban, Loader2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  task_count?: number;
}

const projectSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  description: z.string().trim().max(500).optional(),
});

const Projects = () => {
  const { isAdmin, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*, tasks(count)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setProjects((data ?? []).map((p: any) => ({ ...p, task_count: p.tasks?.[0]?.count ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = projectSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setCreating(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: parsed.data.name, description: parsed.data.description || null, owner_id: user!.id })
      .select()
      .single();
    if (error) { toast.error(error.message); setCreating(false); return; }
    // add owner as member
    await supabase.from("project_members").insert({ project_id: data.id, user_id: user!.id });
    toast.success("Project created");
    setOpen(false);
    setForm({ name: "", description: "" });
    setCreating(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project and all its tasks?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Project deleted"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Organize work into projects and assign tasks to your team.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2" />New project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} rows={3} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating} className="bg-gradient-primary">
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center shadow-card">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">No projects yet</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? "Create your first project to get started." : "An admin needs to add you to a project."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="p-6 shadow-card hover:shadow-elegant transition-shadow group relative">
              <Link to={`/projects/${p.id}`} className="block">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                  <FolderKanban className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="font-semibold text-lg truncate">{p.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">{p.description || "No description"}</p>
                <div className="mt-4 text-xs text-muted-foreground">{p.task_count} task{p.task_count === 1 ? "" : "s"}</div>
              </Link>
              {isAdmin && (
                <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
