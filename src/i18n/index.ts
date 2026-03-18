import i18n, { type Resource, type ResourceLanguage } from "i18next";
import { initReactI18next } from "react-i18next";
import type { I18nLocaleBundle } from "@/features/runtime/web-contract";

let initialized = false;

function toI18nResources(resources: I18nLocaleBundle): Resource {
  return Object.fromEntries(
    Object.entries(resources).map(([locale, translation]) => [
      locale,
      { translation: translation as ResourceLanguage },
    ]),
  );
}

export async function initializeI18n(
  resources: I18nLocaleBundle,
  language = "zh-CN",
): Promise<void> {
  if (initialized) {
    if (i18n.language !== language) {
      await i18n.changeLanguage(language);
    }
    return;
  }

  await i18n.use(initReactI18next).init({
    resources: toI18nResources(resources),
    lng: language,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

  initialized = true;
}

export default i18n;
