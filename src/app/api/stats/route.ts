import { currentUser } from "@/lib/auth";
import { stats } from "@/lib/demoStore";
import { fail, guard, ok } from "@/lib/response";

export async function GET() {
  return guard(async () => {
    const user = await currentUser();
    if (!user) return fail(401, "Unauthorized");
    return ok(stats());
  });
}
