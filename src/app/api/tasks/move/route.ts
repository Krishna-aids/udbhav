import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { moveTask } from "@/lib/demoStore";
import { STATUSES } from "@/lib/types";
import { fail, guard, ok } from "@/lib/response";

const MoveBody = z.object({
  taskId: z.string().min(1),
  toStatus: z.enum(STATUSES),
  toIndex: z.number().int().min(0),
});

export async function PATCH(request: Request) {
  return guard(async () => {
    const user = await currentUser();
    if (!user) return fail(401, "Unauthorized");

    const parsed = MoveBody.safeParse(await request.json());
    if (!parsed.success) return fail(400, "Invalid move payload");

    const result = moveTask({ ...parsed.data, userRole: user.role });
    if (!result.ok) return fail(result.status, result.error);

    return ok({ task: result.task });
  });
}
