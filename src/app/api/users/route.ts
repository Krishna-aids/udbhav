import { currentUser } from "@/lib/auth";
import { getDemoStore, listTasks } from "@/lib/demoStore";
import { fail, guard, ok } from "@/lib/response";

export async function GET() {
  return guard(async () => {
    const user = await currentUser();
    if (!user) return fail(401, "Unauthorized");
    const team = getDemoStore().users.map(({ id, name, email, role, avatar, created_at }) => ({ id, name, email, role, avatar, created_at }));
    const assignees = Array.from(new Set(["Unassigned", ...team.map((member) => member.name), ...listTasks().map((task) => task.assignee)])).sort();
    return ok({ team, assignees });
  });
}
