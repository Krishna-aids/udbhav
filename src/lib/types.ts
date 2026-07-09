export const STATUSES = ["Backlog", "In Progress", "Review", "Done"] as const;
export type TaskStatus = (typeof STATUSES)[number];

export const PRIORITIES = ["low", "med", "high"] as const;
export type TaskPriority = (typeof PRIORITIES)[number];

export const ROLES = ["admin", "manager", "member"] as const;
export type UserRole = (typeof ROLES)[number];

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  created_at: string;
};

export type AuthUser = Pick<User, "id" | "name" | "role">;

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: string;
  priority: TaskPriority;
  labels: string[];
  due_date: string | null;
  estimate_hours: number;
  completed_date: string | null;
  position: number;
  has_warning: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

export type ActivityAction =
  | "created"
  | "moved"
  | "completed"
  | "reordered"
  | "assigned"
  | "unassigned"
  | "deleted"
  | "imported"
  | "reset";

export type Activity = {
  id: string;
  task_id: string | null;
  user_id: string | null;
  action: ActivityAction;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
};
