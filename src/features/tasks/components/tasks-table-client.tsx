"use client";

import * as React from "react";
import type { ColumnDef, Table } from "@tanstack/react-table";
import { Loader2, Plus, Trash } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import {
  DataTableProvider,
  useDataTableContext,
} from "@/data-table/components/data-table-provider";
import type { ServerDataTableLoadResult } from "@/data-table/lib/server-table";
import { useDataTable } from "@/hooks/use-data-table";
import { getTaskColumns } from "@/features/tasks/columns";

import type {
  TaskCounts,
  TaskFilters,
  TaskTableMeta,
  DeleteTasksInput,
} from "@/features/tasks/actions";
import type { Task } from "@/features/tasks/data";

interface TasksTableClientProps
  extends ServerDataTableLoadResult<
    Task,
    TaskFilters,
    TaskCounts,
    TaskTableMeta
  > {}

export function TasksTableClient(props: TasksTableClientProps) {
  const columns = React.useMemo<ColumnDef<Task, unknown>[]>(() => {
    return getTaskColumns({
      counts: props.counts,
      features: props.features,
    });
  }, [props.counts, props.features]);

  const [isRouting, startTransition] = React.useTransition();
  const { table } = useDataTable<Task>({
    columns,
    data: props.data,
    pageCount: props.pageCount,
    initialState: props.initialState,
    history: "push",
    shallow: false,
    startTransition,
  });

  return (
    <DataTableProvider
      value={{
        entity: props.entity,
        counts: props.counts,
        features: props.features,
        meta: props.meta ?? {
          totalEstimatedHours: 0,
          averageCompletion: 0,
        },
      }}
    >
      <section className="space-y-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Server-side tasks</h1>
          <p className="text-sm text-muted-foreground">
            {props.meta
              ? `Visible tasks estimate ${props.meta.totalEstimatedHours} total hours · average completion ${props.meta.averageCompletion}%`
              : "All data is fetched on the server with pagination, filters, and sorting."}
          </p>
        </header>
        <DataTable
          table={table}
          actionBar={<TasksSelectionActions table={table} />}
          aria-busy={isRouting}
        >
          <DataTableToolbar table={table}>
            <TasksToolbarExtras />
          </DataTableToolbar>
        </DataTable>
      </section>
    </DataTableProvider>
  );
}

function TasksToolbarExtras() {
  const { features } = useDataTableContext<TaskCounts, TaskTableMeta>();
  const [isPending, startTransition] = React.useTransition();

  const onCreate = React.useCallback(() => {
    if (!features?.create?.action) return;

    startTransition(async () => {
      await features.create?.action?.({
        title: "Untitled task",
        status: "todo",
        priority: "medium",
        assignee: "alex",
        dueDate: new Date().toISOString().slice(0, 10),
        estimatedHours: 4,
      });
    });
  }, [features?.create]);

  if (!features?.create) return null;

  return (
    <Button onClick={onCreate} disabled={isPending} size="sm">
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Plus className="size-4" />
      )}
      New task
    </Button>
  );
}

function TasksSelectionActions({ table }: { table: Table<Task> }) {
  const { features } = useDataTableContext<TaskCounts, TaskTableMeta>();
  const [isPending, startTransition] = React.useTransition();
  const selectedRows = table.getSelectedRowModel().rows;

  const onDelete = React.useCallback(() => {
    if (!features?.delete?.action || selectedRows.length === 0) return;

    const payload: DeleteTasksInput = {
      ids: selectedRows.map((row) => row.original.id),
    };

    startTransition(async () => {
      await features.delete?.action?.(payload);
      table.resetRowSelection();
    });
  }, [features?.delete, selectedRows, table]);

  if (!features?.delete) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending || selectedRows.length === 0}
        onClick={onDelete}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash className="size-4" />
        )}
        Delete
      </Button>
    </div>
  );
}
