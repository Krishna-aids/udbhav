import bcrypt from "bcryptjs";
import { cleanTasks } from "@/lib/clean";
import { isThisWeek } from "@/lib/dates";
import { STATUSES, type Task, type TaskStatus, type UserRole } from "@/lib/types";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  avatar: string;
  created_at: string;
};

type DemoState = {
  tasks: Task[];
  issuesFixed: number;
  tasksLoaded: number;
  users: DemoUser[];
};

type MoveInput = {
  taskId: string;
  toStatus: TaskStatus;
  toIndex: number;
  userRole: UserRole;
};

const demoUsers: DemoUser[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Asha Admin",
    email: "admin@udbhav.local",
    password_hash: "$2b$12$pIAFbZqSfaJTMfufbu1BZ.6U9FL0SAeJjMaOEY0QVDDZVEKNkxrF.",
    role: "admin",
    avatar: "AA",
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Mira Manager",
    email: "manager@udbhav.local",
    password_hash: "$2b$12$tpZXAa418tosP2lFBGEP4uAHe5dc7ecvoD8IH9Vcm9gUYXFHcqmZO",
    role: "manager",
    avatar: "MM",
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Dev Member",
    email: "member@udbhav.local",
    password_hash: "$2b$12$hHojaDItQw8qXGxb1SkB2.UAND/cRTpFbRiEh4PgR1YjJn9daSGTC",
    role: "member",
    avatar: "DM",
    created_at: new Date().toISOString(),
  },
];

const globalStore = globalThis as typeof globalThis & { __udbhavDemo?: DemoState };

function buildInitialState(): DemoState {
  const result = cleanTasks();
  return {
    tasks: result.cleaned,
    issuesFixed: result.issuesFixed,
    tasksLoaded: result.tasksLoaded,
    users: demoUsers,
  };
}

export function getDemoStore() {
  globalStore.__udbhavDemo ??= buildInitialState();
  return globalStore.__udbhavDemo;
}

export function resetDemoStore() {
  globalStore.__udbhavDemo = buildInitialState();
  return getDemoStore();
}

export async function findDemoUser(email: string, password: string) {
  const user = demoUsers.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  return valid ? user : null;
}

export async function createDemoUser(name: string, email: string, password: string) {
  const store = getDemoStore();
  const existing = store.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existing) return null;
  const user: DemoUser = {
    id: crypto.randomUUID(),
    name,
    email,
    password_hash: await bcrypt.hash(password, 12),
    role: "member",
    avatar: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U",
    created_at: new Date().toISOString(),
  };
  store.users.push(user);
  return user;
}

export function listTasks() {
  return [...getDemoStore().tasks].sort((a, b) => {
    const statusDelta = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
    return statusDelta || a.position - b.position;
  });
}

export function dataHealth() {
  const { issuesFixed, tasksLoaded } = getDemoStore();
  return { issuesFixed, tasksLoaded, label: `${issuesFixed} issues fixed · ${tasksLoaded} tasks loaded` };
}

function reindex(tasks: Task[]) {
  for (const status of STATUSES) {
    tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position)
      .forEach((task, index) => {
        task.position = index;
      });
  }
}

function statusCount(status: TaskStatus, excludeTaskId?: string) {
  return getDemoStore().tasks.filter((task) => task.status === status && task.id !== excludeTaskId).length;
}

export function moveTask({ taskId, toStatus, toIndex, userRole }: MoveInput) {
  const store = getDemoStore();
  const task = store.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return { ok: false as const, status: 404, error: "Task not found" };
  if (userRole === "member" && (task.status === "Done" || toStatus === "Done")) {
    return { ok: false as const, status: 403, error: "Members cannot move tasks into or out of Done" };
  }
  if (toStatus === "In Progress" && task.status !== toStatus && statusCount(toStatus, taskId) >= 5) {
    return { ok: false as const, status: 409, error: "In Progress WIP limit reached" };
  }
  if (toStatus === "Review" && task.status !== toStatus && statusCount(toStatus, taskId) >= 3) {
    return { ok: false as const, status: 409, error: "Review WIP limit reached" };
  }

  const targetTasks = store.tasks.filter((candidate) => candidate.id !== taskId && candidate.status === toStatus).sort((a, b) => a.position - b.position);
  const nextIndex = Math.max(0, Math.min(toIndex, targetTasks.length));
  task.status = toStatus;
  task.position = nextIndex;
  task.completed_date = toStatus === "Done" && !task.completed_date ? new Date().toISOString().slice(0, 10) : task.completed_date;
  task.updated_at = new Date().toISOString();

  targetTasks.splice(nextIndex, 0, task);
  targetTasks.forEach((candidate, index) => {
    candidate.position = index;
  });
  reindex(store.tasks);

  return { ok: true as const, task };
}

export function stats() {
  const tasks = listTasks();
  return {
    tasksByStatus: STATUSES.map((status) => ({ status, count: tasks.filter((task) => task.status === status).length })),
    hoursByAssignee: Object.values(
      tasks.reduce<Record<string, { assignee: string; hours: number }>>((acc, task) => {
        acc[task.assignee] ??= { assignee: task.assignee, hours: 0 };
        acc[task.assignee].hours += task.estimate_hours;
        return acc;
      }, {}),
    ),
    completedThisWeek: tasks.filter((task) => task.status === "Done" && isThisWeek(task.completed_date)).length,
  };
}
