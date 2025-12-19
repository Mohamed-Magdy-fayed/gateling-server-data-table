import type React from "react";
import type {
  ColumnDef,
  ColumnSort,
  Row,
  RowData,
  TableState,
} from "@tanstack/react-table";

import type { DataTableConfig } from "@/config/data-table";
import type { FilterItemSchema } from "@/lib/parsers";

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: TValue is used in the ColumnMeta interface
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    placeholder?: string;
    variant?: FilterVariant;
    options?: Option[];
    range?: [number, number];
    unit?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  }
}

export interface Option {
  label: string;
  value: string;
  count?: number;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

export type FilterOperator = DataTableConfig["operators"][number];
export type FilterVariant = DataTableConfig["filterVariants"][number];
export type JoinOperator = DataTableConfig["joinOperators"][number];

export interface ExtendedColumnSort<TData> extends Omit<ColumnSort, "id"> {
  id: Extract<keyof TData, string>;
}

export interface ExtendedColumnFilter<TData> extends FilterItemSchema {
  id: Extract<keyof TData, string>;
}

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  variant: "update" | "delete";
}

export type DataTableFilterValue = string | string[] | number | number[] | null;

export type DataTableFilterMap = Record<string, DataTableFilterValue>;

export interface DataTableFilterDefinition<TValue = DataTableFilterValue> {
  id: string;
  key?: string;
  variant: FilterVariant;
  separator?: string;
  expectsArray?: boolean;
  parse?: (value: string | string[] | null) => TValue | null;
}

export interface DataTablePaginationState {
  page: number;
  perPage: number;
}

export type DataTableInitialState<TData> = Omit<
  Partial<TableState>,
  "sorting"
> & {
  sorting?: ExtendedColumnSort<TData>[];
};

export interface DataTableQuery<
  TFilters = DataTableFilterMap,
  TData = unknown,
> {
  pagination: DataTablePaginationState;
  sorting: ExtendedColumnSort<TData>[];
  filters: TFilters;
  advancedFilters: ExtendedColumnFilter<TData>[];
  searchParams: URLSearchParams;
}

export interface DataTableListResult<TData, TMeta = Record<string, unknown>> {
  rows: TData[];
  pageCount?: number;
  total?: number;
  meta?: TMeta;
}

export type DataTableFetcher<
  TData,
  TFilters = DataTableFilterMap,
  TMeta = Record<string, unknown>,
> = (
  query: DataTableQuery<TFilters, TData>,
) => Promise<DataTableListResult<TData, TMeta>>;

export type DataTableCountFetcher<
  TFilters = DataTableFilterMap,
  TResult = unknown,
  TData = unknown,
> = (query: DataTableQuery<TFilters, TData>) => Promise<TResult>;

export type DataTableCountFetcherMap<TFilters, TCounts, TData = unknown> = {
  [Key in keyof TCounts]: DataTableCountFetcher<TFilters, TCounts[Key], TData>;
};

export interface DataTableActionConfig<TInput = unknown, TResult = unknown> {
  action: (input: TInput) => Promise<TResult>;
  label?: string;
  description?: string;
  successMessage?: string;
  confirmationMessage?: string;
}

export type BuiltInDataTableAction = "create" | "update" | "delete";

export type DataTableFeatureKey =
  | BuiltInDataTableAction
  | (string & Record<never, never>);

export type DataTableFeatures = Partial<
  Record<DataTableFeatureKey, DataTableActionConfig>
>;

export interface DataTableColumnsContext<TCounts = Record<string, unknown>> {
  counts: TCounts;
  features: DataTableFeatures | undefined;
}

export type DataTableColumnsFactory<TData, TCounts = Record<string, unknown>> =
  | ColumnDef<TData, unknown>[]
  | ((
      context: DataTableColumnsContext<TCounts>,
    ) => ColumnDef<TData, unknown>[]);
