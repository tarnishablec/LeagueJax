/** @jsxImportSource solid-js */
import { openUrl } from "@tauri-apps/plugin-opener";
import type { JSX } from "solid-js";
import { For } from "solid-js";
import { BrandGradientText } from "@/components/BrandGradientText";
import { JaxLogo } from "@/components/JaxLogo";
import { SettingsSectionCard } from "@/components/settings-ui";
import { useSolidTranslation } from "@/i18n/solid";
import cargoWorkspaceManifest from "../../../../Cargo.toml?raw";
import { createOpenSourceSoftware } from "../about-open-source";
import { packageMetadata } from "../about-package-metadata";
import * as s from "./AboutPage.css.ts";

const OPEN_SOURCE_SOFTWARE = createOpenSourceSoftware(
  packageMetadata,
  cargoWorkspaceManifest,
);

const LEAGUE_AKARI_REPOSITORY_URL = "https://github.com/Hanxven/LeagueAkari";
const LEAGUE_AKARI_BADGE_URL =
  "https://img.shields.io/badge/GitHub-League_Akari-111827?style=flat-square&logo=github&logoColor=white";

type RichTextComponent = (children: JSX.Element) => JSX.Element;

// The Solid i18n adapter returns strings only; this keeps legacy Trans-style
// component placeholders localized without carrying a framework-specific bridge.
function renderRichTranslation(
  value: string,
  components: Record<string, RichTextComponent>,
): JSX.Element[] {
  const document = new DOMParser().parseFromString(
    `<root>${value}</root>`,
    "text/html",
  );
  const root = document.body.firstElementChild;
  if (!root) {
    return [value];
  }

  const renderNode = (node: ChildNode): JSX.Element => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as Element;
    const children = Array.from(element.childNodes).map(renderNode);
    const component = components[element.tagName.toLowerCase()];

    return component ? component(children) : children;
  };

  return Array.from(root.childNodes).map(renderNode);
}

export function AboutPage(): JSX.Element {
  const { t } = useSolidTranslation();

  return (
    <div class={s.page}>
      <section class={s.overviewCard}>
        <div class={s.overview}>
          <div class={s.logoPanel}>
            <JaxLogo size={135} variant="dark" />
          </div>

          <div class={s.markdownShell}>
            <p>
              {renderRichTranslation(
                t("settings.about.overview.description", {
                  version: packageMetadata.version,
                  defaultValue:
                    "<brand>League Jax</brand><version>v{{version}}</version> is a desktop companion for League of Legends players, designed to make the overall experience clearer and smoother.",
                }),
                {
                  brand: (children) => (
                    <BrandGradientText>{children}</BrandGradientText>
                  ),
                  version: (children) => (
                    <span class={s.versionPill}>{children}</span>
                  ),
                },
              )}
            </p>
            <p class={s.referenceRow}>
              <span class={s.referenceLabel}>
                {t("settings.about.overview.referencePrefix", {
                  defaultValue: "This project references",
                })}
              </span>
              <button
                type="button"
                class={s.markdownLink}
                aria-label="Open League Akari GitHub repository"
                onClick={() => void openUrl(LEAGUE_AKARI_REPOSITORY_URL)}
              >
                <img
                  class={s.markdownImage}
                  src={LEAGUE_AKARI_BADGE_URL}
                  alt="GitHub - League Akari"
                />
              </button>
              <span class={s.referenceLabel}>
                {t("settings.about.overview.referenceSuffix", {
                  defaultValue: "'s user experience",
                })}
              </span>
            </p>
          </div>
        </div>
      </section>

      <div class={s.contentGrid}>
        <SettingsSectionCard
          title={t("settings.about.openSource.title", {
            defaultValue: "Open Source Dependencies",
          })}
        >
          <p class={s.sectionText}>
            {renderRichTranslation(
              t("settings.about.openSource.summary", {
                defaultValue:
                  "<brand>League Jax</brand> is built on a focused set of open source dependencies spanning the desktop shell, UI runtime, routing, styling, state flow, and internal foundations.",
              }),
              {
                brand: (children) => (
                  <BrandGradientText>{children}</BrandGradientText>
                ),
              },
            )}
          </p>
          <div class={s.softwareList}>
            <For each={OPEN_SOURCE_SOFTWARE}>
              {(item) => (
                <button
                  type="button"
                  class={s.softwareItem}
                  aria-label={
                    item.linkKind === "github"
                      ? `Open ${item.name} GitHub repository`
                      : `Open ${item.name} website`
                  }
                  onClick={() => void openUrl(item.url)}
                >
                  <div class={s.softwareBody}>
                    <span class={s.softwareName}>{item.name}</span>
                    <div class={s.softwareRole}>
                      {t(`settings.about.openSource.roles.${item.roleKey}`, {
                        defaultValue: item.roleKey,
                      })}
                    </div>
                  </div>

                  <div class={s.softwareMeta}>
                    {item.version ? (
                      <span class={s.softwarePill}>v{item.version}</span>
                    ) : null}
                    <span class={s.softwarePill}>{item.license}</span>
                  </div>
                </button>
              )}
            </For>
          </div>
        </SettingsSectionCard>
      </div>
    </div>
  );
}

export default AboutPage;
