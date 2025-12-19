export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TasksTableClient } from "@/features/tasks/components/tasks-table-client";
import { tasksTable } from "@/features/tasks/table";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const result = await tasksTable.load(resolvedSearchParams);

  return (
    <main className="container mx-auto max-w-7xl space-y-6 py-3">
      <TasksTableClient {...result} />
    </main>
  );
}
