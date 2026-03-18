import { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, NavLink, useParams } from "react-router";
import {
  SettingsFieldRow,
  SettingsInput,
  SettingsSectionCard,
  SettingsSelect,
  SettingsSwitch,
} from "@/components/settings-ui";
import type { RegisteredSetting, SettingId } from "@/features/settings/types";
import { settingsApi } from "../store";
import * as s from "./SettingsHub.css";

interface ParsedSettingId {
  pageId: string;
  sectionId: string;
}

interface SectionEntry {
  id: string;
  order: number;
  fields: RegisteredSetting[];
}

interface PageEntry {
  id: string;
  order: number;
  sections: SectionEntry[];
}

type RegisteredSelectSetting = Extract<
  RegisteredSetting,
  { control: { kind: "select" } }
>;

const isSelectSetting = (
  field: RegisteredSetting,
): field is RegisteredSelectSetting => {
  return field.control.kind === "select";
};

function parseSettingId(id: SettingId): ParsedSettingId {
  const [pageId, sectionId] = id.split(".");
  return {
    pageId,
    sectionId,
  };
}

function useSettingValue(id: SettingId): unknown {
  return useSyncExternalStore(
    (onStoreChange) => settingsApi.subscribe(id, onStoreChange),
    () => settingsApi.get(id),
    () => settingsApi.get(id),
  );
}

function SettingsField({ field }: { field: RegisteredSetting }) {
  const { t } = useTranslation();
  const value = useSettingValue(field.id);
  const label = t(field.labelKey);
  const ariaLabel = `Setting ${field.id}`;

  if (!field.visible) {
    return null;
  }

  if (isSelectSetting(field)) {
    const options = field.options.map((option) => {
      return {
        value: option.value,
        label: t(option.labelKey),
      };
    });

    return (
      <SettingsFieldRow label={label}>
        <SettingsSelect
          ariaLabel={ariaLabel}
          value={String(value ?? "")}
          options={options}
          onValueChange={(next) => {
            settingsApi.set(field.id, next);
          }}
        />
      </SettingsFieldRow>
    );
  }

  if (field.control.kind === "toggle") {
    return (
      <SettingsFieldRow label={label}>
        <SettingsSwitch
          ariaLabel={ariaLabel}
          checked={Boolean(value)}
          onCheckedChange={(checked) => {
            settingsApi.set(field.id, checked);
          }}
        />
      </SettingsFieldRow>
    );
  }

  const inputType = field.control.kind === "number" ? "number" : "text";
  const numberControl =
    field.control.kind === "number" ? field.control : undefined;
  const placeholder = field.control.placeholderKey
    ? t(field.control.placeholderKey)
    : undefined;

  return (
    <SettingsFieldRow label={label}>
      <SettingsInput
        ariaLabel={ariaLabel}
        type={inputType}
        value={String(value ?? "")}
        min={numberControl?.min}
        max={numberControl?.max}
        step={numberControl?.step}
        placeholder={placeholder}
        onValueChange={(next) => {
          if (field.control.kind === "number") {
            if (next.trim() === "") {
              return;
            }
            const parsed = Number(next);
            if (!Number.isNaN(parsed)) {
              settingsApi.set(field.id, parsed);
            }
            return;
          }
          settingsApi.set(field.id, next);
        }}
      />
    </SettingsFieldRow>
  );
}

export function SettingsHub() {
  const { t } = useTranslation();
  const { pageId } = useParams();

  const pages = useMemo<PageEntry[]>(() => {
    const pageMap = new Map<
      string,
      { id: string; order: number; sections: Map<string, SectionEntry> }
    >();

    for (const definition of settingsApi.listDefinitions()) {
      const parsed = parseSettingId(definition.id);
      const fieldOrder = definition.order * 1_000 + definition.declarationOrder;

      const page =
        pageMap.get(parsed.pageId) ??
        (() => {
          const created = {
            id: parsed.pageId,
            order: fieldOrder,
            sections: new Map<string, SectionEntry>(),
          };
          pageMap.set(parsed.pageId, created);
          return created;
        })();

      if (fieldOrder < page.order) {
        page.order = fieldOrder;
      }

      const section =
        page.sections.get(parsed.sectionId) ??
        (() => {
          const created: SectionEntry = {
            id: parsed.sectionId,
            order: fieldOrder,
            fields: [],
          };
          page.sections.set(parsed.sectionId, created);
          return created;
        })();

      if (fieldOrder < section.order) {
        section.order = fieldOrder;
      }

      section.fields.push(definition);
    }

    return [...pageMap.values()]
      .sort((a, b) => a.order - b.order)
      .map((page) => ({
        id: page.id,
        order: page.order,
        sections: [...page.sections.values()]
          .sort((a, b) => a.order - b.order)
          .map((section) => ({
            ...section,
            fields: [...section.fields].sort((a, b) => {
              if (a.order !== b.order) {
                return a.order - b.order;
              }
              return a.declarationOrder - b.declarationOrder;
            }),
          })),
      }));
  }, []);

  if (pages.length === 0) {
    return (
      <div className={s.page}>
        <h1 className={s.title}>{t("settings.title")}</h1>
      </div>
    );
  }

  const pageIds = pages.map((entry) => entry.id);
  const activePageId = pageId && pageIds.includes(pageId) ? pageId : undefined;
  if (!activePageId) {
    return <Navigate to={`/settings/${pages[0].id}`} replace />;
  }

  const activePage = pages.find((entry) => entry.id === activePageId);
  if (!activePage) {
    return <Navigate to={`/settings/${pages[0].id}`} replace />;
  }

  return (
    <div className={s.page}>
      <h1 className={s.title}>{t("settings.title")}</h1>
      <div className={s.pageTabs}>
        {pages.map((page) => (
          <NavLink
            key={page.id}
            to={`/settings/${page.id}`}
            className={({ isActive }) =>
              isActive ? s.pageTabActive : s.pageTab
            }
          >
            {t(`settings.pages.${page.id}.title`, { defaultValue: page.id })}
          </NavLink>
        ))}
      </div>
      <div className={s.sections}>
        {activePage.sections.map((section) => (
          <SettingsSectionCard
            key={`${activePage.id}.${section.id}`}
            title={t(`settings.sections.${activePage.id}.${section.id}.title`, {
              defaultValue: section.id,
            })}
          >
            {section.fields.map((field) => (
              <SettingsField key={field.id} field={field} />
            ))}
          </SettingsSectionCard>
        ))}
      </div>
    </div>
  );
}
