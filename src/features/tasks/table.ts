import { createServerDataTable } from "@/data-table/lib/server-table";
import type { DataTableActionConfig } from "@/types/data-table";
import { getTaskColumns } from "@/features/tasks/columns";
import {
  createTask,
  deleteTasks,
  fetchTasks,
  taskCountFetchers,
  transformTaskFilters,
  updateTask,
  type TaskCounts,
  type TaskFilters,
  type TaskTableMeta,
} from "@/features/tasks/actions";
import type { Task } from "@/features/tasks/data";

export const tasksTable = createServerDataTable<
  Task,
  TaskFilters,
  TaskCounts,
  TaskTableMeta
>({
  entity: "task",
  columns: (context) => getTaskColumns(context),
  fetcher: fetchTasks,
  counts: taskCountFetchers,
  transformFilters: transformTaskFilters,
  defaultPageSize: 10,
  initialState: {
    sorting: [{ id: "dueDate", desc: false }],
    columnVisibility: {
      estimatedHours: true,
    },
  },
  features: {
    create: {
      action: createTask as DataTableActionConfig["action"],
      label: "Create task",
      description: "Create a new task record.",
      successMessage: "Task created",
    },
    update: {
      action: updateTask as DataTableActionConfig["action"],
      label: "Update task",
      description: "Update the selected task.",
      successMessage: "Task updated",
    },
    delete: {
      action: deleteTasks as DataTableActionConfig["action"],
      label: "Delete tasks",
      description: "Remove selected tasks.",
      confirmationMessage: "This will permanently delete the selected tasks.",
      successMessage: "Tasks deleted",
    },
  },
});
