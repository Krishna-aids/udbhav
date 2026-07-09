import { currentUser } from "@/lib/auth";
import { dataHealth, resetDemoStore } from "@/lib/demoStore";
import { fail, guard, ok } from "@/lib/response";

export async function POST() {
  return guard(async () => {
    const user = await currentUser();
    if (!user) return fail(401, "Unauthorized");
    resetDemoStore();
    const health = dataHealth();
    return ok({ issuesFixed: health.issuesFixed, tasksLoaded: health.tasksLoaded, label: health.label });
  });
}
