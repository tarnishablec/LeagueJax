import { openUrl } from "@tauri-apps/plugin-opener";
import { Trans, useTranslation } from "react-i18next";
import { parse } from "smol-toml";
import { BrandGradientText } from "@/components/BrandGradientText";
import { JaxLogo } from "@/components/JaxLogo";
import { SettingsSectionCard } from "@/components/settings-ui";
import cargoWorkspaceManifest from "../../../../Cargo.toml?raw";
import packageMetadata from "../../../../package.json";
import * as s from "./AboutPage.css";

type CargoDependencyEntry = string | { version?: string };

type CargoWorkspaceFile = {
  workspace?: {
    dependencies?: Record<string, CargoDependencyEntry>;
  };
};

type OpenSourceItem = {
  license: string;
  linkKind: "github" | "website";
  name: string;
  roleKey:
    | "arkUi"
    | "jax"
    | "lucide"
    | "maokai"
    | "react"
    | "reactRouter"
    | "sled"
    | "snafu"
    | "swr"
    | "tauri"
    | "thaterror"
    | "typescript"
    | "vanillaExtract"
    | "vite"
    | "zod"
    | "zustand";
  url: string;
  version: string | null;
};

const normalizeVersion = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  return value.replace(/^[~^]/, "");
};

const cargoWorkspaceDependencies =
  (parse(cargoWorkspaceManifest) as CargoWorkspaceFile).workspace
    ?.dependencies ?? {};

const resolveCargoDependencyVersion = (
  dependencyName: string,
): string | null => {
  const value = cargoWorkspaceDependencies[dependencyName];

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value.version === "string") {
    return value.version;
  }

  return null;
};

const dependencyVersions = packageMetadata.dependencies;
const devDependencyVersions = packageMetadata.devDependencies;

const OPEN_SOURCE_SOFTWARE: OpenSourceItem[] = [
  {
    name: "jax",
    version: null,
    license: "MPL-2.0",
    linkKind: "github",
    roleKey: "jax",
    url: "https://github.com/tarnishablec/jax",
  },
  {
    name: "maokai",
    version: null,
    license: "MPL-2.0",
    linkKind: "github",
    roleKey: "maokai",
    url: "https://github.com/tarnishablec/maokai",
  },
  {
    name: "thaterror",
    version: normalizeVersion(dependencyVersions["@thaterror/core"]),
    license: "MPL-2.0",
    linkKind: "github",
    roleKey: "thaterror",
    url: "https://github.com/tarnishablec/thaterror",
  },
  {
    name: "Tauri",
    version: normalizeVersion(dependencyVersions["@tauri-apps/api"]),
    license: "Apache-2.0 OR MIT",
    linkKind: "website",
    roleKey: "tauri",
    url: "https://tauri.app",
  },
  {
    name: "React",
    version: normalizeVersion(dependencyVersions.react),
    license: "MIT",
    linkKind: "website",
    roleKey: "react",
    url: "https://react.dev/",
  },
  {
    name: "React Router",
    version: normalizeVersion(dependencyVersions["react-router"]),
    license: "MIT",
    linkKind: "github",
    roleKey: "reactRouter",
    url: "https://github.com/remix-run/react-router",
  },
  {
    name: "TypeScript",
    version: normalizeVersion(devDependencyVersions.typescript),
    license: "Apache-2.0",
    linkKind: "website",
    roleKey: "typescript",
    url: "https://www.typescriptlang.org/",
  },
  {
    name: "Vite",
    version: normalizeVersion(devDependencyVersions.vite),
    license: "MIT",
    linkKind: "website",
    roleKey: "vite",
    url: "https://vite.dev",
  },
  {
    name: "Ark UI",
    version: normalizeVersion(dependencyVersions["@ark-ui/react"]),
    license: "MIT",
    linkKind: "website",
    roleKey: "arkUi",
    url: "https://ark-ui.com",
  },
  {
    name: "Vanilla Extract",
    version: normalizeVersion(dependencyVersions["@vanilla-extract/css"]),
    license: "MIT",
    linkKind: "github",
    roleKey: "vanillaExtract",
    url: "https://github.com/vanilla-extract-css/vanilla-extract",
  },
  {
    name: "Lucide React",
    version: normalizeVersion(dependencyVersions["lucide-react"]),
    license: "ISC",
    linkKind: "website",
    roleKey: "lucide",
    url: "https://lucide.dev",
  },
  {
    name: "SWR",
    version: normalizeVersion(dependencyVersions.swr),
    license: "MIT",
    linkKind: "website",
    roleKey: "swr",
    url: "https://swr.vercel.app",
  },
  {
    name: "zustand",
    version: normalizeVersion(dependencyVersions.zustand),
    license: "MIT",
    linkKind: "github",
    roleKey: "zustand",
    url: "https://github.com/pmndrs/zustand",
  },
  {
    name: "sled",
    version: resolveCargoDependencyVersion("sled"),
    license: "MIT OR Apache-2.0",
    linkKind: "github",
    roleKey: "sled",
    url: "https://github.com/spacejam/sled",
  },
  {
    name: "snafu",
    version: resolveCargoDependencyVersion("snafu"),
    license: "MIT OR Apache-2.0",
    linkKind: "github",
    roleKey: "snafu",
    url: "https://github.com/shepmaster/snafu",
  },
  {
    name: "Zod",
    version: normalizeVersion(dependencyVersions.zod),
    license: "MIT",
    linkKind: "website",
    roleKey: "zod",
    url: "https://zod.dev",
  },
];

const LEAGUE_AKARI_REPOSITORY_URL = "https://leagueakari.github.io/";
const LEAGUE_AKARI_BADGE_URL =
  "https://img.shields.io/badge/GitHub-League_Akari-111827?style=flat-square&logo=github&logoColor=white";

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className={s.page}>
      <section className={s.overviewCard}>
        <div className={s.overview}>
          <div className={s.logoPanel}>
            <JaxLogo size={135} />
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
                {t("settings.about.overview.referenceLabel", {
                  defaultValue: "This project draws heavily from",
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
