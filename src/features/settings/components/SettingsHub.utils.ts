import type {
  RegisteredSetting,
  RegisteredSettingsPage,
  RegisteredSettingsSection,
  SettingsSectionKey,
} from "@/features/settings/types";
import {
  type PageEntry,
  parseSettingId,
  type SectionEntry,
} from "./settings-view-model";

const UNREGISTERED_ORDER = 1_000_000;

const sortFields = (fields: RegisteredSetting[]): RegisteredSetting[] => {
  return [...fields].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.declarationOrder - b.declarationOrder;
  });
};

const sortByOrder = <T extends { order: number; declarationOrder: number }>(
  entries: T[],
): T[] => {
  return [...entries].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.declarationOrder - b.declarationOrder;
  });
};

export const buildSettingsPages = (
  definitions: RegisteredSetting[],
  registeredPages: readonly RegisteredSettingsPage[],
  registeredSections: readonly RegisteredSettingsSection[],
): PageEntry[] => {
  const pageDefinitions = new Map(
    registeredPages.map((page) => [page.id, page]),
  );
  const sectionDefinitions = new Map(
    registeredSections.map((section) => [section.key, section]),
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

  const getOrCreatePage = (
    pageId: string,
    fallbackDeclarationOrder: number,
  ) => {
    const pageDefinition = pageDefinitions.get(pageId);
    const existing = pageMap.get(pageId);
    if (existing) {
      if (!existing.hasConfiguredOrder && !pageDefinition) {
        existing.declarationOrder = Math.min(
          existing.declarationOrder,
          fallbackDeclarationOrder,
        );
      }
      return existing;
    }

    const created = {
      id: pageId,
      order: pageDefinition?.order ?? UNREGISTERED_ORDER,
      declarationOrder:
        pageDefinition?.declarationOrder ?? fallbackDeclarationOrder,
      hasConfiguredOrder: pageDefinition !== undefined,
      sections: new Map<string, SectionEntry>(),
    };
    pageMap.set(pageId, created);
    return created;
  };

  const getOrCreateSection = (
    page: {
      sections: Map<string, SectionEntry>;
    },
    pageId: string,
    sectionId: string,
    fallbackDeclarationOrder: number,
  ) => {
    const sectionKey = `${pageId}.${sectionId}` as SettingsSectionKey;
    const sectionDefinition = sectionDefinitions.get(sectionKey);
    const existing = page.sections.get(sectionId);
    if (existing) {
      if (!sectionDefinition) {
        existing.declarationOrder = Math.min(
          existing.declarationOrder,
          fallbackDeclarationOrder,
        );
      }
      return existing;
    }

    const created: SectionEntry = {
      id: sectionId,
      order: sectionDefinition?.order ?? UNREGISTERED_ORDER,
      declarationOrder:
        sectionDefinition?.declarationOrder ?? fallbackDeclarationOrder,
      fields: [],
    };
    page.sections.set(sectionId, created);
    return created;
  };

  for (const sectionDefinition of registeredSections) {
    if (!sectionDefinition.hasRenderer) {
      continue;
    }

    const [pageId, sectionId] = sectionDefinition.key.split(".");
    if (!pageId || !sectionId) {
      continue;
    }

    const page = getOrCreatePage(pageId, sectionDefinition.declarationOrder);
    getOrCreateSection(
      page,
      pageId,
      sectionId,
      sectionDefinition.declarationOrder,
    );
  }

  for (const definition of definitions) {
    const parsed = parseSettingId(definition.id);
    const page = getOrCreatePage(parsed.pageId, definition.declarationOrder);
    const section = getOrCreateSection(
      page,
      parsed.pageId,
      parsed.sectionId,
      definition.declarationOrder,
    );

    section.fields.push(definition);
  }

  return sortByOrder([...pageMap.values()]).map((page) => ({
    id: page.id,
    order: page.order,
    declarationOrder: page.declarationOrder,
    sections: sortByOrder([...page.sections.values()]).map((section) => ({
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
