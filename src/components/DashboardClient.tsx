"use client";

import { useEffect, useState } from "react";

type Stats = {
  tasksByStatus: { status: string; count: number }[];
  hoursByAssignee: { assignee: string; hours: number }[];
  completedThisWeek: number;
};

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/stats", { cache: "no-store" });
      const body = (await response.json()) as ApiResponse<Stats>;
      if (!body.ok) {
        setError(body.error);
        return;
      }
      setStats(body.data);
    }
    void load();
  }, []);

  if (error) return <main className="min-h-screen bg-[#f6f3ec] p-8 text-[#9a3412]">{error}</main>;
  if (!stats) return <main className="min-h-screen bg-[#f6f3ec] p-8 text-[#1d2420]">Loading dashboard...</main>;

  const maxStatus = Math.max(...stats.tasksByStatus.map((item) => item.count), 1);
  const maxHours = Math.max(...stats.hoursByAssignee.map((item) => item.hours), 1);

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#1d2420]">
      <header className="border-b border-[#d8d0c2] bg-white px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#68766d]">udbhav</p>
            <h1 className="text-3xl font-semibold">Dashboard</h1>
          </div>
          <a className="rounded-md bg-[#203128] px-4 py-2 text-sm font-semibold text-white" href="/board">Board</a>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-3">
        <article className="rounded-md border border-[#d8d0c2] bg-white p-5">
          <p className="text-sm font-medium text-[#68766d]">Completed this week</p>
          <p className="mt-3 text-5xl font-semibold">{stats.completedThisWeek}</p>
        </article>
        <article className="rounded-md border border-[#d8d0c2] bg-white p-5 lg:col-span-2">
          <h2 className="font-semibold">Tasks by status</h2>
          <div className="mt-5 space-y-4">
            {stats.tasksByStatus.map((item) => (
              <div key={item.status}>
                <div className="mb-1 flex justify-between text-sm"><span>{item.status}</span><span>{item.count}</span></div>
                <div className="h-3 rounded bg-[#edf1ee]"><div className="h-3 rounded bg-[#3b5d4b]" style={{ width: `${(item.count / maxStatus) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-md border border-[#d8d0c2] bg-white p-5 lg:col-span-3">
          <h2 className="font-semibold">Hours by assignee</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {stats.hoursByAssignee.map((item) => (
              <div key={item.assignee}>
                <div className="mb-1 flex justify-between text-sm"><span>{item.assignee}</span><span>{item.hours}h</span></div>
                <div className="h-3 rounded bg-[#edf1ee]"><div className="h-3 rounded bg-[#b98747]" style={{ width: `${(item.hours / maxHours) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
