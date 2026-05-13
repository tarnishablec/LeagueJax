import { openUrl } from "@tauri-apps/plugin-opener";
import { Trans, useTranslation } from "react-i18next";
import { BrandGradientText } from "@/components/BrandGradientText";
import { JaxLogo } from "@/components/JaxLogo";
import { SettingsSectionCard } from "@/components/settings-ui";
import cargoWorkspaceManifest from "../../../../Cargo.toml?raw";
import packageMetadata from "../../../../package.json";
import { createOpenSourceSoftware } from "../about-open-source";
import * as s from "./AboutPage.css";

const OPEN_SOURCE_SOFTWARE = createOpenSourceSoftware(
  packageMetadata,
  cargoWorkspaceManifest,
);

const LEAGUE_AKARI_REPOSITORY_URL = "https://github.com/Hanxven/LeagueAkari";
const LEAGUE_AKARI_BADGE_URL =
  "https://img.shields.io/badge/GitHub-League_Akari-111827?style=flat-square&logo=github&logoColor=white";

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className={s.page}>
      <section className={s.overviewCard}>
        <div className={s.overview}>
          <div className={s.logoPanel}>
            <JaxLogo size={135} variant="dark" />
          </div>

          <div className={s.markdownShell}>
            {/*<h1>*/}
            {/*  <BrandGradientText variant="hero">*/}
            {/*    {t("settings.about.overview.title", {*/}
            {/*      defaultValue: "League Jax",*/}
            {/*    })}*/}
            {/*  </BrandGradientText>*/}
            {/*</h1>*/}
            <p>
              <Trans
                i18nKey="settings.about.overview.description"
                values={{
                  version: packageMetadata.version,
                }}
                defaults="<brand>League Jax</brand><version>v{{version}}</version> is a desktop companion for League of Legends players, designed to make the overall experience clearer and smoother."
                components={{
                  brand: <BrandGradientText />,
                  version: <span className={s.versionPill} />,
                }}
              />
            </p>
            <p className={s.referenceRow}>
              <span className={s.referenceLabel}>
                {t("settings.about.overview.referencePrefix", {
                  defaultValue: "This project references",
                })}
              </span>
              <button
                type="button"
                className={s.markdownLink}
                aria-label="Open League Akari GitHub repository"
                onClick={() => void openUrl(LEAGUE_AKARI_REPOSITORY_URL)}
              >
                <img
                  className={s.markdownImage}
                  src={LEAGUE_AKARI_BADGE_URL}
                  alt="GitHub - League Akari"
                />
              </button>
              <span className={s.referenceLabel}>
                {t("settings.about.overview.referenceSuffix", {
                  defaultValue: "'s user experience",
                })}
              </span>
            </p>
          </div>
        </div>
      </section>

      <div className={s.contentGrid}>
        <SettingsSectionCard
          title={t("settings.about.openSource.title", {
            defaultValue: "Open Source Dependencies",
          })}
        >
          <p className={s.sectionText}>
            <Trans
              i18nKey="settings.about.openSource.summary"
              defaults="<brand>League Jax</brand> is built on a focused set of open source dependencies spanning the desktop shell, UI runtime, routing, styling, state flow, and internal foundations."
              components={{
                brand: <BrandGradientText />,
              }}
            />
          </p>
          <div className={s.softwareList}>
            {OPEN_SOURCE_SOFTWARE.map((item) => (
              <button
                key={item.name}
                type="button"
                className={s.softwareItem}
                aria-label={
                  item.linkKind === "github"
                    ? `Open ${item.name} GitHub repository`
                    : `Open ${item.name} website`
                }
                onClick={() => void openUrl(item.url)}
              >
                <div className={s.softwareBody}>
                  <span className={s.softwareName}>{item.name}</span>
                  <div className={s.softwareRole}>
                    {t(`settings.about.openSource.roles.${item.roleKey}`, {
                      defaultValue: item.roleKey,
                    })}
                  </div>
                </div>

                <div className={s.softwareMeta}>
                  {item.version ? (
                    <span className={s.softwarePill}>v{item.version}</span>
                  ) : null}
                  <span className={s.softwarePill}>{item.license}</span>
                </div>
              </button>
            ))}
          </div>
        </SettingsSectionCard>
      </div>
    </div>
  );
}
