/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import {
  type ColumnDef,
  createSolidTable,
  flexRender,
  getCoreRowModel,
  type Row,
} from "@tanstack/solid-table";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import * as s from "./DataTable.css.ts";

interface DataTableProps<T> {
  className?: string;
  data: T[];
  // biome-ignore lint/suspicious/noExplicitAny: TanStack Table's second generic varies per column.
  columns: ColumnDef<T, any>[];
  emptyText?: string;
  getRowClassName?: (row: Row<T>) => string | undefined;
  stickyHeader?: boolean;
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function DataTable<T>(props: DataTableProps<T>): JSX.Element {
  const table = createSolidTable({
    get data() {
      return props.data;
    },
    get columns() {
      return props.columns;
    },
    getCoreRowModel: getCoreRowModel(),
  });
  const colNodes = keyArray(
    () => table.getAllColumns(),
    (col) => col.id,
    (col) => {
      const hasExplicitSize = () =>
        col().columnDef.size != null &&
        col().columnDef.size !== 150 &&
        col().columnDef.size !== 0;
      return (
        <col
          style={
            hasExplicitSize()
              ? { width: `${col().columnDef.size}px` }
              : undefined
          }
        />
      );
    },
  );
  const headerRows = keyArray(
    () => table.getHeaderGroups(),
    (headerGroup) => headerGroup.id,
    (headerGroup) => {
      const headerCells = keyArray(
        () => headerGroup().headers,
        (header) => header.id,
        (header) => {
          const meta = () =>
            header().column.columnDef.meta as
              | { className?: string }
              | undefined;
          const cls = () =>
            joinClassNames(
              s.headCell({
                stickyHeader: props.stickyHeader ? "enabled" : "disabled",
              }),
              meta()?.className,
            );
          return (
            <th class={cls()}>
              {header().isPlaceholder
                ? null
                : flexRender(
                    header().column.columnDef.header,
                    header().getContext(),
                  )}
            </th>
          );
        },
      );
      return <tr>{headerCells()}</tr>;
    },
  );
  const bodyRows = keyArray(
    () => table.getRowModel().rows,
    (row) => row.id,
    (row) => {
      const visibleCells = keyArray(
        () => row().getVisibleCells(),
        (cell) => cell.id,
        (cell) => {
          const meta = () =>
            cell().column.columnDef.meta as { className?: string } | undefined;
          const cls = () =>
            meta()?.className
              ? `${s.bodyCell} ${meta()?.className}`
              : s.bodyCell;
          return (
            <td class={cls()}>
              {flexRender(cell().column.columnDef.cell, cell().getContext())}
            </td>
          );
        },
      );
      return (
        <tr data-row="" class={props.getRowClassName?.(row())}>
          {visibleCells()}
        </tr>
      );
    },
  );

  return (
    <div
      class={joinClassNames(
        s.tableWrap({
          stickyHeader: props.stickyHeader ? "enabled" : "disabled",
        }),
        props.className,
      )}
    >
      <table class={s.table}>
        <colgroup>{colNodes()}</colgroup>
        <thead>{headerRows()}</thead>
        <tbody>
          <Show
            when={table.getRowModel().rows.length > 0}
            fallback={
              <tr>
                <td colSpan={props.columns.length} class={s.empty}>
                  {props.emptyText}
                </td>
              </tr>
            }
          >
            {bodyRows()}
          </Show>
        </tbody>
      </table>
    </div>
  );
}
