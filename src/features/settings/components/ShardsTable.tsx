import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ShardInfoDto } from "@/bindings/shards";
import { DataTable } from "@/components/DataTable";
import * as dt from "@/components/DataTable/DataTable.css";
import * as s from "./ShardsTable.css";

interface ShardsTableProps {
  shards: ShardInfoDto[];
  labelMap: Map<string, string>;
}

const col = createColumnHelper<ShardInfoDto>();

export function ShardsTable({ shards, labelMap }: ShardsTableProps) {
  const { t } = useTranslation();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const copyId = (id: string) => {
    void navigator.clipboard.writeText(id);
  };

  // biome-ignore lint/suspicious/noExplicitAny: TanStack Table's second generic varies per column
  const columns: ColumnDef<ShardInfoDto, any>[] = [
    col.accessor("label", {
      header: () => t("settings.shards.columns.name"),
      enableResizing: true,
      cell: (info) => info.getValue(),
    }),
    col.accessor("id", {
      header: () => t("settings.shards.columns.id"),
      size: 120,
      cell: (info) => {
        const id = info.getValue() as string;
        return (
          <button
            type="button"
            className={`${dt.monospace} ${s.idCell}`}
            onClick={() => copyId(id)}
            title={id}
            aria-label="Copy shard ID"
          >
            {id.slice(0, 8)}...
          </button>
        );
      },
    }),
    col.accessor("status", {
      header: () => t("settings.shards.columns.status"),
      size: 100,
      cell: (info) => {
        const status = info.getValue() as ShardInfoDto["status"];
        return (
          <span className={s.status({ kind: status.kind })}>
            {t(`settings.shards.status.${status.kind}`)}
          </span>
        );
      },
    }),
    col.accessor("dependencies", {
      enableResizing: true,
      header: () => t("settings.shards.columns.dependencies"),
      cell: (info) => {
        const deps = info.getValue() as string[];
        if (deps.length === 0) {
          return (
            <span className={dt.mutedCell}>
              {t("settings.shards.noDependencies")}
            </span>
          );
        }
        return (
          <div className={s.depList}>
            {deps.map((depId) => (
              <button
                type="button"
                key={depId}
                className={s.depItem}
                onMouseEnter={() => setHighlightedId(depId)}
                onMouseLeave={() => setHighlightedId(null)}
              >
                {labelMap.get(depId) ?? depId.slice(0, 8)}
              </button>
            ))}
          </div>
        );
      },
    }),
    col.accessor("setupDurationMs", {
      header: () => t("settings.shards.columns.duration"),
      size: 110,
      cell: (info) => {
        const ms = info.getValue() as number | null;
        return ms != null ? (
          `${ms.toFixed(1)} ms`
        ) : (
          <span className={dt.mutedCell}>
            {t("settings.shards.noDuration")}
          </span>
        );
      },
    }),
  ];

  return (
    <DataTable
      data={shards}
      columns={columns}
      getRowClassName={(row) =>
        row.original.id === highlightedId ? s.rowHighlight : undefined
      }
    />
  );
}
