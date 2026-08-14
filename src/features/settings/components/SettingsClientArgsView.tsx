/** @jsxImportSource solid-js */
import { type ColumnDef, createColumnHelper } from "@tanstack/solid-table";
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import type { LeagueClientCmdArgs } from "@/bindings/lcu.ts";
import { DataTable } from "@/components/DataTable";
import * as dt from "@/components/DataTable/DataTable.css.ts";
import { useSolidTranslation } from "@/i18n/solid";
import { useSolidLcuStore } from "@/stores/lcu";
import * as s from "./SettingsClientArgsView.css.ts";

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
    .filter(
      ([key, value]) =>
        key !== "family" && value !== null && value !== undefined,
    )
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

export function SettingsClientArgsView(): JSX.Element {
  const { t } = useSolidTranslation();
  const focused = useSolidLcuStore((state) =>
    state.instances.find((instance) => instance.isFocused),
  );

  const rows = createMemo(() => {
    const cmdArgs = focused()?.cmdArgs;
    if (!cmdArgs) {
      return [];
    }
    return toRows(cmdArgs);
  });

  const commandLine = createMemo(() => {
    return toCmdLine(focused()?.cmdArgs, focused()?.installDir);
  });

  // biome-ignore lint/suspicious/noExplicitAny: TanStack Table's second generic varies per column.
  const columns = createMemo<ColumnDef<CmdArgRow, any>[]>(() => [
    col.accessor("key", {
      header: () =>
        t("settings.clientArgs.columns.key", {
          defaultValue: "Key",
        }),
      size: 280,
      meta: { className: dt.monospace },
      cell: (info) => info.getValue(),
    }),
    col.accessor("value", {
      header: () =>
        t("settings.clientArgs.columns.value", {
          defaultValue: "Value",
        }),
      meta: { className: dt.monospace },
      cell: (info) => info.getValue(),
    }),
  ]);

  return (
    <div class={s.page}>
      <div class={s.card}>
        <span class={s.sectionTitle}>
          {t("settings.clientArgs.commandTitle", {
            defaultValue: "Command Line",
          })}
        </span>
        <textarea
          aria-label="Client command line"
          name="Client command line"
          readOnly
          value={commandLine()}
          class={s.commandBox}
        />
      </div>

      <DataTable
        data={rows()}
        columns={columns()}
        emptyText={t("settings.clientArgs.empty", {
          defaultValue: "No focused client.",
        })}
      />
    </div>
  );
}
