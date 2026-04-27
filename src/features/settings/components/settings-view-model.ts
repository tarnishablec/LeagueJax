import type { RegisteredSetting, SettingId } from "@/features/settings/types";

export interface ParsedSettingId {
  pageId: string;
  sectionId: string;
}

export interface SectionEntry {
  id: string;
  order: number;
  declarationOrder: number;
  fields: RegisteredSetting[];
}

export interface PageEntry {
  id: string;
  order: number;
  declarationOrder: number;
  sections: SectionEntry[];
}

export const parseSettingId = (id: SettingId): ParsedSettingId => {
  const [pageId, sectionId] = id.split(".");
  return {
    pageId,
    sectionId,
  };
};
