"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragOverEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser, Task, TaskStatus } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { isOverdue, isThisWeek } from "@/lib/dates";

type TasksPayload = {
  tasks: Task[];
  dataHealth: { issuesFixed: number; tasksLoaded: number; label: string };
  user: AuthUser;
};

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };
type DragData =
  | { type: "column"; status: TaskStatus }
  | { type: "task"; task: Task; status: TaskStatus; index: number };

type DropTarget = { status: TaskStatus; index: number } | null;

const emptyTasks: Task[] = [];

const statusMeta: Record<TaskStatus, { accent: string; surface: string; limit: string }> = {
  Backlog: { accent: "bg-[#67776f]", surface: "bg-[#f8f7f3]", limit: "No limit" },
  "In Progress": { accent: "bg-[#4777a6]", surface: "bg-[#f4f8fb]", limit: "WIP 5" },
  Review: { accent: "bg-[#b98747]", surface: "bg-[#fbf7ee]", limit: "WIP 3" },
  Done: { accent: "bg-[#4f8a63]", surface: "bg-[#f2f8f3]", limit: "Managed" },
};

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = closestCenter(args);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
};

function priorityClass(priority: Task["priority"]) {
  if (priority === "high") return "bg-[#ffe3db] text-[#9a3412] border-[#ffc8b8]";
  if (priority === "med") return "bg-[#fff2c9] text-[#775600] border-[#ead389]";
  return "bg-[#e4f1e9] text-[#35624a] border-[#bdd9c8]";
}

function avatarLabel(name: string) {
  if (name === "Unassigned") return "UA";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function columnHours(tasks: Task[], status: TaskStatus) {
  return tasks.filter((task) => task.status === status).reduce((sum, task) => sum + task.estimate_hours, 0);
}

function orderedByPosition(tasks: Task[]) {
  return [...tasks].sort((a, b) => a.position - b.position);
}

function getDragData(value: unknown): DragData | null {
  if (!value || typeof value !== "object" || !("type" in value)) return null;
  const data = value as DragData;
  return data;
}

function resolveDropTarget(overData: DragData | null, allTasks: Task[]): DropTarget {
  if (!overData) return null;
  if (overData.type === "column") {
    return { status: overData.status, index: allTasks.filter((task) => task.status === overData.status).length };
  }
  return { status: overData.status, index: overData.index };
}

function LoadingBoard() {
  return (
    <main className="min-h-screen bg-[#f4f0e8] p-6 text-[#1d2420]">
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-16 rounded-md bg-white" />
        <div className="grid gap-4 lg:grid-cols-4">
          {STATUSES.map((status) => (
            <div key={status} className="h-[620px] rounded-md bg-white/80" />
          ))}
        </div>
      </div>
    </main>
  );
}

function TaskPreview({ task }: { task: Task }) {
  return (
    <div className="w-[320px] rounded-md border border-[#203128] bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#758178]">{task.id}</span>
          <h3 className="mt-2 text-sm font-semibold leading-6 text-[#1d2420]">{task.title}</h3>
        </div>
        <span className={`rounded border px-2 py-1 text-xs font-semibold ${priorityClass(task.priority)}`}>{task.priority}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-[#68766d]">
        <span>{task.assignee}</span>
        <span className="font-semibold text-[#344139]">{task.estimate_hours}h</span>
      </div>
    </div>
  );
}
function TaskCard({ task, index, userRole }: { task: Task; index: number; userRole: AuthUser["role"] }) {
  const dragDisabled = userRole === "member" && task.status === "Done";
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `task:${task.id}`,
    data: { type: "task", task, status: task.status, index } satisfies DragData,
    disabled: dragDisabled,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-task:${task.id}`,
    data: { type: "task", task, status: task.status, index } satisfies DragData,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <article
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      style={style}
      className={`group rounded-md border bg-white p-4 shadow-sm transition ${isDragging ? "opacity-30" : "opacity-100"} ${isOver ? "border-[#203128] ring-2 ring-[#203128]/20" : "border-[#ddd6c9]"} hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#758178]">{task.id}</span>
            {task.has_warning ? <span className="rounded border border-[#ffc8b8] bg-[#ffe3db] px-1.5 py-0.5 text-xs font-bold text-[#9a3412]">WARN</span> : null}
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-6 text-[#1d2420]">{task.title}</h3>
        </div>
        <button
          type="button"
          aria-label={`Drag ${task.title}`}
          title={dragDisabled ? "Members cannot drag Done cards" : "Drag task"}
          {...listeners}
          {...attributes}
          className={`grid size-8 shrink-0 place-items-center rounded-md border text-sm ${dragDisabled ? "cursor-not-allowed border-[#ddd6c9] bg-[#f6f3ec] text-[#a39a8d]" : "cursor-grab border-[#c9d4ce] bg-[#f7faf8] text-[#526158] active:cursor-grabbing"}`}
        >
          ::
        </button>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#5d6961]">{task.description}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#203128] text-xs font-semibold text-white">{avatarLabel(task.assignee)}</span>
          <span className="truncate text-sm font-medium text-[#344139]">{task.assignee}</span>
        </div>
        <span className={`rounded border px-2 py-1 text-xs font-semibold ${priorityClass(task.priority)}`}>{task.priority}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {task.labels.map((label) => (
          <span key={label} className="rounded bg-[#edf1ee] px-2 py-1 text-[#526158]">{label}</span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#eee8dd] pt-3 text-xs text-[#68766d]">
        <span className={isOverdue(task.due_date, task.status) ? "font-semibold text-[#9a3412]" : ""}>{task.due_date ?? "No due date"}</span>
        <span className="font-semibold text-[#344139]">{task.estimate_hours}h</span>
      </div>
    </article>
  );
}

function BoardColumn({
  status,
  tasks,
  visibleTasks,
  user,
  isDropTarget,
  blockedDrop,
}: {
  status: TaskStatus;
  tasks: Task[];
  visibleTasks: Task[];
  user: AuthUser;
  isDropTarget: boolean;
  blockedDrop: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${status}`,
    data: { type: "column", status } satisfies DragData,
  });
  const fullColumn = orderedByPosition(tasks.filter((task) => task.status === status));
  const visibleColumn = orderedByPosition(visibleTasks.filter((task) => task.status === status));
  const doneWeekHours = status === "Done" ? fullColumn.filter((task) => isThisWeek(task.completed_date)).reduce((sum, task) => sum + task.estimate_hours, 0) : null;

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[680px] flex-col rounded-md border p-3 transition ${statusMeta[status].surface} ${isOver || isDropTarget ? "border-[#203128] ring-2 ring-[#203128]/15" : "border-[#d8d0c2]"} ${blockedDrop ? "border-[#c2410c] ring-2 ring-[#c2410c]/20" : ""}`}
    >
      <div className="mb-3 rounded-md bg-white/75 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${statusMeta[status].accent}`} />
              <h2 className="font-semibold text-[#203128]">{status}</h2>
              {user.role === "member" && status === "Done" ? <span className="rounded bg-[#f1e7d5] px-2 py-0.5 text-xs font-semibold text-[#7b5b24]">locked</span> : null}
            </div>
            <p className="mt-1 text-xs text-[#68766d]">
              {fullColumn.length} cards · {columnHours(tasks, status)}h{doneWeekHours !== null ? ` · ${doneWeekHours}h this week` : ""}
            </p>
          </div>
          <span className="rounded border border-[#d8d0c2] bg-[#faf8f3] px-2 py-1 text-xs font-semibold text-[#526158]">{statusMeta[status].limit}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {visibleColumn.length === 0 ? (
          <div className="grid min-h-28 place-items-center rounded-md border border-dashed border-[#c8d1cb] bg-white/55 p-4 text-center text-sm text-[#68766d]">
            Drop tasks here
          </div>
        ) : null}
        {visibleColumn.map((task, index) => (
          <TaskCard key={task.id} task={task} index={index} userRole={user.role} />
        ))}
      </div>
    </section>
  );
}

export function BoardClient() {
  const [payload, setPayload] = useState<TasksPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    const response = await fetch("/api/tasks", { cache: "no-store" });
    return (await response.json()) as ApiResponse<TasksPayload>;
  }, []);

  const refresh = useCallback(async () => {
    const body = await load();
    if (!body.ok) {
      setError(body.error);
      setLoading(false);
      return;
    }
    setError(null);
    setPayload(body.data);
    setLoading(false);
  }, [load]);

  useEffect(() => {
    let active = true;
    void load().then((body) => {
      if (!active) return;
      if (!body.ok) {
        setError(body.error);
        setLoading(false);
        return;
      }
      setPayload(body.data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const tasks = payload?.tasks ?? emptyTasks;
  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesQuery = task.title.toLowerCase().includes(query.toLowerCase());
      const matchesAssignee = assignee === "All" || task.assignee === assignee;
      const matchesOverdue = !overdueOnly || isOverdue(task.due_date, task.status);
      return matchesQuery && matchesAssignee && matchesOverdue;
    });
  }, [assignee, overdueOnly, query, tasks]);
  const assignees = useMemo(() => ["All", ...Array.from(new Set(tasks.map((task) => task.assignee))).sort()], [tasks]);
  const blockedDrop = payload?.user.role === "member" && overStatus === "Done";

  function onDragStart(event: DragStartEvent) {
    const data = getDragData(event.active.data.current);
    if (data?.type === "task") {
      setActiveTask(data.task);
      setOverStatus(data.status);
    }
  }

  function onDragOver(event: DragOverEvent) {
    const target = resolveDropTarget(getDragData(event.over?.data.current), tasks);
    setOverStatus(target?.status ?? null);
  }

  async function onDragEnd(event: DragEndEvent) {
    const dragged = getDragData(event.active.data.current);
    const target = resolveDropTarget(getDragData(event.over?.data.current), tasks);
    setActiveTask(null);
    setOverStatus(null);

    if (!dragged || dragged.type !== "task" || !target) return;
    if (payload?.user.role === "member" && target.status === "Done") {
      setToast("Members cannot move tasks into Done");
      return;
    }
    if (dragged.status === target.status && dragged.index === target.index) return;

    const response = await fetch("/api/tasks/move", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: dragged.task.id, toStatus: target.status, toIndex: target.index }),
    });
    const body = (await response.json()) as ApiResponse<{ task: Task }>;
    if (!body.ok) {
      setToast(body.error);
      return;
    }
    setToast(`${dragged.task.id} moved to ${target.status}`);
    await refresh();
  }

  async function resetBoard() {
    const response = await fetch("/api/import", { method: "POST" });
    const body = (await response.json()) as ApiResponse<{ label: string }>;
    if (!body.ok) {
      setToast(body.error);
      return;
    }
    setToast(body.data.label);
    await refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (loading) return <LoadingBoard />;
  if (error || !payload) {
    return <main className="min-h-screen bg-[#f4f0e8] p-8 text-[#9a3412]">{error ?? "Unable to load board"}</main>;
  }

  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#1d2420]">
      <header className="sticky top-0 z-20 border-b border-[#d8d0c2] bg-white/95 px-5 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#68766d]">udbhav</p>
            <h1 className="text-3xl font-semibold tracking-normal">Sprint Board</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-md border border-[#c9d4ce] bg-[#eef4f0] px-3 py-2 font-medium text-[#284335]">{payload.dataHealth.label}</span>
            <span className="rounded-md border border-[#d8d0c2] bg-[#faf8f3] px-3 py-2 font-medium">{payload.user.name} · {payload.user.role}</span>
            <a className="rounded-md border border-[#bfc8c1] bg-white px-3 py-2 font-medium hover:bg-[#f2f6f3]" href="/dashboard">Dashboard</a>
            <button onClick={resetBoard} className="rounded-md border border-[#bfc8c1] bg-white px-3 py-2 font-medium hover:bg-[#f2f6f3]">Reset board</button>
            <button onClick={logout} className="rounded-md bg-[#203128] px-3 py-2 font-semibold text-white hover:bg-[#344b3f]">Logout</button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1600px] px-5 py-5">
        <div className="mb-5 grid gap-3 rounded-md border border-[#d8d0c2] bg-white p-4 shadow-sm md:grid-cols-[1fr_240px_auto] md:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search task title"
            className="rounded-md border border-[#cbd3cd] bg-[#fbfaf7] px-3 py-2 outline-none transition focus:border-[#203128] focus:bg-white"
          />
          <select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="rounded-md border border-[#cbd3cd] bg-[#fbfaf7] px-3 py-2 outline-none transition focus:border-[#203128] focus:bg-white">
            {assignees.map((item) => <option key={item}>{item}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm font-medium text-[#46534c]">
            <input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} className="size-4 accent-[#203128]" />
            Overdue only
          </label>
        </div>

        {toast ? (
          <button onClick={() => setToast(null)} className="mb-5 w-full rounded-md border border-[#d7bf8f] bg-[#fff7df] px-4 py-3 text-left text-sm font-medium text-[#6f5100] shadow-sm">
            {toast}
          </button>
        ) : null}

        <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActiveTask(null); setOverStatus(null); }}>
          <div className="grid gap-4 xl:grid-cols-4">
            {STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                tasks={tasks}
                visibleTasks={visibleTasks}
                user={payload.user}
                isDropTarget={overStatus === status}
                blockedDrop={blockedDrop && status === "Done"}
              />
            ))}
          </div>
          <DragOverlay>{activeTask ? <TaskPreview task={activeTask} /> : null}</DragOverlay>
        </DndContext>
      </section>
    </main>
  );
}

