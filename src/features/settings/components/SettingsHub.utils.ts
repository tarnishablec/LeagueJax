import type { RegisteredSetting } from "@/features/settings/types";
import {
  type PageEntry,
  parseSettingId,
  type SectionEntry,
} from "./settings-view-model";

const UNORDERED_PAGE_ORDER_OFFSET = 1_000_000;

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
  pageOrder: readonly string[],
): PageEntry[] => {
  const configuredPageOrder = new Map(
    pageOrder.map((pageId, index) => [pageId, index]),
  );
  const pageMap = new Map<
    string,
    {
      id: string;
      order: number;
      declarationOrder: number;
      hasConfiguredOrder: boolean;
      sections: Map<string, SectionEntry>;
    }
  >();

  for (const definition of definitions) {
    const parsed = parseSettingId(definition.id);
    const fieldOrder = definition.order * 1_000 + definition.declarationOrder;
    const configuredOrder = configuredPageOrder.get(parsed.pageId);
    const fallbackPageOrder = UNORDERED_PAGE_ORDER_OFFSET + fieldOrder;
    const fallbackDeclarationOrder =
      UNORDERED_PAGE_ORDER_OFFSET + definition.declarationOrder;

    const page =
      pageMap.get(parsed.pageId) ??
      (() => {
        const created = {
          id: parsed.pageId,
          order: configuredOrder ?? fallbackPageOrder,
          declarationOrder: configuredOrder ?? fallbackDeclarationOrder,
          hasConfiguredOrder: configuredOrder !== undefined,
          sections: new Map<string, SectionEntry>(),
        };
        pageMap.set(parsed.pageId, created);
        return created;
      })();

    if (!page.hasConfiguredOrder && fallbackPageOrder < page.order) {
      page.order = fallbackPageOrder;
      page.declarationOrder = definition.declarationOrder;
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
    .sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.declarationOrder - b.declarationOrder;
    })
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
