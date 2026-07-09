import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ||= value;
  }
}

const statuses = ["Backlog", "In Progress", "Review", "Done"];
const statusByLower = new Map(statuses.map((status) => [status.toLowerCase(), status]));
const priorities = new Set(["low", "med", "high"]);

function parseDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return trimmed;
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function cleanTasks(rawTasks) {
  const byId = new Map();
  let issuesFixed = 0;

  for (const task of rawTasks) {
    if (byId.has(task.id)) issuesFixed += 1;
    byId.set(task.id, task);
  }

  const positions = new Map();
  const now = new Date().toISOString();
  const cleaned = Array.from(byId.values()).map((task) => {
    let status = statuses.find((candidate) => candidate === task.status);
    let hasWarning = false;
    if (!status) {
      status = statusByLower.get(String(task.status).toLowerCase());
    }
    if (!status) {
      status = "Backlog";
      hasWarning = true;
      issuesFixed += 1;
    }

    let assignee = task.assignee;
    if (assignee === null || String(assignee).trim() === "" || String(assignee).trim().toLowerCase() === "n/a") {
      assignee = "Unassigned";
      issuesFixed += 1;
    } else {
      assignee = String(assignee).trim();
    }

    let estimate = task.estimate_hours;
    if (typeof estimate === "string" && /^\d+$/.test(estimate.trim())) {
      estimate = Number(estimate);
    } else if (typeof estimate !== "number" || estimate < 0) {
      estimate = 0;
      issuesFixed += 1;
    }

    const position = positions.get(status) ?? 0;
    positions.set(status, position + 1);

    return {
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      status,
      assignee,
      priority: priorities.has(task.priority) ? task.priority : "med",
      labels: Array.isArray(task.labels) ? task.labels : [],
      due_date: parseDate(task.due_date),
      estimate_hours: estimate,
      completed_date: parseDate(task.completed_date),
      position,
      has_warning: hasWarning,
      created_by: null,
      created_at: now,
      updated_at: now,
    };
  });

  return { cleaned, issuesFixed, tasksLoaded: cleaned.length };
}

loadEnvLocal();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  console.error("Paste your Supabase project URL and service-role key, run supabase/schema.sql once, then run: npm run db:seed");
  process.exit(1);
}

const rawTasksPath = path.join(root, "src", "data", "tasks.json");
const rawTasks = JSON.parse(fs.readFileSync(rawTasksPath, "utf8"));
const result = cleanTasks(rawTasks);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const seedUsers = [
  {
    name: "Asha Admin",
    email: "admin@udbhav.local",
    password_hash: "$2b$12$pIAFbZqSfaJTMfufbu1BZ.6U9FL0SAeJjMaOEY0QVDDZVEKNkxrF.",
    role: "admin",
    avatar: "AA",
  },
  {
    name: "Mira Manager",
    email: "manager@udbhav.local",
    password_hash: "$2b$12$tpZXAa418tosP2lFBGEP4uAHe5dc7ecvoD8IH9Vcm9gUYXFHcqmZO",
    role: "manager",
    avatar: "MM",
  },
  {
    name: "Dev Member",
    email: "member@udbhav.local",
    password_hash: "$2b$12$hHojaDItQw8qXGxb1SkB2.UAND/cRTpFbRiEh4PgR1YjJn9daSGTC",
    role: "member",
    avatar: "DM",
  },
];

async function run() {
  const { error: usersError } = await supabase.from("users").upsert(seedUsers, { onConflict: "email" });
  if (usersError) throw usersError;

  for (const table of ["comments", "activity_log", "tasks"]) {
    const { error } = await supabase.from(table).delete().neq(table === "tasks" ? "id" : "id", "__never__");
    if (error) throw error;
  }

  const { error: tasksError } = await supabase.from("tasks").insert(result.cleaned);
  if (tasksError) throw tasksError;

  const { data: admin } = await supabase.from("users").select("id").eq("email", "admin@udbhav.local").single();
  await supabase.from("activity_log").insert({
    task_id: null,
    user_id: admin?.id ?? null,
    action: "imported",
    from_status: null,
    to_status: `${result.issuesFixed} issues fixed · ${result.tasksLoaded} tasks loaded`,
  });

  console.log(`Seeded Supabase: ${result.issuesFixed} issues fixed · ${result.tasksLoaded} tasks loaded`);
}

run().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
