import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, ListTodo, FolderKanban, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string; title: string; status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high"; due_date: string | null;
  project_id: string; assignee_id: string | null;
  projects?: { name: string } | null;
}

const Dashboard = () => {
  const { user, isAdmin, role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let q = supabase.from("tasks").select("*, projects(name)").order("due_date", { ascending: true, nullsFirst: false });
      if (!isAdmin) q = q.eq("assignee_id", user!.id);
      const [{ data: tData }, { count }] = await Promise.all([
        q,
        supabase.from("projects").select("*", { count: "exact", head: true }),
      ]);
      setTasks((tData ?? []) as Task[]);
      setProjectCount(count ?? 0);
      setLoading(false);
    })();
  }, [user, isAdmin]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const todo = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter((t) => t.due_date && t.status !== "done" && isPast(parseISO(t.due_date))).length;

  const stats = [
    { label: "To Do", value: todo, icon: ListTodo, color: "text-muted-foreground", bg: "bg-muted" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-primary", bg: "bg-accent" },
    { label: "Completed", value: done, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Overdue", value: overdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  const upcoming = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? "Team-wide overview of all projects and tasks." : "Your tasks and progress at a glance."}
          <Badge variant="secondary" className="ml-2 capitalize">{role}</Badge>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-bold mt-1">{s.value}</p>
              </div>
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", s.bg)}>
                <s.icon className={cn("h-5 w-5", s.color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 shadow-card lg:col-span-2">
          <h3 className="font-semibold mb-4">Upcoming tasks</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No active tasks. Great job!</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((t) => {
                const isOverdue = t.due_date && isPast(parseISO(t.due_date));
                return (
                  <Link key={t.id} to={`/projects/${t.project_id}`} className="block p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.projects?.name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={cn("text-xs capitalize", isOverdue && "bg-destructive/15 text-destructive border-destructive/30")}>
                          {t.due_date ? format(parseISO(t.due_date), "MMM d") : "No date"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{t.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 shadow-card">
          <h3 className="font-semibold mb-4">Quick stats</h3>
          <div className="space-y-3">
            <Link to="/projects" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <FolderKanban className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Projects</span>
              </div>
              <span className="text-2xl font-bold">{projectCount}</span>
            </Link>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <span className="text-sm font-medium">Total tasks</span>
              <span className="text-2xl font-bold">{tasks.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <span className="text-sm font-medium">Completion</span>
              <span className="text-2xl font-bold">{tasks.length ? Math.round((done / tasks.length) * 100) : 0}%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
