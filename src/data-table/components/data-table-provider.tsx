"use client";

import * as React from "react";

import type { DataTableFeatures } from "@/types/data-table";

export interface DataTableProviderValue<
  TCounts = Record<string, unknown>,
  TMeta = Record<string, unknown>,
> {
  entity: string;
  counts: TCounts;
  features?: DataTableFeatures;
  meta?: TMeta;
}

const DataTableContext = React.createContext<DataTableProviderValue<
  any,
  any
> | null>(null);

export function DataTableProvider<TCounts, TMeta>({
  value,
  children,
}: React.PropsWithChildren<{
  value: DataTableProviderValue<TCounts, TMeta>;
}>) {
  const contextValue = React.useMemo(() => value, [value]);

  return (
    <DataTableContext.Provider
      value={contextValue as DataTableProviderValue<any, any>}
    >
      {children}
    </DataTableContext.Provider>
  );
}

export function useDataTableContext<
  TCounts = Record<string, unknown>,
  TMeta = Record<string, unknown>,
>() {
  const context = React.useContext(DataTableContext) as DataTableProviderValue<
    TCounts,
    TMeta
  > | null;

  if (!context) {
    throw new Error(
      "useDataTableContext must be used within a DataTableProvider instance.",
    );
  }

  return context;
}
