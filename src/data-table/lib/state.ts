import {
  DATA_TABLE_ARRAY_SEPARATOR,
  DATA_TABLE_DEFAULT_PAGE_SIZE,
  DATA_TABLE_FILTERS_KEY,
  DATA_TABLE_PAGE_KEY,
  DATA_TABLE_PER_PAGE_KEY,
  DATA_TABLE_SORT_KEY,
} from "@/data-table/lib/constants";
import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers";
import { getValidFilters } from "@/lib/data-table";
import type {
  DataTableFilterDefinition,
  DataTableFilterMap,
  DataTablePaginationState,
  DataTableFilterValue,
  ExtendedColumnFilter,
  ExtendedColumnSort,
} from "@/types/data-table";

export type SearchParamsInput =
  | URLSearchParams
  | string
  | Record<string, string | string[] | undefined>;

export interface ParseDataTableStateOptions<TFilters = DataTableFilterMap> {
  searchParams: SearchParamsInput;
  defaultPageSize?: number;
  columnIds?: string[] | Set<string>;
  filterDefinitions?: DataTableFilterDefinition[];
  transformFilters?: (filters: DataTableFilterMap) => Promise<TFilters>;
  filtersKey?: string;
  enableAdvancedFilters?: boolean;
}

export interface ParsedDataTableState<TFilters = DataTableFilterMap> {
  pagination: DataTablePaginationState;
  sorting: ExtendedColumnSort<unknown>[];
  filters: TFilters;
  rawFilters: DataTableFilterMap;
  advancedFilters: ExtendedColumnFilter<unknown>[];
  searchParams: URLSearchParams;
}

export function toURLSearchParams(input: SearchParamsInput): URLSearchParams {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }

  if (typeof input === "string") {
    return new URLSearchParams(input);
  }

  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        params.append(key, item);
      });
    } else if (value !== undefined) {
      params.append(key, value);
    }
  });

  return params;
}

export async function parseDataTableState<TFilters = DataTableFilterMap>(
  options: ParseDataTableStateOptions<TFilters>,
): Promise<ParsedDataTableState<TFilters>> {
  const {
    searchParams,
    defaultPageSize = DATA_TABLE_DEFAULT_PAGE_SIZE,
    columnIds,
    filterDefinitions = [],
    transformFilters,
    filtersKey = DATA_TABLE_FILTERS_KEY,
    enableAdvancedFilters = false,
  } = options;

  const params = toURLSearchParams(searchParams);

  const pagination = parsePagination(params, defaultPageSize);
  const sorting = parseSorting(params, columnIds);
  const rawFilters = parseFilters(params, filterDefinitions);

  let advancedFilters: ExtendedColumnFilter<unknown>[] = [];

  if (enableAdvancedFilters) {
    const rawAdvancedFilters = params.get(filtersKey);
    if (rawAdvancedFilters) {
      const parser = getFiltersStateParser<unknown>(columnIds);
      const parsed = parser.parse(rawAdvancedFilters);
      if (parsed) {
        advancedFilters = getValidFilters(parsed);
      }
    }
  }

  const filters = transformFilters
    ? await transformFilters(rawFilters)
    : (rawFilters as TFilters);

  return {
    pagination,
    sorting,
    filters,
    rawFilters,
    advancedFilters,
    searchParams: params,
  };
}

function parsePagination(
  params: URLSearchParams,
  fallbackPageSize: number,
): DataTablePaginationState {
  const page = clampToMinimum(parseInteger(params.get(DATA_TABLE_PAGE_KEY)), 1);
  const perPage = clampToMinimum(
    parseInteger(params.get(DATA_TABLE_PER_PAGE_KEY)),
    fallbackPageSize,
  );

  return {
    page,
    perPage,
  };
}

function parseSorting(
  params: URLSearchParams,
  columnIds?: string[] | Set<string>,
): ExtendedColumnSort<unknown>[] {
  const rawSorting = params.get(DATA_TABLE_SORT_KEY);
  if (!rawSorting) return [];

  const parser = getSortingStateParser<unknown>(columnIds);
  const parsed = parser.parse(rawSorting);

  return Array.isArray(parsed) ? parsed : [];
}

function parseFilters(
  params: URLSearchParams,
  filterDefinitions: DataTableFilterDefinition[],
): DataTableFilterMap {
  if (!filterDefinitions.length) return {};

  return filterDefinitions.reduce<DataTableFilterMap>((acc, definition) => {
    const key = definition.key ?? definition.id;

    const paramValues = params.getAll(key);

    let rawValue: string | string[] | null = null;

    if (paramValues.length === 1) {
      rawValue = paramValues[0] ?? null;
    } else if (paramValues.length > 1) {
      rawValue = paramValues;
    }

    const expectsArray =
      definition.expectsArray ??
      (definition.variant === "multiSelect" ||
        definition.variant === "select" ||
        definition.variant === "range" ||
        definition.variant === "dateRange");

    let normalized: string | string[] | null = rawValue;

    if (typeof rawValue === "string" && expectsArray) {
      normalized = rawValue
        .split(definition.separator ?? DATA_TABLE_ARRAY_SEPARATOR)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    }

    if (!expectsArray && Array.isArray(normalized)) {
      normalized = normalized[0] ?? null;
    }

    const parsed = definition.parse
      ? definition.parse(normalized)
      : (normalized as DataTableFilterValue);

    if (
      parsed !== null &&
      parsed !== undefined &&
      !isEmptyFilterValue(parsed)
    ) {
      acc[definition.id] = parsed;
    } else {
      acc[definition.id] = null;
    }

    return acc;
  }, {});
}

function parseInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function clampToMinimum(value: number | null, minimum: number): number {
  if (value === null || value < minimum) {
    return minimum;
  }
  return value;
}

function isEmptyFilterValue(value: DataTableFilterValue): boolean {
  if (value === null) return true;
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return value === "";
}
