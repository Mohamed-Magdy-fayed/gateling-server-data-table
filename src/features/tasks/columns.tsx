import type { ColumnDef } from "@tanstack/react-table";
import { CheckSquare, Square } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import type { TaskCounts } from "@/features/tasks/actions";
import {
  TASK_ASSIGNEES,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  type Task,
} from "@/features/tasks/data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DataTableColumnsContext, Option } from "@/types/data-table";

export function getTaskColumns(
  context: DataTableColumnsContext<TaskCounts>,
): ColumnDef<Task, unknown>[] {
  const counts = (context.counts ?? {}) as Partial<TaskCounts>;

  const statusOptions = withCounts(TASK_STATUS_OPTIONS, counts.status ?? {});
  const priorityOptions = withCounts(
    TASK_PRIORITY_OPTIONS,
    counts.priority ?? {},
  );
  const assigneeOptions = withCounts(TASK_ASSIGNEES, counts.assignee ?? {});

  const assigneeLabels = new Map(
    assigneeOptions.map((option) => [option.value, option.label]),
  );

  return [
    {
      id: "select",
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => {
        const isAllSelected = table.getIsAllPageRowsSelected();
        const Icon = isAllSelected ? CheckSquare : Square;

        return (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={isAllSelected ? "Deselect all rows" : "Select all rows"}
            onClick={(event) => {
              event.preventDefault();
              table.toggleAllPageRowsSelected(!isAllSelected);
            }}
          >
            <Icon className="size-4" />
          </button>
        );
      },
      cell: ({ row }) => {
        const isSelected = row.getIsSelected();
        const Icon = isSelected ? CheckSquare : Square;

        return (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={isSelected ? "Deselect row" : "Select row"}
            onClick={(event) => {
              event.preventDefault();
              row.toggleSelected(!isSelected);
            }}
          >
            <Icon className="size-4" />
          </button>
        );
      },
    },
    {
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Task" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.id}
        </span>
      ),
      enableHiding: false,
      enableSorting: true,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      enableColumnFilter: true,
      meta: {
        label: "Search title",
        placeholder: "Search tasks...",
        variant: "text" as const,
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {statusOptions.find((option) => option.value === row.original.status)
            ?.label ?? row.original.status}
        </Badge>
      ),
      enableColumnFilter: true,
      meta: {
        label: "Status",
        variant: "multiSelect" as const,
        options: statusOptions,
      },
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ row }) => (
        <Badge variant={priorityVariant(row.original.priority)}>
          {priorityOptions.find((option) => option.value === row.original.priority)
            ?.label ?? row.original.priority}
        </Badge>
      ),
      enableColumnFilter: true,
      meta: {
        label: "Priority",
        variant: "multiSelect",
        options: priorityOptions,
      },
    },
    {
      accessorKey: "assignee",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assignee" />
      ),
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-medium uppercase text-secondary-foreground">
            {row.original.assignee.slice(0, 2)}
          </span>
          <span className="font-medium">
            {assigneeLabels.get(row.original.assignee) ?? row.original.assignee}
          </span>
        </span>
      ),
      enableColumnFilter: true,
      meta: {
        label: "Assignee",
        variant: "multiSelect" as const,
        options: assigneeOptions,
      },
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.dueDate)}
        </span>
      ),
      enableColumnFilter: true,
      meta: {
        label: "Due date",
        variant: "date" as const,
      },
    },
    {
      accessorKey: "estimatedHours",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estimate" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.estimatedHours}h</span>
      ),
      enableColumnFilter: true,
      meta: {
        label: "Estimated hours",
        variant: "number" as const,
        unit: "h",
      },
    },
    {
      accessorKey: "completedPercentage",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Progress" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full bg-primary", {
                "bg-orange-500": row.original.completedPercentage < 50,
                "bg-lime-500":
                  row.original.completedPercentage >= 50 &&
                  row.original.completedPercentage < 90,
                "bg-emerald-500": row.original.completedPercentage >= 90,
              })}
              style={{ width: `${row.original.completedPercentage}%` }}
            />
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.completedPercentage}%
          </span>
        </div>
      ),
    },
  ];
}

function withCounts(options: Option[], counts: Record<string, number>) {
  return options.map((option) => ({
    ...option,
    count: counts?.[option.value] ?? 0,
  }));
}

function statusVariant(status: Task["status"]) {
  switch (status) {
    case "done":
      return "secondary" as const;
    case "blocked":
      return "destructive" as const;
    case "in-progress":
    case "review":
      return "default" as const;
    default:
      return "outline" as const;
  }
}

function priorityVariant(priority: Task["priority"]) {
  switch (priority) {
    case "critical":
      return "destructive" as const;
    case "high":
      return "default" as const;
    case "medium":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}
