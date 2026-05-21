/** @jsxImportSource solid-js */
import { type ColumnDef, createColumnHelper } from "@tanstack/solid-table";
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import { CopyButton } from "@/components/CopyButton";
import { DataTable, monospace, mutedCell } from "@/components/DataTable";
import type { RegisteredSetting } from "@/features/settings/types";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./SettingsRegistryList.css.ts";

interface SettingsRegistryListProps {
  definitions: RegisteredSetting[];
}

type RegistryLocale = "zh-CN" | "en" | "ja-JP";

const localeLabel: Record<RegistryLocale, string> = {
  "zh-CN": "简体中文",
  en: "English",
  "ja-JP": "日本語",
};

const normalizeLocale = (value?: string): RegistryLocale => {
  if (!value) {
    return "en";
  }
  if (value.startsWith("zh")) {
    return "zh-CN";
  }
  if (value.startsWith("ja")) {
    return "ja-JP";
  }
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

export function SettingsRegistryList(
  props: SettingsRegistryListProps,
): JSX.Element {
  const { language, t } = useSolidTranslation();
  const currentLocale = createMemo(() => normalizeLocale(language()));
  const showCurrentLanguageColumn = createMemo(() => currentLocale() !== "en");

  const rows = createMemo(() => {
    return [...props.definitions].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  });

  // biome-ignore lint/suspicious/noExplicitAny: TanStack Table's second generic varies per column.
  const columns = createMemo<ColumnDef<RegisteredSetting, any>[]>(() => {
    // biome-ignore lint/suspicious/noExplicitAny: TanStack Table's second generic varies per column.
    const cols: ColumnDef<RegisteredSetting, any>[] = [
      columnHelper.accessor("id", {
        header: () =>
          t("settings.registry.columns.key", { defaultValue: "Key" }),
        meta: { className: monospace },
        cell: ({ getValue }) => {
          const id = getValue();
          return (
            <span class={s.keyCell}>
              <span class={s.keyText}>{id}</span>
              <CopyButton text={id} className={s.copyButton} />
            </span>
          );
        },
      }),
    ];

    if (showCurrentLanguageColumn()) {
      cols.push(
        columnHelper.accessor("labelKey", {
          id: "currentLang",
          header: () => localeLabel[currentLocale()],
          meta: { className: mutedCell },
          cell: ({ row }) =>
            t(row.original.labelKey, {
              lng: currentLocale(),
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
          <span class={s.scope}>{toScope(row.original.scope)}</span>
        ),
      }),
    );

    return cols;
  });

  return (
    <div class={s.registryPage}>
      <DataTable data={rows()} columns={columns()} />
    </div>
  );
}
