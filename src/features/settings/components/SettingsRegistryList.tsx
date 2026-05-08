import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CopyButton } from "@/components/CopyButton";
import { DataTable, monospace, mutedCell } from "@/components/DataTable";
import type { RegisteredSetting } from "@/features/settings/types";
import * as s from "./SettingsRegistryList.css";

interface SettingsRegistryListProps {
  definitions: RegisteredSetting[];
}

type RegistryLocale = "zh-CN" | "en" | "ja-JP";

const localeLabel: Record<RegistryLocale, string> = {
  "zh-CN": "\u7b80\u4f53\u4e2d\u6587",
  en: "English",
  "ja-JP": "\u65e5\u672c\u8a9e",
};

const normalizeLocale = (value?: string): RegistryLocale => {
  if (!value) return "en";
  if (value.startsWith("zh")) return "zh-CN";
  if (value.startsWith("ja")) return "ja-JP";
  return "en";
};

const toScope = (scope?: RegisteredSetting["scope"]): string => {
  switch (scope) {
    case "backend":
      return "rs";
    case "shared":
      return "ts-rs";
    default:
      return "ts";
  }
};

const columnHelper = createColumnHelper<RegisteredSetting>();

export function SettingsRegistryList({
  definitions,
}: SettingsRegistryListProps) {
  const { t, i18n } = useTranslation();
  const currentLocale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language);
  const showCurrentLanguageColumn = currentLocale !== "en";

  const rows = useMemo(() => {
    return [...definitions].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }, [definitions]);

  // biome-ignore lint/suspicious/noExplicitAny: TanStack Table's second generic varies per column
  const columns = useMemo<ColumnDef<RegisteredSetting, any>[]>(() => {
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Table's second generic varies per column
    const cols: ColumnDef<RegisteredSetting, any>[] = [
      columnHelper.accessor("id", {
        header: () =>
          t("settings.registry.columns.key", { defaultValue: "Key" }),
        meta: { className: monospace },
        cell: ({ getValue }) => {
          const id = getValue();
          return (
            <span className={s.keyCell}>
              <span className={s.keyText}>{id}</span>
              <CopyButton text={id} className={s.copyButton} />
            </span>
          );
        },
      }),
    ];

    if (showCurrentLanguageColumn) {
      cols.push(
        columnHelper.accessor("labelKey", {
          id: "currentLang",
          header: () => localeLabel[currentLocale],
          meta: { className: mutedCell },
          cell: ({ row }) =>
            t(row.original.labelKey, {
              lng: currentLocale,
              defaultValue: row.original.labelKey,
            }),
        }),
      );
    }

    cols.push(
      columnHelper.accessor("labelKey", {
        id: "en",
        header: () =>
          t("settings.registry.columns.en", {
            defaultValue: "English",
          }),
        meta: { className: mutedCell },
        cell: ({ row }) =>
          t(row.original.labelKey, {
            lng: "en",
            defaultValue: row.original.labelKey,
          }),
      }),
      columnHelper.display({
        id: "scope",
        header: () =>
          t("settings.registry.columns.scope", {
            defaultValue: "Scope",
          }),
        size: 100,
        meta: {},
        cell: ({ row }) => (
          <span className={s.scope}>{toScope(row.original.scope)}</span>
        ),
      }),
    );

    return cols;
  }, [t, currentLocale, showCurrentLanguageColumn]);

  return (
    <div className={s.registryPage}>
      <DataTable data={rows} columns={columns} />
    </div>
  );
}
