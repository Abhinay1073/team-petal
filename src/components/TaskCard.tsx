import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Trash2, User } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string; title: string; description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null; assignee_id: string | null;
}
interface Profile { id: string; full_name: string | null; email: string | null; }

interface Props {
  task: Task;
  assignee: Profile | null;
  canEdit: boolean;
  canDelete: boolean;
  onStatusChange: (s: Task["status"]) => void;
  onDelete: () => void;
}

const priorityStyles = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/15 text-warning border-warning/30",
  high: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function TaskCard({ task, assignee, canEdit, canDelete, onStatusChange, onDelete }: Props) {
  const overdue = task.due_date && task.status !== "done" && isPast(parseISO(task.due_date));

  return (
    <Card className="p-4 shadow-card hover:shadow-elegant transition-shadow group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm leading-snug flex-1">{task.title}</h4>
        {canDelete && (
          <Button size="icon" variant="ghost" onClick={onDelete} className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {task.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge variant="outline" className={cn("text-xs capitalize border", priorityStyles[task.priority])}>
          {task.priority}
        </Badge>
        {task.due_date && (
          <Badge variant="outline" className={cn("text-xs gap-1", overdue && "bg-destructive/15 text-destructive border-destructive/30")}>
            <Calendar className="h-3 w-3" />{format(parseISO(task.due_date), "MMM d")}
            {overdue && " · overdue"}
          </Badge>
        )}
      </div>

      {assignee && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <User className="h-3 w-3" />
          <span className="truncate">{assignee.full_name || assignee.email}</span>
        </div>
      )}

      {canEdit ? (
        <Select value={task.status} onValueChange={(v) => onStatusChange(v as Task["status"])}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Badge variant="secondary" className="text-xs capitalize">{task.status.replace("_", " ")}</Badge>
      )}
    </Card>
  );
}
