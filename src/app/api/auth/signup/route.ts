import { cookies } from "next/headers";
import { z } from "zod";
import { createDemoUser } from "@/lib/demoStore";
import { signToken } from "@/lib/jwt";
import { fail, guard, ok } from "@/lib/response";

const SignupBody = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  return guard(async () => {
    const parsed = SignupBody.safeParse(await request.json());
    if (!parsed.success) return fail(400, "Invalid signup payload");

    const user = await createDemoUser(parsed.data.name, parsed.data.email, parsed.data.password);
    if (!user) return fail(409, "Email already exists");

    const token = await signToken({ id: user.id, name: user.name, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2,
    });

    return ok({ user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  });
}
