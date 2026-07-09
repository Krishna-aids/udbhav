import { cookies } from "next/headers";
import { z } from "zod";
import { findDemoUser } from "@/lib/demoStore";
import { signToken } from "@/lib/jwt";
import { fail, guard, ok } from "@/lib/response";

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  return guard(async () => {
    const parsed = LoginBody.safeParse(await request.json());
    if (!parsed.success) return fail(400, "Invalid login payload");

    const user = await findDemoUser(parsed.data.email, parsed.data.password);
    if (!user) return fail(401, "Invalid email or password");

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
