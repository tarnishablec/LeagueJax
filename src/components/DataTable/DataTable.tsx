import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Row,
  useReactTable,
} from "@tanstack/react-table";
import * as s from "./DataTable.css";

interface DataTableProps<T> {
  className?: string;
  data: T[];
  columns: ColumnDef<T>[];
  emptyText?: string;
  getRowClassName?: (row: Row<T>) => string | undefined;
  stickyHeader?: boolean;
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function DataTable<T>({
  className,
  data,
  columns,
  emptyText,
  getRowClassName,
  stickyHeader = false,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className={joinClassNames(
        s.tableWrap({
          stickyHeader: stickyHeader ? "enabled" : "disabled",
        }),
        className,
      )}
    >
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
                const cls = joinClassNames(
                  s.headCell({
                    stickyHeader: stickyHeader ? "enabled" : "disabled",
                  }),
                  meta?.className,
                );
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
