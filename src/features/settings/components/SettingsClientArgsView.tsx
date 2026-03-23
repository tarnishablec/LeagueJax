import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { LeagueClientCmdArgs } from "@/bindings/lcu.ts";
import { DataTable } from "@/components/DataTable";
import * as dt from "@/components/DataTable/DataTable.css";
import { useLcuStore } from "@/stores/lcu";
import * as s from "./SettingsClientArgsView.css";

interface CmdArgRow {
  key: string;
  value: string;
  raw: unknown;
}

const stringifyValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return "";
  }
  return JSON.stringify(value);
};

const toRows = (args: LeagueClientCmdArgs): CmdArgRow[] => {
  const record = args as Record<string, unknown>;
  return Object.entries(record)
    .filter(([key]) => key !== "family")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, raw]) => ({
      key,
      value: stringifyValue(raw),
      raw,
    }));
};

const toCmdLine = (
  args: LeagueClientCmdArgs | undefined,
  installDir: string | null | undefined,
): string => {
  if (!args) {
    return "";
  }
  const rows = toRows(args);
  const executable = installDir
    ? `${installDir}\\LeagueClientUx.exe`
    : "LeagueClientUx.exe";
  const segments = rows.map(({ key, raw, value }) => {
    if (typeof raw === "boolean") {
      return raw ? `--${key}` : `--${key}=false`;
    }
    return `--${key}=${value}`;
  });
  return `"${executable}" ${segments.join(" ")}`.trim();
};

const col = createColumnHelper<CmdArgRow>();

export function SettingsClientArgsView() {
  const { t } = useTranslation();
  const focused = useLcuStore((state) =>
    state.instances.find((instance) => instance.isFocused),
  );

  const rows = useMemo(() => {
    if (!focused?.cmdArgs) {
      return [];
    }
    return toRows(focused.cmdArgs);
  }, [focused?.cmdArgs]);

  const commandLine = useMemo(() => {
    return toCmdLine(focused?.cmdArgs, focused?.installDir);
  }, [focused?.cmdArgs, focused?.installDir]);

  // biome-ignore lint/suspicious/noExplicitAny: TanStack Table's second generic varies per column
  const columns: ColumnDef<CmdArgRow, any>[] = useMemo(
    () => [
      col.accessor("key", {
        header: () =>
          t("settings.clientArgs.columns.key", { defaultValue: "Key" }),
        size: 280,
        meta: { className: dt.monospace },
        cell: (info) => info.getValue(),
      }),
      col.accessor("value", {
        header: () =>
          t("settings.clientArgs.columns.value", { defaultValue: "Value" }),
        meta: { className: dt.monospace },
        cell: (info) => info.getValue(),
      }),
    ],
    [t],
  );

  return (
    <div className={s.page}>
      <div className={s.card}>
        <span className={s.sectionTitle}>
          {t("settings.clientArgs.commandTitle", {
            defaultValue: "Command Line",
          })}
        </span>
        <textarea
          aria-label="Client command line"
          readOnly
          value={commandLine}
          className={s.commandBox}
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        emptyText={t("settings.clientArgs.empty", {
          defaultValue: "No focused client.",
        })}
      />
    </div>
  );
}
