"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const demoAccounts = [
  { label: "Admin", email: "admin@udbhav.local", password: "Admin123!" },
  { label: "Manager", email: "manager@udbhav.local", password: "Manager123!" },
  { label: "Member", email: "member@udbhav.local", password: "Member123!" },
];

type Mode = "login" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("Demo User");
  const [email, setEmail] = useState("manager@udbhav.local");
  const [password, setPassword] = useState("Manager123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "signup" ? { name, email, password } : { email, password }),
    });
    const body = (await response.json()) as { ok: boolean; error?: string };
    setLoading(false);

    if (!body.ok) {
      setError(body.error ?? "Something went wrong");
      return;
    }

    router.push(searchParams.get("next") ?? "/board");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] px-6 py-8 text-[#1d2420]">
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#68766d]">udbhav</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
            A working sprint board for team task flow.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#526158]">
            Sign in with a demo role to see permissions, cleaned seed data, WIP limits, dashboard metrics, and protected APIs running locally.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setMode("login");
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="rounded-md border border-[#bfc8c1] bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-[#eef3ef]"
              >
                {account.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-[#d7d0c3] bg-white p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-2 rounded-md bg-[#edf1ee] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-[#203128] text-white" : "text-[#526158]"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-[#203128] text-white" : "text-[#526158]"}`}
            >
              Signup
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" ? (
              <label className="block text-sm font-medium text-[#344139]">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#cbd3cd] px-3 py-2 outline-none focus:border-[#203128]"
                />
              </label>
            ) : null}
            <label className="block text-sm font-medium text-[#344139]">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-md border border-[#cbd3cd] px-3 py-2 outline-none focus:border-[#203128]"
                type="email"
              />
            </label>
            <label className="block text-sm font-medium text-[#344139]">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-[#cbd3cd] px-3 py-2 outline-none focus:border-[#203128]"
                type="password"
              />
            </label>
            {error ? <p className="rounded-md bg-[#fee7df] px-3 py-2 text-sm text-[#9a3412]">{error}</p> : null}
            <button
              disabled={loading}
              className="w-full rounded-md bg-[#203128] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#344b3f] disabled:opacity-60"
            >
              {loading ? "Working..." : mode === "login" ? "Enter board" : "Create member account"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
