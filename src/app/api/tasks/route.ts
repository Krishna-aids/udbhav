import { currentUser } from "@/lib/auth";
import { dataHealth, listTasks } from "@/lib/demoStore";
import { fail, guard, ok } from "@/lib/response";

export async function GET() {
  return guard(async () => {
    const user = await currentUser();
    if (!user) return fail(401, "Unauthorized");
    return ok({ tasks: listTasks(), dataHealth: dataHealth(), user });
  });
}
