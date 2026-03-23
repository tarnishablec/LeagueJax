import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Row,
  useReactTable,
} from "@tanstack/react-table";
import * as s from "./DataTable.css";

interface DataTableProps<T> {
  data: T[];
  // biome-ignore lint/suspicious/noExplicitAny: TanStack Table's second generic varies per column; `any` is the idiomatic type here
  columns: ColumnDef<T, any>[];
  emptyText?: string;
  getRowClassName?: (row: Row<T>) => string | undefined;
}

export function DataTable<T>({
  data,
  columns,
  emptyText,
  getRowClassName,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <colgroup>
          {table.getAllColumns().map((col) => {
            const hasExplicitSize =
              col.columnDef.size != null &&
              col.columnDef.size !== 150 &&
              col.columnDef.size !== 0;
            return (
              <col
                key={col.id}
                style={
                  hasExplicitSize ? { width: col.columnDef.size } : undefined
                }
              />
            );
          })}
        </colgroup>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as
                  | { className?: string }
                  | undefined;
                const cls = meta?.className
                  ? `${s.headCell} ${meta.className}`
                  : s.headCell;
                return (
                  <th key={header.id} className={cls}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={s.empty}>
                {emptyText}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} data-row="" className={getRowClassName?.(row)}>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { className?: string }
                    | undefined;
                  const cls = meta?.className
                    ? `${s.bodyCell} ${meta.className}`
                    : s.bodyCell;
                  return (
                    <td key={cell.id} className={cls}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
