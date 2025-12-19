import type { ColumnDef } from "@tanstack/react-table";
import { DATA_TABLE_DEFAULT_PAGE_SIZE } from "@/data-table/lib/constants";
import {
  type ParsedDataTableState,
  parseDataTableState,
  type SearchParamsInput,
} from "@/data-table/lib/state";
import type {
  DataTableColumnsFactory,
  DataTableCountFetcherMap,
  DataTableFeatures,
  DataTableFetcher,
  DataTableFilterDefinition,
  DataTableFilterMap,
  DataTableInitialState,
  DataTableQuery,
  ExtendedColumnFilter,
  ExtendedColumnSort,
} from "@/types/data-table";

export interface CreateServerDataTableConfig<
  TData,
  TFilters = DataTableFilterMap,
  TCounts = Record<string, unknown>,
  TMeta = Record<string, unknown>,
> {
  entity: string;
  columns: DataTableColumnsFactory<TData, TCounts>;
  fetcher: DataTableFetcher<TData, TFilters, TMeta>;
  counts?: DataTableCountFetcherMap<TFilters, TCounts, TData>;
  filterDefinitions?: DataTableFilterDefinition[];
  transformFilters?: (filters: DataTableFilterMap) => Promise<TFilters>;
  features?: DataTableFeatures;
  defaultPageSize?: number;
  initialState?: DataTableInitialState<TData>;
  enableAdvancedFilters?: boolean;
  filtersKey?: string;
}

export interface ServerDataTable<TData, TFilters, TCounts, TMeta> {
  entity: string;
  load: (
    searchParams: SearchParamsInput,
  ) => Promise<ServerDataTableLoadResult<TData, TFilters, TCounts, TMeta>>;
  getColumns: (counts?: TCounts) => ColumnDef<TData, unknown>[];
  features?: DataTableFeatures;
  initialState?: DataTableInitialState<TData>;
  filterDefinitions: DataTableFilterDefinition[];
  columnIds: Set<string>;
}

export interface ServerDataTableLoadResult<TData, TFilters, TCounts, TMeta> {
  entity: string;
  data: TData[];
  pageCount: number;
  total?: number;
  counts: TCounts;
  features?: DataTableFeatures;
  state: DataTableQuery<TFilters, TData> & { rawFilters: DataTableFilterMap };
  meta?: TMeta;
  initialState?: DataTableInitialState<TData>;
}

export function createServerDataTable<
  TData,
  TFilters = DataTableFilterMap,
  TCounts = Record<string, unknown>,
  TMeta = Record<string, unknown>,
>(
  config: CreateServerDataTableConfig<TData, TFilters, TCounts, TMeta>,
): ServerDataTable<TData, TFilters, TCounts, TMeta> {
  const {
    entity,
    columns,
    fetcher,
    counts,
    filterDefinitions,
    transformFilters,
    features,
    defaultPageSize,
    initialState,
    enableAdvancedFilters,
    filtersKey,
  } = config;

  const baseColumns = resolveColumns(columns, features);
  const columnIds = collectColumnIds(baseColumns);

  const resolvedFilterDefinitions = filterDefinitions?.length
    ? filterDefinitions
    : inferFilterDefinitions(baseColumns);

  const load = async (
    searchParams: SearchParamsInput,
  ): Promise<ServerDataTableLoadResult<TData, TFilters, TCounts, TMeta>> => {
    const state = await parseDataTableState<TFilters>({
      searchParams,
      defaultPageSize:
        defaultPageSize ??
        initialState?.pagination?.pageSize ??
        DATA_TABLE_DEFAULT_PAGE_SIZE,
      columnIds,
      filterDefinitions: resolvedFilterDefinitions,
      transformFilters,
      filtersKey,
      enableAdvancedFilters,
    });

    const query = buildQuery<TData, TFilters>(state);

    const [listResult, countResults] = await Promise.all([
      fetcher(query),
      counts ? resolveCounts(counts, query) : ({} as TCounts),
    ]);

    const pageCount = resolvePageCount(
      listResult.pageCount,
      listResult.total,
      query.pagination.perPage,
    );

    return {
      entity,
      data: listResult.rows,
      pageCount,
      total: listResult.total,
      counts: countResults,
      features,
      state: {
        ...query,
        rawFilters: state.rawFilters,
      },
      meta: listResult.meta,
      initialState,
    };
  };

  return {
    entity,
    load,
    getColumns: (countsResult?: TCounts) =>
      resolveColumns(columns, features, countsResult),
    features,
    initialState,
    filterDefinitions: resolvedFilterDefinitions,
    columnIds,
  };
}

function resolveColumns<TData, TCounts>(
  columns: DataTableColumnsFactory<TData, TCounts>,
  features?: DataTableFeatures,
  counts?: TCounts,
): ColumnDef<TData, unknown>[] {
  if (typeof columns === "function") {
    return columns({
      counts: counts ?? ({} as TCounts),
      features,
    });
  }

  return columns;
}

function inferFilterDefinitions<TData>(
  columns: ColumnDef<TData, unknown>[],
): DataTableFilterDefinition[] {
  const definitions: DataTableFilterDefinition[] = [];

  const visit = (cols: ColumnDef<TData, unknown>[]) => {
    cols.forEach((column) => {
      if ("columns" in column && Array.isArray(column.columns)) {
        visit(column.columns as ColumnDef<TData, unknown>[]);
      }

      const columnId = resolveColumnId(column);
      const variant = column.meta?.variant;

      if (!columnId || !variant) return;

      const expectsArray =
        column.meta?.options !== undefined ||
        variant === "multiSelect" ||
        variant === "select" ||
        variant === "range" ||
        variant === "dateRange";

      definitions.push({
        id: columnId,
        variant,
        expectsArray,
      });
    });
  };

  visit(columns);

  return definitions;
}

function collectColumnIds<TData>(
  columns: ColumnDef<TData, unknown>[],
): Set<string> {
  const ids = new Set<string>();

  const visit = (cols: ColumnDef<TData, unknown>[]) => {
    cols.forEach((column) => {
      const columnId = resolveColumnId(column);

      if (columnId) {
        ids.add(columnId);
      }

      if ("columns" in column && Array.isArray(column.columns)) {
        visit(column.columns as ColumnDef<TData, unknown>[]);
      }
    });
  };

  visit(columns);

  return ids;
}

function resolveColumnId<TData>(
  column: ColumnDef<TData, unknown>,
): string | null {
  if (column.id) {
    return column.id;
  }

  const accessorKey = (
    column as ColumnDef<TData, unknown> & { accessorKey?: unknown }
  ).accessorKey;

  if (typeof accessorKey === "string") {
    return accessorKey;
  }

  return null;
}

function buildQuery<TData, TFilters>(
  state: ParsedDataTableState<TFilters>,
): DataTableQuery<TFilters, TData> {
  return {
    pagination: state.pagination,
    sorting: state.sorting as ExtendedColumnSort<TData>[],
    filters: state.filters,
    advancedFilters: state.advancedFilters as ExtendedColumnFilter<TData>[],
    searchParams: state.searchParams,
  };
}

async function resolveCounts<TFilters, TCounts, TData>(
  counts: DataTableCountFetcherMap<TFilters, TCounts, TData>,
  query: DataTableQuery<TFilters, TData>,
): Promise<TCounts> {
  const result: Partial<TCounts> = {};

  await Promise.all(
    (Object.keys(counts) as Array<keyof TCounts>).map(async (key) => {
      const fetcher = counts[key];
      const value = await fetcher(query);
      result[key] = value;
    }),
  );

  return result as TCounts;
}

function resolvePageCount(
  pageCount: number | undefined,
  total: number | undefined,
  perPage: number,
): number {
  if (typeof pageCount === "number" && Number.isFinite(pageCount)) {
    return Math.max(1, pageCount);
  }

  if (typeof total === "number" && Number.isFinite(total)) {
    return Math.max(1, Math.ceil(total / perPage));
  }

  return 1;
}
