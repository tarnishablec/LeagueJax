import type { RegisteredSetting } from "@/features/settings/types";
import {
  type PageEntry,
  parseSettingId,
  type SectionEntry,
} from "./settings-view-model";

const sortFields = (fields: RegisteredSetting[]): RegisteredSetting[] => {
  return [...fields].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.declarationOrder - b.declarationOrder;
  });
};

export const buildSettingsPages = (
  definitions: RegisteredSetting[],
): PageEntry[] => {
  const pageMap = new Map<
    string,
    { id: string; order: number; sections: Map<string, SectionEntry> }
  >();

  for (const definition of definitions) {
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
          fields: sortFields(section.fields),
        })),
    }));
};

export const resolveActivePage = (
  pages: PageEntry[],
  pageId?: string,
): PageEntry | null => {
  if (pages.length === 0) {
    return null;
  }

  if (!pageId) {
    return null;
  }

  return pages.find((entry) => entry.id === pageId) ?? null;
};
