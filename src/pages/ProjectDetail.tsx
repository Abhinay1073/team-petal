import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Loader2, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import TaskCard from "@/components/TaskCard";

interface Project { id: string; name: string; description: string | null; owner_id: string; }
interface Task {
  id: string; title: string; description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null; assignee_id: string | null;
  project_id: string; created_by: string;
}
interface Profile { id: string; full_name: string | null; email: string | null; }

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  description: z.string().trim().max(2000).optional(),
});

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskDialog, setTaskDialog] = useState(false);
  const [memberDialog, setMemberDialog] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "", assignee_id: "unassigned" });
  const [submitting, setSubmitting] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: pData }, { data: tData }, { data: mData }, { data: profData }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("project_members").select("user_id, profiles!inner(id, full_name, email)").eq("project_id", id),
      supabase.from("profiles").select("id, full_name, email"),
    ]);
    setProject(pData);
    setTasks((tData ?? []) as Task[]);
    setMembers(((mData ?? []) as any[]).map((m) => m.profiles));
    setAllProfiles((profData ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = taskSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.from("tasks").insert({
      project_id: id!,
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: form.priority as any,
      due_date: form.due_date || null,
      assignee_id: form.assignee_id === "unassigned" ? null : form.assignee_id,
      created_by: user!.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Task created");
      setTaskDialog(false);
      setForm({ title: "", description: "", priority: "medium", due_date: "", assignee_id: "unassigned" });
      load();
    }
    setSubmitting(false);
  };

  const updateStatus = async (taskId: string, status: Task["status"]) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) toast.error(error.message);
    else { setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t)); }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) toast.error(error.message);
    else { toast.success("Task deleted"); load(); }
  };

  const addMember = async () => {
    if (!memberToAdd) return;
    const { error } = await supabase.from("project_members").insert({ project_id: id!, user_id: memberToAdd });
    if (error) toast.error(error.message);
    else { toast.success("Member added"); setMemberToAdd(""); setMemberDialog(false); load(); }
  };

  const removeMember = async (userId: string) => {
    const { error } = await supabase.from("project_members").delete().eq("project_id", id!).eq("user_id", userId);
    if (error) toast.error(error.message);
    else { toast.success("Member removed"); load(); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!project) return <Card className="p-12 text-center"><p>Project not found</p></Card>;

  const grouped = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  const nonMembers = allProfiles.filter((p) => !members.some((m) => m.id === p.id));

  return (
    <div className="space-y-6">
      <div>
        <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to projects
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
          </div>
          <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2" />New task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due">Due date</Label>
                    <Input id="due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assign to</Label>
                  <Select value={form.assignee_id} onValueChange={(v) => setForm({ ...form, assignee_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting} className="bg-gradient-primary">
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create task
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {(["todo", "in_progress", "done"] as const).map((status) => (
              <div key={status}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold capitalize text-sm">
                    {status.replace("_", " ")}
                  </h3>
                  <Badge variant="secondary">{grouped[status].length}</Badge>
                </div>
                <div className="space-y-3 min-h-[100px]">
                  {grouped[status].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      assignee={members.find((m) => m.id === task.assignee_id) || null}
                      canEdit={isAdmin || task.assignee_id === user?.id || task.created_by === user?.id}
                      canDelete={isAdmin}
                      onStatusChange={(s) => updateStatus(task.id, s)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Project members</h3>
              {isAdmin && (
                <Dialog open={memberDialog} onOpenChange={setMemberDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-2" />Add member</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add member to project</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <Select value={memberToAdd} onValueChange={setMemberToAdd}>
                        <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                        <SelectContent>
                          {nonMembers.length === 0 ? (
                            <div className="px-2 py-1 text-sm text-muted-foreground">All users are already members</div>
                          ) : nonMembers.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <DialogFooter>
                        <Button onClick={addMember} disabled={!memberToAdd} className="bg-gradient-primary">Add</Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div>
                    <p className="font-medium text-sm">{m.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  {isAdmin && m.id !== project.owner_id && (
                    <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)} className="h-8 w-8 text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {members.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No members yet</p>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
