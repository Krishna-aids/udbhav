export function startOfWeek(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function endOfWeek(date = new Date()) {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isThisWeek(value: string | null, now = new Date()) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  return date >= startOfWeek(now) && date <= endOfWeek(now);
}

export function isOverdue(dueDate: string | null, status: string, now = new Date()) {
  if (!dueDate || status === "Done") return false;
  const due = new Date(`${dueDate}T23:59:59`);
  return due < now;
}
