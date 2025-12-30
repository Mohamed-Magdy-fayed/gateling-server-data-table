import {
  TASK_ASSIGNEES,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASKS,
  type Task,
} from "@/features/tasks/data";
import type {
  DataTableCountFetcherMap,
  DataTableFilterMap,
  DataTableListResult,
  DataTableQuery,
  ExtendedColumnSort,
} from "@/types/data-table";

export interface TaskFilters {
  title?: string;
  status?: string[];
  priority?: string[];
  assignee?: string[];
}

export interface TaskTableMeta {
  totalEstimatedHours: number;
  averageCompletion: number;
}

export interface TaskCounts {
  status: Record<string, number>;
  priority: Record<string, number>;
  assignee: Record<string, number>;
}

export async function transformTaskFilters(
  filters: DataTableFilterMap,
): Promise<TaskFilters> {
  return {
    title:
      typeof filters.title === "string" && filters.title.length > 0
        ? filters.title
        : undefined,
    status:
      Array.isArray(filters.status) && filters.status.length > 0
        ? filters.status.filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        )
        : undefined,
    priority:
      Array.isArray(filters.priority) && filters.priority.length > 0
        ? filters.priority.filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        )
        : undefined,
    assignee:
      Array.isArray(filters.assignee) && filters.assignee.length > 0
        ? filters.assignee.filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        )
        : undefined,
  } satisfies TaskFilters;
}

export async function fetchTasks(
  query: DataTableQuery<TaskFilters, Task>,
): Promise<DataTableListResult<Task, TaskTableMeta>> {
  const filtered = applyFilters(TASKS, query.filters);

  const sorted = applySorting(filtered, query.sorting);

  const { page, perPage } = query.pagination;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginated = sorted.slice(start, end);

  const meta: TaskTableMeta = {
    totalEstimatedHours: filtered.reduce(
      (total, task) => total + task.estimatedHours,
      0,
    ),
    averageCompletion:
      filtered.length > 0
        ? Number(
          (
            filtered.reduce((total, task) => total + task.completedPercentage, 0) /
            filtered.length
          ).toFixed(2),
        )
        : 0,
  };

  return {
    rows: paginated,
    total: filtered.length,
    meta,
  };
}

export const taskCountFetchers: DataTableCountFetcherMap<
  TaskFilters,
  TaskCounts,
  Task
> = {
  status: async (query) => buildCountMap("status", query.filters),
  priority: async (query) => buildCountMap("priority", query.filters),
  assignee: async (query) => buildCountMap("assignee", query.filters),
};

export interface CreateTaskInput {
  title: string;
  status: Task["status"];
  priority: Task["priority"];
  assignee: string;
  dueDate: string;
  estimatedHours: number;
}

export interface UpdateTaskInput {
  id: string;
  patch: Partial<Omit<Task, "id">>;
}

export interface DeleteTasksInput {
  ids: string[];
}

export async function createTask(input: CreateTaskInput) {
  "use server";
  await simulateLatency();
  return {
    ...input,
    id: `T-${Math.floor(Math.random() * 10_000)}`,
    completedPercentage: 0,
  } satisfies Task;
}

export async function updateTask(input: UpdateTaskInput) {
  "use server";
  await simulateLatency();
  const existing = TASKS.find((task) => task.id === input.id);

  if (!existing) {
    throw new Error("Task not found");
  }

  return {
    ...existing,
    ...input.patch,
  } satisfies Task;
}

export async function deleteTasks(input: DeleteTasksInput) {
  "use server";
  await simulateLatency();
  return {
    deleted: input.ids,
    remaining: TASKS.filter((task) => !input.ids.includes(task.id)).length,
  };
}

function applyFilters(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((task) => {
    if (filters.title) {
      const search = filters.title.toLowerCase();
      const matches =
        task.title.toLowerCase().includes(search) ||
        task.id.toLowerCase().includes(search) ||
        task.assignee.toLowerCase().includes(search);

      if (!matches) return false;
    }

    if (filters.status?.length && !filters.status.includes(task.status)) {
      return false;
    }

    if (filters.priority?.length && !filters.priority.includes(task.priority)) {
      return false;
    }

    if (filters.assignee?.length && !filters.assignee.includes(task.assignee)) {
      return false;
    }

    return true;
  });
}

function applySorting(
  tasks: Task[],
  sorting: ExtendedColumnSort<Task>[],
): Task[] {
  if (!sorting.length) return [...tasks];

  const sorted = [...tasks];

  sorted.sort((a, b) => {
    for (const sort of sorting) {
      const direction = sort.desc ? -1 : 1;
      const aValue = a[sort.id as keyof Task];
      const bValue = b[sort.id as keyof Task];

      if (aValue === bValue) continue;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (aString < bString) return -1 * direction;
      if (aString > bString) return 1 * direction;
    }

    return 0;
  });

  return sorted;
}

export async function buildCountMap(
  key: keyof TaskFilters,
  filters: TaskFilters,
): Promise<Record<string, number>> {
  const base = initializeCountMap(key);
  const dataset = applyFilters(TASKS, { ...filters, [key]: undefined });

  for (const task of dataset) {
    const value = task[key as keyof Task];
    if (typeof value === "string" && value in base) {
      base[value] += 1;
    }
  }

  return base;
}

function initializeCountMap(key: keyof TaskFilters): Record<string, number> {
  const options =
    key === "status"
      ? TASK_STATUS_OPTIONS
      : key === "priority"
        ? TASK_PRIORITY_OPTIONS
        : TASK_ASSIGNEES;

  return options.reduce<Record<string, number>>((acc, option) => {
    acc[option.value] = 0;
    return acc;
  }, {});
}

async function simulateLatency() {
  await new Promise((resolve) => {
    setTimeout(resolve, 150);
  });
}
