import { STATUSES, type Task, type TaskPriority, type TaskStatus } from "@/lib/types";
import rawTasks from "@/data/tasks.json";

type DirtyTask = {
  id: string;
  title: string;
  description?: string;
  status: string;
  assignee: string | null;
  priority?: string;
  labels?: string[];
  due_date?: string | null;
  estimate_hours?: number | string;
  completed_date?: string | null;
};

type CleanResult = {
  cleaned: Task[];
  issuesFixed: number;
  tasksLoaded: number;
};

const statusByLower = new Map(STATUSES.map((status) => [status.toLowerCase(), status]));
const prioritySet = new Set(["low", "med", "high"]);

function parseDate(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return trimmed;

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cleanStatus(value: string) {
  const exact = STATUSES.find((status) => status === value);
  if (exact) return { status: exact, repaired: false, warning: false };

  const normalized = statusByLower.get(value.toLowerCase());
  if (normalized) return { status: normalized, repaired: false, warning: false };

  return { status: "Backlog" as TaskStatus, repaired: true, warning: true };
}

function cleanAssignee(value: string | null) {
  if (value === null) return { assignee: "Unassigned", repaired: true };
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") {
    return { assignee: "Unassigned", repaired: true };
  }
  return { assignee: trimmed, repaired: false };
}

function cleanEstimate(value: number | string | undefined) {
  if (typeof value === "number" && value >= 0) return { estimate: value, repaired: false };
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return { estimate: Number(value), repaired: false };
  }
  return { estimate: 0, repaired: true };
}

export function cleanTasks(input: DirtyTask[] = rawTasks as DirtyTask[]): CleanResult {
  const byId = new Map<string, DirtyTask>();
  let issuesFixed = 0;

  for (const task of input) {
    if (byId.has(task.id)) issuesFixed += 1;
    byId.set(task.id, task);
  }

  const positions = new Map<TaskStatus, number>();
  const now = new Date().toISOString();
  const cleaned = Array.from(byId.values()).map((task) => {
    const status = cleanStatus(task.status);
    const assignee = cleanAssignee(task.assignee);
    const estimate = cleanEstimate(task.estimate_hours);

    if (status.repaired) issuesFixed += 1;
    if (assignee.repaired) issuesFixed += 1;
    if (estimate.repaired) issuesFixed += 1;

    const priority = prioritySet.has(task.priority ?? "") ? (task.priority as TaskPriority) : "med";
    const position = positions.get(status.status) ?? 0;
    positions.set(status.status, position + 1);

    return {
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      status: status.status,
      assignee: assignee.assignee,
      priority,
      labels: Array.isArray(task.labels) ? task.labels : [],
      due_date: parseDate(task.due_date),
      estimate_hours: estimate.estimate,
      completed_date: parseDate(task.completed_date),
      position,
      has_warning: status.warning,
      created_by: null,
      created_at: now,
      updated_at: now,
    } satisfies Task;
  });

  return { cleaned, issuesFixed, tasksLoaded: cleaned.length };
}
