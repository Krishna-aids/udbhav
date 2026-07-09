import { NextResponse } from "next/server";

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: string };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, init);
}

export function fail(status: number, error: string) {
  return NextResponse.json<ApiFailure>({ ok: false, error }, { status });
}

export async function guard(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    console.error(error);
    return fail(500, "Internal server error");
  }
}
